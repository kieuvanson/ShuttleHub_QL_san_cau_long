package vn.ShuttleHub.backend.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.dto.AuthResponse;
import vn.ShuttleHub.backend.auth.dto.LoginRequest;
import vn.ShuttleHub.backend.auth.dto.RegisterRequest;
import vn.ShuttleHub.backend.auth.dto.UserDto;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.auth.exception.InvalidCredentialsException;
import vn.ShuttleHub.backend.entity.RefreshToken;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.RefreshTokenRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;
    private final RefreshTokenRepository refreshTokenRepo;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Đăng ký user mới:
     *  1. Verify OTP (SĐT đã xác nhận)
     *  2. Check email, username, phone chưa tồn tại
     *  3. Hash password
     *  4. INSERT user
     *  5. Sinh JWT, trả về
     */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalizeEmail(req.email());
        String username = req.username().trim();

        // 1. Verify OTP trước (đã throw exception nếu sai)
        otpService.verifyOtp(req.phone(), req.otp());

        // 2. Check trùng
        if (userRepo.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email đã được sử dụng.");
        }
        if (userRepo.existsByUsername(username)) {
            throw new EmailAlreadyExistsException("Tên đăng nhập đã tồn tại.");
        }
        if (userRepo.existsByPhoneNumber(req.phone())) {
            throw new EmailAlreadyExistsException("Số điện thoại đã được đăng ký.");
        }

        // 3. Tạo user
        User user = User.builder()
            .username(username)
            .email(email)
            .password(passwordEncoder.encode(req.password()))
            .fullName(req.fullName())
            .phoneNumber(req.phone())
            .role(Role.CUSTOMER)
            .isActive(true)
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
        user = userRepo.save(user);

        // 4. Sinh token
        return buildAuthResponse(user);
    }

    /**
     * Đăng nhập bằng email + password.
     *
     * ⚠️ KHÔNG dùng readOnly=true!
     * Hàm này ghi refresh token mới vào DB. Nếu transaction read-only,
     * Spring sẽ rollback → refresh token không được lưu → lần refresh
     * sau sẽ luôn thất bại với 401.
     */
    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = normalizeEmail(req.email());

        User user = userRepo.findByEmail(email)
            .orElseThrow(() -> new InvalidCredentialsException("Email hoặc mật khẩu không đúng."));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new InvalidCredentialsException("Tài khoản đã bị khoá.");
        }

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new InvalidCredentialsException("Email hoặc mật khẩu không đúng.");
        }

        // Ghi lại refresh token mới (cho phép nhiều thiết bị đăng nhập)
        return buildAuthResponse(user);
    }

    /**
     * Refresh access token từ refresh token — có ROTATION.
     *
     * Quy tắc:
     *  • Token hợp lệ   → revoke token cũ, cấp cặp token mới
     *  • Token đã bị revoke mà lại được dùng → phát hiện token bị trộm
     *    → vô hiệu hoá TOÀN BỘ session của user đó
     *
     * ⚠️ `noRollbackFor = InvalidCredentialsException.class`
     * Khi phát hiện token bị trộm, ta ném exception ĐỒNG THỜI cần giữ lại
     * thay đổi "revoke toàn bộ session". Nếu không có noRollbackFor, Spring sẽ
     * rollback transaction → lệnh revoke bị hoàn tác → attacker vẫn dùng được.
     */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public AuthResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwtService.parseRefreshToken(refreshToken);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidCredentialsException("Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        String userId = claims.getSubject();
        String tokenHash = jwtService.hashToken(refreshToken);

        RefreshToken stored = refreshTokenRepo.findByTokenHash(tokenHash)
            .orElseThrow(() -> new InvalidCredentialsException("Refresh token không hợp lệ."));

        if (Boolean.TRUE.equals(stored.getRevoked())) {
            // Token đã bị revoke nhưng vẫn được dùng lại → có thể đã bị trộm.
            // → Huỷ toàn bộ session của user, bắt đăng nhập lại.
            refreshTokenRepo.revokeAllByUserId(userId, LocalDateTime.now());
            throw new InvalidCredentialsException(
                "Refresh token đã được sử dụng trước đó. Vui lòng đăng nhập lại."
            );
        }

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            stored.setRevoked(true);
            stored.setRevokedAt(LocalDateTime.now());
            refreshTokenRepo.save(stored);
            throw new InvalidCredentialsException("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
        }

        User user = userRepo.findById(userId)
            .orElseThrow(() -> new InvalidCredentialsException("User không tồn tại."));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new InvalidCredentialsException("Tài khoản đã bị khoá.");
        }

        // ROTATION: revoke token cũ trước
        stored.setRevoked(true);
        stored.setRevokedAt(LocalDateTime.now());
        refreshTokenRepo.save(stored);

        // Cấp cặp token mới
        AuthResponse response = buildAuthResponse(user);

        // Liên kết token mới với token cũ (trace token chain)
        stored.setReplacedBy(jwtService.hashToken(response.refreshToken()));
        refreshTokenRepo.save(stored);

        return response;
    }

    /**
     * Lấy thông tin user hiện tại từ userId trong JWT.
     */
    @Transactional(readOnly = true)
    public UserDto currentUser(String userId) {
        User user = userRepo.findById(userId)
            .orElseThrow(() -> new InvalidCredentialsException("User không tồn tại."));
        return toUserDto(user);
    }

    /**
     * Đăng xuất — vô hiệu hoá toàn bộ refresh token của user.
     */
    @Transactional
    public void logout(String userId) {
        refreshTokenRepo.revokeAllByUserId(userId, LocalDateTime.now());
    }

    private AuthResponse buildAuthResponse(User user) {
        String access = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refresh = jwtService.generateRefreshToken(user.getId(), user.getEmail(), user.getRole().name());

        // Lưu HASH của refresh token vào DB (không lưu token gốc)
        RefreshToken entity = RefreshToken.builder()
            .userId(user.getId())
            .tokenHash(jwtService.hashToken(refresh))
            .revoked(false)
            .expiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationSeconds()))
            .createdAt(LocalDateTime.now())
            .build();
        refreshTokenRepo.save(entity);

        UserDto userDto = toUserDto(user);
        return new AuthResponse(
            access,
            refresh,
            "Bearer",
            jwtService.getAccessExpirationSeconds(),
            userDto
        );
    }

    /**
     * Chuyển entity User → DTO.
     */
    private UserDto toUserDto(User user) {
        return new UserDto(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFullName(),
            user.getPhoneNumber(),
            user.getRole().name(),
            user.getCreatedAt()
        );
    }

    /**
     * Chuẩn hoá email: bỏ khoảng trắng đầu/cuối + lowercase.
     * Nhờ vậy "  Test@ABC.com " và "test@abc.com" là MỘT tài khoản.
     */
    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

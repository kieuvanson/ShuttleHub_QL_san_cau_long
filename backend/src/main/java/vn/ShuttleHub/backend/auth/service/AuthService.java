package vn.ShuttleHub.backend.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.dto.AuthResponse;
import vn.ShuttleHub.backend.auth.dto.LoginRequest;
import vn.ShuttleHub.backend.auth.dto.RegisterRequest;
import vn.ShuttleHub.backend.auth.dto.UserDto;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.auth.exception.InvalidCredentialsException;
import vn.ShuttleHub.backend.auth.exception.RateLimitException;
import vn.ShuttleHub.backend.entity.RefreshToken;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.RefreshTokenRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final RefreshTokenRepository refreshTokenRepo;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationAttemptService registrationAttemptService;

    /** Số lần đăng ký tối đa trên 1 số điện thoại trong 24h. */
    private final int maxRegistrationsPerPhonePerDay;

    /**
     * ⚠️ Vì sao KHÔNG dùng {@code @RequiredArgsConstructor}?
     * Lombok chỉ inject các field {@code final}. Field cấu hình
     * {@code maxRegistrationsPerPhonePerDay} được gán từ {@code @Value} —
     * nếu khai báo bằng {@code @Value} trên field (không final) thì
     * Spring KHÔNG set giá trị cho nó → luôn bằng 0 → mọi lần đăng ký
     * đều bị chặn. → Phải dùng constructor injection thủ công cho key này.
     */
    public AuthService(
            UserRepository userRepo,
            RefreshTokenRepository refreshTokenRepo,
            OtpService otpService,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            RegistrationAttemptService registrationAttemptService,
            @Value("${app.otp.max-registrations-per-phone-per-day}") int maxRegistrationsPerPhonePerDay
    ) {
        this.userRepo = userRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.registrationAttemptService = registrationAttemptService;
        this.maxRegistrationsPerPhonePerDay = maxRegistrationsPerPhonePerDay;
    }

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

        // 2. Ghi bộ đếm lần đăng ký TRƯỚC khi kiểm tra trùng.
        //
        // ⚠️ Vì sao ghi TRƯỚC (kể cả khi đăng ký sẽ fail)?
        //   Mỗi lần gọi /register đều đã tốn 1 tin SMS (đã gửi OTP + đã
        //   verify thành công). Nếu chỉ đếm lần ĐĂNG KÝ THÀNH CÔNG thì:
        //     - lần 1 → thành công → ghi 1 dòng
        //     - lần 2,3,4 → bị chặn 409 "SĐT đã đăng ký" → KHÔNG ghi
        //   → bộ đếm kẹt ở 1 → giới hạn 3 lần/ngày KHÔNG BAO GIỜ kích hoạt
        //     → kẻ spam vẫn đốt được tiền SMS vô hạn.
        //   Ghi trước thì lần 2,3,4 cũng bị tính → lần 4 bị chặn 429.
        //
        // ⚠️ Đánh đổi (user đã chấp nhận): người dùng thật gõ nhầm email
        // sẽ bị trừ 1 lượt. Vì vậy mặc định đặt 3 lần/ngày (không phải 1)
        // để vẫn còn dư lượt cho họ thử lại.
        registrationAttemptService.recordRegistration(req.phone());

        // 3. Chặn spam đăng ký: giới hạn số lần đăng ký trên 1 số điện thoại.
        //
        // ⚠️ Vì sao check giới hạn TRƯỚC check trùng?
        //   Nếu check trùng SĐT trước, lần 2 trở đi luôn bị chặn 409 và
        //   không bao giờ chạm tới nhánh 429 → giới hạn trở thành code chết.
        //   Kiểm tra giới hạn trước → lần 4 trả 429 "đã đăng ký quá nhiều lần",
        //   đúng mục đích chống đốt tiền SMS.
        long attempts = registrationAttemptService.countRegistrationsInLast24h(req.phone());
        if (attempts > maxRegistrationsPerPhonePerDay) {
            throw new RateLimitException(
                "Số điện thoại này đã đăng ký quá nhiều lần. Vui lòng thử lại sau."
            );
        }

        // 4. Check trùng
        if (userRepo.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email đã được sử dụng.");
        }
        if (userRepo.existsByUsername(username)) {
            throw new EmailAlreadyExistsException("Tên đăng nhập đã tồn tại.");
        }
        if (userRepo.existsByPhoneNumber(req.phone())) {
            throw new EmailAlreadyExistsException("Số điện thoại đã được đăng ký.");
        }

        // 5. Tạo user
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

        // 6. Sinh token
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

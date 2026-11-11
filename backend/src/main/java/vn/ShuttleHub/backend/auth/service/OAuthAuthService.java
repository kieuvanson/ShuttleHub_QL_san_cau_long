package vn.ShuttleHub.backend.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.auth.exception.InvalidCredentialsException;
import vn.ShuttleHub.backend.auth.oauth.OAuthTicketService;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.entity.OAuthAccount;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.OAuthAccountRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

/**
 * Nghiệp vụ tìm / tạo / gộp user khi đăng nhập qua OAuth.
 *
 * ⚠️ Quy tắc bảo mật cốt lõi — CHỈ provider có {@code emailVerified=true}
 * mới được gộp tự động vào tài khoản đã tồn tại. Facebook không bao giờ
 * đạt điều này (Graph API không có cờ email_verified) → nếu email trùng,
 * ta ném lỗi thay vì gộp, để không ai có thể chiếm đoạt tài khoản.
 */
@Slf4j
@Service
public class OAuthAuthService {

    private final UserRepository userRepo;
    private final OAuthAccountRepository oauthAccountRepo;
    private final PasswordEncoder passwordEncoder;
    private final OAuthTicketService ticketService;
    private final OtpService otpService;

    private final SecureRandom random = new SecureRandom();

    public OAuthAuthService(
            UserRepository userRepo,
            OAuthAccountRepository oauthAccountRepo,
            PasswordEncoder passwordEncoder,
            OAuthTicketService ticketService,
            OtpService otpService
    ) {
        this.userRepo = userRepo;
        this.oauthAccountRepo = oauthAccountRepo;
        this.passwordEncoder = passwordEncoder;
        this.ticketService = ticketService;
        this.otpService = otpService;
    }

    /**
     * Xử lý sau khi provider redirect về backend.
     */
    @Transactional
    public OAuthLoginOutcome handleCallback(OAuthUserInfo info) {
        // 1. Đã liên kết trước đây → dùng lại user đó.
        Optional<OAuthAccount> link = oauthAccountRepo
                .findByProviderAndProviderUserId(info.provider(), info.providerUserId());
        if (link.isPresent()) {
            User user = userRepo.findById(link.get().getUserId())
                    .orElseThrow(() -> new InvalidCredentialsException("Tài khoản không tồn tại."));
            assertActive(user);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 2. Chưa liên kết. Chuẩn hoá email để so sánh.
        String email = normalizeEmail(info.email());

        if (email == null) {
            // Provider không trả email (Facebook user chưa cấp quyền).
            // → Buộc user hoàn thiện hồ sơ.
            String ticket = ticketService.issuePending(info.provider(), info.providerUserId(), info.fullName());
            return OAuthLoginOutcome.needsProfile(info, ticket);
        }

        Optional<User> existing = userRepo.findByEmail(email);

        if (existing.isPresent()) {
            // ⚠️ CHỈ gộp khi provider chứng minh được sở hữu email.
            if (!info.emailVerified()) {
                throw new EmailAlreadyExistsException(
                        "Email này đã được sử dụng. Vui lòng đăng nhập bằng mật khẩu.");
            }
            User user = existing.get();
            assertActive(user);
            linkAccount(user.getId(), info, email);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 3. Email mới + provider đã xác minh → tạo user luôn (Google).
        if (info.emailVerified()) {
            User user = userRepo.save(createUser(email, info.fullName()));
            linkAccount(user.getId(), info, email);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 4. Provider KHÔNG xác minh được email (Facebook) → yêu cầu hoàn thiện hồ sơ.
        String ticket = ticketService.issuePending(info.provider(), info.providerUserId(), info.fullName());
        return OAuthLoginOutcome.needsProfile(info, ticket);
    }

    /**
     * Hoàn thiện hồ sơ cho user Facebook.
     *
     * @param ticket ticket đang chờ (userId = null)
     * @return userId vừa tạo
     */
    @Transactional
    public String completeFacebookProfile(String ticket, String email, String phone, String otp) {
        // ⚠️ providerUserId lấy từ ticket (server-side), KHÔNG lấy từ client —
        // nếu lấy từ client thì attacker có thể gắn tài khoản Facebook của
        // mình vào bất kỳ providerUserId nào.
        String providerUserId = ticketService.peek(ticket).getProviderUserId();

        // Verify SĐT — tái dùng luồng OTP sẵn có nên FB cũng chịu rate-limit
        // SMS (10 lần/giờ/IP + 3 lần đăng ký/SĐT/24h) → chống đốt tiền SMS.
        otpService.verifyOtp(phone, otp);

        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) {
            throw new EmailAlreadyExistsException("Email không hợp lệ.");
        }
        if (userRepo.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email này đã được sử dụng.");
        }
        if (userRepo.existsByPhoneNumber(phone)) {
            throw new EmailAlreadyExistsException("Số điện thoại này đã được đăng ký.");
        }

        User user = createUser(normalizedEmail, null);
        user.setPhoneNumber(phone);
        user = userRepo.save(user);

        oauthAccountRepo.save(OAuthAccount.builder()
                .userId(user.getId())
                .provider(OAuthUserInfo.FACEBOOK)
                .providerUserId(providerUserId)
                .emailAtRegistration(normalizedEmail)
                .createdAt(LocalDateTime.now())
                .build());

        ticketService.attachUser(ticket, user.getId());
        return user.getId();
    }

    /**
     * Dựng entity User cho tài khoản OAuth (CHƯA lưu vào DB).
     *
     * ⚠️ Gọi `userRepo.save` ở nơi gọi hàm này — vì flow Facebook còn cần
     * set `phoneNumber` sau khi dựng user.
     */
    private User createUser(String email, String fullName) {
        // ⚠️ Mật khẩu = hash BCrypt của chuỗi random 32 byte.
        // → Không ai (kể cả chủ sân) đăng nhập được bằng mật khẩu cho
        //   tài khoản OAuth. Cột `password` NOT NULL nên phải có giá trị.
        byte[] randomBytes = new byte[32];
        random.nextBytes(randomBytes);
        String unusablePassword = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        return User.builder()
                .username(generateUniqueUsername(email))
                .email(email)
                .password(passwordEncoder.encode(unusablePassword))
                .fullName(fullName)
                .role(Role.CUSTOMER)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private void linkAccount(String userId, OAuthUserInfo info, String email) {
        oauthAccountRepo.save(OAuthAccount.builder()
                .userId(userId)
                .provider(info.provider())
                .providerUserId(info.providerUserId())
                .emailAtRegistration(email)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void assertActive(User user) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new InvalidCredentialsException("Tài khoản đã bị khoá.");
        }
    }

    /**
     * Sinh `username` duy nhất từ email.
     *
     * ⚠️ Ràng buộc của hệ thống: chỉ chữ/số/gạch dưới, tối đa 50 ký tự,
     * và phải UNIQUE (có constraint ở DB).
     */
    private String generateUniqueUsername(String email) {
        String local = email == null ? "" : email.split("@")[0];
        String cleaned = local == null ? "" : local.replaceAll("[^a-zA-Z0-9_]", "");
        if (cleaned.isBlank()) {
            cleaned = "user";
        }
        if (cleaned.length() > 40) {
            cleaned = cleaned.substring(0, 40);
        }

        String candidate = cleaned;
        for (int i = 2; i <= 5 && userRepo.existsByUsername(candidate); i++) {
            candidate = cleaned + "_" + i;
        }
        // Lần cuối thêm hậu tố random để tránh trùng tuyệt đối.
        if (userRepo.existsByUsername(candidate)) {
            byte[] suffix = new byte[4];
            random.nextBytes(suffix);
            candidate = cleaned + "_" + HexFormat.of().formatHex(suffix);
        }
        return candidate;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String s = email.trim().toLowerCase(Locale.ROOT);
        return s.isBlank() ? null : s;
    }
}

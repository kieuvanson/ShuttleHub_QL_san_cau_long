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
import vn.ShuttleHub.backend.entity.OAuthTicket;
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
 *
 * ⚠️ Tuy nhiên TẠO tài khoản MỚI bằng email Facebook trả về thì AN TOÀN
 * (không xung đột với tài khoản nào) → Facebook đăng nhập vào app được
 * ngay, không bắt hoàn thiện hồ sơ.
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

    /**
     * Domain của email tạm cho user Facebook chưa cấp quyền email.
     *
     * ⚠️ Vì sao cần email tạm? `users.email` NOT NULL → không có email thì không
     * tạo được user. Email tạm gắn với providerUserId (duy nhất) nên không bao
     * giờ trùng. User tự đổi ở trang cá nhân.
     */
    static final String TEMP_EMAIL_DOMAIN = "facebook.local";

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
            // ⚠️ Cập nhật avatar mỗi lần đăng nhập lại — user có thể đã
            //   đổi ảnh trên Facebook. URL cũ có thời hạn nên phải làm mới.
            refreshAvatar(user, info.avatarUrl());
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 2. Chưa liên kết. Chuẩn hoá email để so sánh.
        String email = normalizeEmail(info.email());

        if (email == null) {
            // Facebook không trả email (user chưa cấp quyền email).
            // → Chưa tạo user: bắt user xác minh SĐT bằng OTP trước.
            //   SĐT là bằng chứng sở hữu thật + UNIQUE trong DB → không ai
            //   khai SĐT của người khác để chiếm chỗ được.
            String ticket = ticketService.issuePending(
                    info.provider(), info.providerUserId(), info.fullName(), info.avatarUrl());
            return OAuthLoginOutcome.needsPhone(info, ticket);
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
            refreshAvatar(user, info.avatarUrl());
            linkAccount(user.getId(), info, email);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 3. Email mới.
        //    - Provider xác minh được email (Google) → tạo user luôn.
        //    - Facebook không có cờ email_verified, nhưng TẠO USER MỚI bằng
        //      email đó vẫn AN TOÀN (không xung đột với ai) → cũng tạo luôn.
        //      Sự khác biệt: Facebook KHÔNG BAO GIỜ gộp vào tài khoản có sẵn
        //      (đã xử lý ở nhánh `existing.isPresent()` phía trên).
        User user = userRepo.save(createUser(email, info.fullName(), info.avatarUrl()));
        linkAccount(user.getId(), info, email);
        String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
        return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
    }

    /**
     * Sinh email tạm cho user Facebook chưa chia sẻ email.
     *
     * ⚠️ Vì sao cần hash? `users.email` là UNIQUE. Nếu chỉ lọc ký tự đặc biệt
     * thì hai providerUserId khác nhau có thể ra cùng một email
     * (ví dụ "fb-1" và "fb1" → "fb1") → vi phạm UNIQUE khi tạo user.
     * → Ta giữ phần đọc được + thêm 8 ký tự hash SHA-256 của id gốc.
     *   Hai id khác nhau gần như không thể trùng 8 hex char (va chạm ~1/4 tỷ).
     */
    String buildTempEmail(String providerUserId) {
        String raw = providerUserId == null ? "unknown" : providerUserId;
        String readable = raw.replaceAll("[^a-zA-Z0-9_]", "_");
        // Cắt bớt để tổng độ dài email ≤ 100 (cột users.email).
        if (readable.length() > 40) {
            readable = readable.substring(0, 40);
        }
        String hash = hashPrefix(raw);
        return "fb_" + readable + "_" + hash + "@" + TEMP_EMAIL_DOMAIN;
    }

    /** 8 ký tự hex đầu tiên của SHA-256 — dùng để tránh trùng email tạm. */
    private String hashPrefix(String raw) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 4);
        } catch (java.security.NoSuchAlgorithmException ex) {
            // SHA-256 luôn có trong mọi JRE → không bao giờ xảy ra.
            throw new IllegalStateException("Không hỗ trợ SHA-256", ex);
        }
    }

    /**
     * Xác minh SĐT bằng OTP rồi tạo tài khoản — dùng cho nhánh Facebook
     * không trả email.
     *
     * ⚠️ providerUserId lấy từ ticket (server-side), KHÔNG lấy từ client —
     * nếu lấy từ client thì attacker có thể gắn tài khoản Facebook của
     * mình vào bất kỳ providerUserId nào.
     *
     * @param ticket ticket đang chờ (userId = null)
     * @return userId vừa tạo
     */
    @Transactional
    public String verifyPhoneAndCreateUser(String ticket, String phone, String otp) {
        OAuthTicket pending = ticketService.peek(ticket);

        // Verify SĐT — tái dùng luồng OTP sẵn có nên FB cũng chịu rate-limit
        // SMS (10 lần/giờ/IP + 3 lần đăng ký/SĐT/24h) → chống đốt tiền SMS.
        otpService.verifyOtp(phone, otp);

        // SĐT UNIQUE → nếu đã có user thì chặn, không cho chiếm chỗ.
        if (userRepo.existsByPhoneNumber(phone)) {
            throw new EmailAlreadyExistsException("Số điện thoại này đã được đăng ký.");
        }

        String tempEmail = buildTempEmail(pending.getProviderUserId());

        User user = createUser(tempEmail, pending.getFullName(), pending.getAvatarUrl());
        user.setPhoneNumber(phone);
        user = userRepo.save(user);

        oauthAccountRepo.save(OAuthAccount.builder()
                .userId(user.getId())
                .provider(pending.getProvider())
                .providerUserId(pending.getProviderUserId())
                .emailAtRegistration(tempEmail)
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
    private User createUser(String email, String fullName, String avatarUrl) {
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
                .avatarUrl(avatarUrl)
                .role(Role.CUSTOMER)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Làm mới avatar của user nếu provider trả về URL mới.
     *
     * ⚠️ Vì sao cần? URL ảnh Facebook có thời hạn → ảnh cũ sẽ hỏng. Lần
     *   đăng nhập tiếp theo là cơ hội lấy URL mới.
     *
     * ⚠️ Vì sao không ghi khi URL null? Provider có thể không trả `picture`
     *   (user chưa đặt ảnh, hoặc quyền bị thu hồi) → giữ ảnh cũ còn hơn
     *   làm mất ảnh đang hiển thị tốt.
     */
    private void refreshAvatar(User user, String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return;
        }
        if (avatarUrl.equals(user.getAvatarUrl())) {
            return;
        }
        user.setAvatarUrl(avatarUrl);
        user.setUpdatedAt(LocalDateTime.now());
        userRepo.save(user);
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

package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.exception.OtpInvalidException;
import vn.ShuttleHub.backend.auth.exception.RateLimitException;
import vn.ShuttleHub.backend.auth.exception.SmsSendException;
import vn.ShuttleHub.backend.entity.OtpCode;
import vn.ShuttleHub.backend.repository.OtpCodeRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpCodeRepository otpRepo;
    private final OtpAttemptService otpAttemptService;
    private final SmsService smsService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.otp.length}")
    private int otpLength;

    @Value("${app.otp.ttl-seconds}")
    private int ttlSeconds;

    @Value("${app.otp.max-attempts}")
    private int maxAttempts;

    @Value("${app.otp.resend-cooldown-seconds}")
    private int resendCooldownSeconds;

    private final SecureRandom random = new SecureRandom();

    /**
     * Sinh OTP ngẫu nhiên, hash, lưu DB, gửi SMS.
     * Rate-limit: nếu trong `resendCooldownSeconds` gần nhất đã gửi → 429.
     *
     * @return mã OTP nếu mock mode (để dev test), null nếu đã gửi SMS thật
     */
    @Transactional
    public String sendOtp(String phone) {
        // Rate limit: kiểm tra OTP gần nhất
        LocalDateTime cooldownBefore = LocalDateTime.now().minusSeconds(resendCooldownSeconds);
        long recentCount = otpRepo.countByPhoneAndCreatedAtAfter(phone, cooldownBefore);
        if (recentCount > 0) {
            throw new RateLimitException(
                "Vui lòng đợi " + resendCooldownSeconds + " giây trước khi gửi lại mã."
            );
        }

        // Sinh OTP số
        String code = generateOtp(otpLength);

        // Gửi SMS TRƯỚC khi lưu DB.
        // ⚠️ Nếu gửi SMS thất bại mà vẫn lưu OTP → user nhận mã gõ sai sẽ
        // bị báo "OTP không đúng", gây rối. Gửi trước, thành công mới lưu.
        boolean sent = smsService.sendOtp(phone, code);
        if (!sent) {
            throw new SmsSendException(
                "Không thể gửi mã xác nhận. Vui lòng kiểm tra lại số điện thoại và thử lại."
            );
        }

        // Lưu hash + TTL
        OtpCode otp = OtpCode.builder()
            .phone(phone)
            .codeHash(passwordEncoder.encode(code))
            .used(false)
            .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
            .attemptCount(0)
            .createdAt(LocalDateTime.now())
            .build();
        otpRepo.save(otp);

        // Mock mode → trả mã về cho FE; SMS thật → trả null
        return smsService.isMock() ? code : null;
    }

    /**
     * Verify OTP user nhập. Ném exception nếu sai/hết hạn/quá số lần.
     *
     * ⚠️ Vì sao dùng REQUIRES_NEW?
     * Khi ta ném OtpInvalidException, transaction sẽ ROLLBACK → mọi thay đổi
     * (tăng attemptCount, đánh dấu used=true) bị mất. Khi đó user có thể
     * thử sai mã vô hạn lần → vô hiệu hoá rate-limit.
     *
     * REQUIRES_NEW tạo transaction MỚI, độc lập với transaction ngoài.
     * Khi exception ném ra, transaction con rollback, nhưng transaction cha
     * (đã commit phần "đếm sai") vẫn giữ được thay đổi attemptCount.
     *
     * Thực tế: ta tách phần GHI (increment attempt) ra khỏi phần XÁC THỰC.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public OtpCode verifyOtp(String phone, String inputCode) {
        OtpCode otp = otpRepo
            .findFirstByPhoneAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                phone, LocalDateTime.now()
            )
            .orElseThrow(() -> new OtpInvalidException("Mã OTP không tồn tại hoặc đã hết hạn."));

        if (otp.getAttemptCount() >= maxAttempts) {
            otp.setUsed(true); // khoá luôn
            otpRepo.save(otp);
            throw new OtpInvalidException("Bạn đã nhập sai quá " + maxAttempts + " lần. Vui lòng gửi lại mã.");
        }

        boolean matches = passwordEncoder.matches(inputCode, otp.getCodeHash());
        if (!matches) {
            // Tăng bộ đếm sai — phải được COMMIT dù sẽ ném exception.
            int newAttemptCount = incrementAttempt(otp);
            int remaining = Math.max(0, maxAttempts - newAttemptCount);
            throw new OtpInvalidException(
                remaining > 0
                    ? "Mã OTP không đúng. Còn " + remaining + " lần thử."
                    : "Mã OTP không đúng. Đã hết số lần thử, vui lòng gửi lại mã."
            );
        }

        otp.setUsed(true);
        otpRepo.save(otp);
        return otp;
    }

    /**
     * Ghi bộ đếm sai vào DB bằng transaction RIÊNG (xem OtpAttemptService),
     * để không bị rollback khi exception OtpInvalidException được ném ra.
     *
     * @return số lần thử sai MỚI NHẤT sau khi tăng
     */
    private int incrementAttempt(OtpCode otp) {
        otpAttemptService.incrementAttempt(otp);
        return otp.getAttemptCount();
    }

    private String generateOtp(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}

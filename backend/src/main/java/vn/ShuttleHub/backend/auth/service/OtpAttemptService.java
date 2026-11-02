package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.entity.OtpCode;
import vn.ShuttleHub.backend.repository.OtpCodeRepository;

/**
 * Service RIÊNG cho việc ghi bộ đếm số lần nhập sai OTP.
 *
 * ⚠️ Vì sao phải tách class?
 * Spring quản lý transaction qua PROXY (AOP). Khi OtpService tự gọi
 * `this.incrementAttempt(...)` thì KHÔNG đi qua proxy → @Transactional
 * bị bỏ qua → transaction vẫn bị rollback khi exception ném ra.
 *
 * Tách ra class khác → gọi qua proxy → REQUIRES_NEW có tác dụng thật.
 */
@Service
@RequiredArgsConstructor
public class OtpAttemptService {

    private final OtpCodeRepository otpRepo;

    /**
     * Tăng bộ đếm sai trong transaction RIÊNG.
     * Khi exception OtpInvalidException được ném ra ở transaction cha,
     * thay đổi ở transaction con này VẪN được commit → rate-limit có hiệu lực.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void incrementAttempt(OtpCode otp) {
        otp.setAttemptCount(otp.getAttemptCount() + 1);
        otpRepo.save(otp);
    }
}

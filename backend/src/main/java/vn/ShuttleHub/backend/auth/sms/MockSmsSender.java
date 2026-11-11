package vn.ShuttleHub.backend.auth.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Provider SMS giả lập — dùng cho DEV/TEST.
 *
 * ⚠️ Vì sao cần?
 * Dev/test cần chạy trọn luồng đăng ký (gửi mã → verify → tạo user) nhưng
 * KHÔNG tốn tiền tin nhắn thật. Provider này chỉ in mã ra log.
 *
 * ⚠️ Bean này CHỈ được nạp khi `app.sms.provider=mock`. Giá trị khác →
 * không có bean `SmsSender` → app FAIL lúc start (an toàn, không fallback
 * im lặng sang chế độ lộ mã OTP).
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "mock")
public class MockSmsSender implements SmsSender {

    @Override
    public SmsSendResult sendOtp(String phone, String otpCode) {
        log.info("╔══════════════════════════════════════════╗");
        log.info("║  [SMS MOCK] Gửi tới: {}", phone);
        log.info("║  Nội dung: [Cầu Lông dee] Ma xac nhan: {}. Het han sau 5 phut.", otpCode);
        log.info("║  🔑 OTP: {}", otpCode);
        log.info("╚══════════════════════════════════════════╝");
        return SmsSendResult.ok();
    }

    @Override
    public boolean exposesCode() {
        // Chỉ ở mock mode mới cho frontend hiện mã OTP (dev/test).
        return true;
    }
}

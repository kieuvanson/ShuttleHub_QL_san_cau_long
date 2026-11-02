package vn.ShuttleHub.backend.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * SMS Service — Gửi OTP qua SpeedSMS.vn.
 *  • app.sms.mock=true: in OTP ra console, KHÔNG gọi API (dùng cho dev, không tốn tiền)
 *  • app.sms.mock=false: gọi API thật của SpeedSMS
 *
 * Docs SpeedSMS: https://speedsms.vn/sms-api/
 *
 * API SpeedSMS (POST, form-urlencoded):
 *   https://api.speedsms.vn/index.php/sms/send
 *   - access_token : token API (lấy ở https://speedsms.vn/my-account/api)
 *   - sender       : tên brand người gửi (đã đăng ký từ nhà cung cấp)
 *   - recipient    : số điện thoại dạng 84XXXXXXXXX (nhiều số cách nhau bằng dấu phẩy)
 *   - message      : nội dung tin nhắn
 *   - type         : 1 = tin nhắn thường (mặc định 1)
 */
@Service
@Slf4j
public class SmsService {

    private static final String SPEEDSMS_URL = "https://api.speedsms.vn/index.php/sms/send";

    private final boolean mock;
    private final String accessToken;
    private final String sender;
    private final RestClient restClient;

    public SmsService(
        @Value("${app.sms.mock}") boolean mock,
        @Value("${app.sms.access-token}") String accessToken,
        @Value("${app.sms.sender}") String sender
    ) {
        this.mock = mock;
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.sender = sender;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Đang ở chế độ mock hay không.
     * Mock = true → mã OTP được trả về client để dev test không cần SMS thật.
     */
    public boolean isMock() {
        return mock;
    }

    /**
     * Gửi OTP về SĐT.
     *
     * @return true nếu gửi thành công (hoặc đã mock), false nếu gửi thất bại
     */
    public boolean sendOtp(String phone, String otpCode) {
        String message = String.format(
            "[CauLongDee] Ma xac nhan cua ban la: %s. Ma co hieu luc trong 5 phut. "
            + "Khong chia se ma nay voi bat ky ai.",
            otpCode
        );

        if (mock) {
            log.info("╔══════════════════════════════════════════════════════╗");
            log.info("║  [SMS MOCK] Gửi tới: {}", phone);
            log.info("║  Nội dung: {}", message);
            log.info("║  🔑 OTP: {}", otpCode);
            log.info("╚══════════════════════════════════════════════════════╝");
            return true;
        }

        if (accessToken.isEmpty()) {
            log.error("[SMS] Thiếu SPEEDSMS_ACCESS_TOKEN. Không thể gửi OTP tới {}.", phone);
            return false;
        }

        String recipient = toInternationalFormat(phone);
        if (recipient == null) {
            log.error("[SMS] Số điện thoại không hợp lệ: {}", phone);
            return false;
        }

        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("access_token", accessToken);
            form.add("sender", sender);
            form.add("recipient", recipient);
            form.add("message", message);
            form.add("type", "1");

            String response = restClient.post()
                .uri(SPEEDSMS_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(String.class);

            // SpeedSMS trả về chuỗi như: {"status":"success","message":"Sent Successfully"}
            log.info("[SMS] Gửi OTP tới {} ({}): {}", phone, recipient, response);
            return response != null && response.toLowerCase().contains("success");

        } catch (Exception ex) {
            // Không ném exception ra ngoài → trả false để controller báo lỗi cho user
            log.error("[SMS] Gửi OTP tới {} thất bại: {}", phone, ex.getMessage());
            return false;
        }
    }

    /**
     * Chuyển SĐT Việt Nam sang định dạng quốc tế mà SpeedSMS yêu cầu.
     *  0912345678  → 84912345678
     *  +84912345678 → 84912345678
     *
     * @return số đã chuẩn hoá, hoặc null nếu không hợp lệ
     */
    private String toInternationalFormat(String phone) {
        if (phone == null) return null;

        String digits = phone.replaceAll("[^0-9+]", "");

        // Bỏ dấu + nếu có
        if (digits.startsWith("+")) {
            digits = digits.substring(1);
        }

        // Đã có mã quốc gia 84
        if (digits.startsWith("84")) {
            return digits.length() >= 11 ? digits : null;
        }

        // Bắt đầu bằng 0 → thay bằng 84
        if (digits.startsWith("0")) {
            String national = digits.substring(1);
            return "84" + national;
        }

        // Bắt đầu bằng 9 (đã bỏ số 0) → thêm 84
        if (digits.startsWith("9")) {
            return "84" + digits;
        }

        return null;
    }

    /**
     * Encode nội dung để hiển thị trong log (tránh log raw).
     */
    @SuppressWarnings("unused")
    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

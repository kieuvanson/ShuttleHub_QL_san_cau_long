package vn.ShuttleHub.backend.auth.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Provider SMS thật — gọi API SpeedSMS.vn.
 *
 * ⚠️⚠️ FORMAT API — đây là điểm mấu chốt.
 * Code cũ (SmsService) gọi SAI format nên SMS KHÔNG BAO GIỜ gửi được,
 * dù có token đúng. Đối chiếu tài liệu SpeedSMS:
 *
 *   | Điểm          | Đúng (tài liệu)                        | SAI (code cũ)                    |
 *   |---------------|----------------------------------------|----------------------------------|
 *   | Content-Type  | application/json                       | application/x-www-form-urlencoded |
 *   | Payload       | {"to":[],"content":"","sms_type":,"sender":""} | access_token/recipient/message/type |
 *   | Auth          | HTTP Basic (-u "{token}:x")            | access_token trong body form      |
 *   | Loại tin      | sms_type (2=CSKH, 3=brandname, ...)    | type=1 (không hợp lệ)             |
 *
 * → Sửa 4 điểm này là nguyên nhân gốc khiến tin nhắn không bao giờ tới.
 *
 * Docs: https://speedsms.vn/sms-api/
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "speedsms")
public class SpeedSmsSender implements SmsSender {

    private static final String SEND_URL = "https://api.speedsms.vn/index.php/sms/send";

    /**
     * Nội dung tin nhắn — KHÔNG dấu, 61 ký tự.
     *
     * ⚠️ Vì sao không dấu?
     *   1. Tin không dấu = 61 ký tự < 160 → đúng 1 tin SMS (tin có dấu ~70 ký tự
     *      unicode → bị tính 2 tin → tốn gấp đôi).
     *   2. SpeedSMS CHƯA hỗ trợ tiếng Việt có dấu cho brandname/đầu số cố định,
     *      nên không dấu giúp chuyển đổi `sms_type` linh hoạt về sau.
     */
    private static final String MESSAGE_TEMPLATE =
            "[Cầu Lông dee] Ma xac nhan: %s. Het han sau 5 phut.";

    private final RestClient restClient;
    private final String accessToken;
    private final String sender;
    private final int smsType;
    private final String phoneFormat;
    private final ObjectMapper objectMapper;

    public SpeedSmsSender(
            RestClient.Builder builder,
            @Value("${app.sms.access-token}") String accessToken,
            @Value("${app.sms.sender}") String sender,
            @Value("${app.sms.type}") int smsType,
            @Value("${app.sms.phone-format}") String phoneFormat
    ) {
        this.restClient = builder.build();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.sender = sender == null ? "" : sender.trim();
        this.smsType = smsType;
        this.phoneFormat = phoneFormat == null ? "national" : phoneFormat.trim();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public SmsSendResult sendOtp(String phone, String otpCode) {
        if (accessToken.isEmpty()) {
            log.error("[SMS] Thiếu SPEEDSMS_ACCESS_TOKEN. Không thể gửi OTP tới {}.", phone);
            return SmsSendResult.fail("missing_token", SmsErrorMessages.forCode("101"));
        }

        String content = String.format(MESSAGE_TEMPLATE, otpCode);
        String recipient = formatPhone(phone);

        // Brand CHỈ dùng cho sms_type 3 (brandname) và 5 (app android).
        // sms_type 2 (CSKH) không cần brand → gửi chuỗi rỗng cho đúng tài liệu.
        String brand = (smsType == 3 || smsType == 5) ? sender : "";

        try {
            String body = restClient.post()
                    .uri(SEND_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", basicAuth())
                    .body(new SendSmsRequest(new String[]{recipient}, content, smsType, brand))
                    .retrieve()
                    .body(String.class);

            return parseResponse(body, recipient);
        } catch (RestClientException ex) {
            // ⚠️ KHÔNG lộ raw body / stack trace của SpeedSMS cho client —
            // chỉ log ra server, trả message chung.
            log.error("[SMS] Gửi OTP tới {} thất bại: {}", recipient, ex.getMessage());
            return SmsSendResult.fail("http_error", SmsErrorMessages.forCode("500"));
        }
    }

    /**
     * HTTP Basic theo chuẩn SpeedSMS: token làm username, "x" làm password.
     */
    private String basicAuth() {
        String credentials = accessToken + ":x";
        return "Basic " + Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Định dạng số điện thoại theo config.
     *
     * @param phone số đã chuẩn hoá E.164 (84912345678)
     */
    private String formatPhone(String phone) {
        if ("e164".equalsIgnoreCase(phoneFormat)) {
            return phone;
        }
        // national: 84912345678 → 0912345678 (khớp ví dụ chính thức của SpeedSMS)
        if (phone != null && phone.startsWith("84") && phone.length() == 11) {
            return "0" + phone.substring(2);
        }
        return phone;
    }

    /**
     * Parse response JSON của SpeedSMS.
     *
     * Response thành công:
     *   {"status":"success","code":"00","data":{"tranId":"...","totalSMS":1,...}}
     * Response lỗi:
     *   {"status":"error","code":"300","message":"..."}
     */
    private SmsSendResult parseResponse(String body, String recipient) {
        if (body == null || body.isBlank()) {
            log.error("[SMS] SpeedSMS trả về body rỗng cho {}", recipient);
            return SmsSendResult.fail("empty_response", SmsErrorMessages.forCode("500"));
        }

        try {
            JsonNode node = objectMapper.readTree(body);
            String status = node.path("status").asText("");

            if ("success".equalsIgnoreCase(status)) {
                return SmsSendResult.ok();
            }

            String code = node.path("code").asText(null);
            log.error("[SMS] SpeedSMS từ chối tới {}: code={} message={}",
                    recipient, code, node.path("message").asText(""));
            return SmsSendResult.fail(code, SmsErrorMessages.forCode(code));
        } catch (Exception ex) {
            // Body không phải JSON hoặc lỗi parse → KHÔNG lộ raw body cho client.
            log.error("[SMS] Không parse được response SpeedSMS cho {}: {}",
                    recipient, ex.getMessage());
            return SmsSendResult.fail("invalid_response", SmsErrorMessages.forCode("500"));
        }
    }

    /**
     * Body JSON đúng format SpeedSMS yêu cầu.
     *
     * ⚠️ Tên field `sms_type` giữ nguyên dấu gạch dưới vì SpeedSMS dùng
     * đúng tên đó — Jackson đặt tên property theo tên field.
     */
    public record SendSmsRequest(String[] to, String content, int sms_type, String sender) {
    }
}

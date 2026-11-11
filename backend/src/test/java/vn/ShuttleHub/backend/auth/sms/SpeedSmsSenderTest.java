package vn.ShuttleHub.backend.auth.sms;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Test {@link SpeedSmsSender} — kiểm tra FORMAT API đúng theo tài liệu
 * SpeedSMS.vn (https://speedsms.vn/sms-api/).
 *
 * ⚠️ Đây chính là test bảo vệ nguyên nhân gốc khiến SMS không bao giờ gửi
 * được: code cũ dùng `application/x-www-form-urlencoded` + field
 * `access_token`/`recipient`/`message`/`type`, trong khi SpeedSMS yêu cầu
 * `application/json` + HTTP Basic + body `to`/`content`/`sms_type`/`sender`.
 */
class SpeedSmsSenderTest {

    private static final String SEND_URL = "https://api.speedsms.vn/index.php/sms/send";
    private static final String TOKEN = "TOKEN123";
    private static final String SENDER = "CauLongDee";

    private RestClient.Builder builder;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
    }

    private SpeedSmsSender sender(int smsType, String phoneFormat) {
        return new SpeedSmsSender(builder, TOKEN, SENDER, smsType, phoneFormat);
    }

    @Test
    @DisplayName("POST tới đúng URL với Content-Type application/json")
    void sendOtp_postsJsonToCorrectUrl() {
        server.expect(once(), requestTo(SEND_URL))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("Content-Type", org.hamcrest.Matchers.containsString("application/json")))
                .andRespond(withSuccess(
                        "{\"status\":\"success\",\"code\":\"00\",\"data\":{\"totalSMS\":1}}",
                        MediaType.APPLICATION_JSON));

        sender(2, "national").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("Authorization header dùng HTTP Basic với token + \":x\"")
    void sendOtp_sendsBasicAuthHeader() {
        String expected = "Basic " + Base64.getEncoder()
                .encodeToString((TOKEN + ":x").getBytes(StandardCharsets.UTF_8));

        server.expect(once(), requestTo(SEND_URL))
                .andExpect(header("Authorization", expected))
                .andRespond(withSuccess(
                        "{\"status\":\"success\"}", MediaType.APPLICATION_JSON));

        sender(2, "national").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("Body JSON đúng tên field SpeedSMS: to / content / sms_type / sender")
    void sendOtp_bodyHasToContentSmsTypeSender() {
        server.expect(once(), requestTo(SEND_URL))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"to\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"content\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"sms_type\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"sender\"")))
                .andRespond(withSuccess("{\"status\":\"success\"}", MediaType.APPLICATION_JSON));

        sender(2, "national").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("phoneFormat=national → gửi \"0912345678\" (khớp ví dụ chính thức)")
    void sendOtp_bodyUsesNationalFormat() {
        server.expect(once(), requestTo(SEND_URL))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"0912345678\"")))
                .andRespond(withSuccess("{\"status\":\"success\"}", MediaType.APPLICATION_JSON));

        sender(2, "national").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("phoneFormat=e164 → gửi \"84912345678\"")
    void sendOtp_bodyUsesE164WhenConfigured() {
        server.expect(once(), requestTo(SEND_URL))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"84912345678\"")))
                .andRespond(withSuccess("{\"status\":\"success\"}", MediaType.APPLICATION_JSON));

        sender(2, "e164").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("sms_type=2 (CSKH) → sender rỗng (không cần brand được duyệt)")
    void sendOtp_type2_usesEmptySender() {
        server.expect(once(), requestTo(SEND_URL))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"sender\":\"\"")))
                .andRespond(withSuccess("{\"status\":\"success\"}", MediaType.APPLICATION_JSON));

        sender(2, "national").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("sms_type=3 (brandname) → sender = tên brand")
    void sendOtp_usesSenderForBrandnameType() {
        server.expect(once(), requestTo(SEND_URL))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"sender\":\"" + SENDER + "\"")))
                .andRespond(withSuccess("{\"status\":\"success\"}", MediaType.APPLICATION_JSON));

        sender(3, "national").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("Nội dung tin có mã OTP và không dấu (1 tin SMS)")
    void sendOtp_contentContainsOtpWithoutDiacritics() {
        server.expect(once(), requestTo(SEND_URL))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Ma xac nhan: 123456")))
                .andRespond(withSuccess("{\"status\":\"success\"}", MediaType.APPLICATION_JSON));

        sender(2, "national").sendOtp("84912345678", "123456");

        server.verify();
    }

    @Test
    @DisplayName("Response success → success=true, errorCode=null")
    void sendOtp_successResponse_returnsOk() {
        server.expect(once(), requestTo(SEND_URL))
                .andRespond(withSuccess(
                        "{\"status\":\"success\",\"code\":\"00\",\"data\":{\"tranId\":\"1\",\"totalSMS\":1,\"totalPrice\":350,\"invalidPhone\":[]}}",
                        MediaType.APPLICATION_JSON));

        SmsSendResult result = sender(2, "national").sendOtp("84912345678", "123456");

        assertTrue(result.success());
        assertEquals(null, result.errorCode());
    }

    @Test
    @DisplayName("Error code 300 → message tiếng Việt đúng nguyên nhân")
    void sendOtp_errorCode300_failsWithVietnameseMessage() {
        server.expect(once(), requestTo(SEND_URL))
                .andRespond(withSuccess(
                        "{\"status\":\"error\",\"code\":\"300\",\"message\":\"Your account balance not enough to send sms\"}",
                        MediaType.APPLICATION_JSON));

        SmsSendResult result = sender(2, "national").sendOtp("84912345678", "123456");

        assertFalse(result.success());
        assertEquals("300", result.errorCode());
        assertEquals("Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau.", result.errorMessage());
    }

    @Test
    @DisplayName("Error code 105 → Số điện thoại không hợp lệ.")
    void sendOtp_errorCode105_failsWithPhoneInvalid() {
        server.expect(once(), requestTo(SEND_URL))
                .andRespond(withSuccess(
                        "{\"status\":\"error\",\"code\":\"105\",\"message\":\"Phone number invalid\"}",
                        MediaType.APPLICATION_JSON));

        SmsSendResult result = sender(2, "national").sendOtp("84912345678", "123456");

        assertFalse(result.success());
        assertEquals("105", result.errorCode());
        assertEquals("Số điện thoại không hợp lệ.", result.errorMessage());
    }

    @Test
    @DisplayName("Lỗi HTTP 500 → fail NHƯNG không lộ raw body của SpeedSMS")
    void sendOtp_httpError500_failsWithoutLeakingBody() {
        server.expect(once(), requestTo(SEND_URL))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("{\"internal\":\"SUPER_SECRET_INTERNAL_DETAIL\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        SmsSendResult result = sender(2, "national").sendOtp("84912345678", "123456");

        assertFalse(result.success());
        assertEquals("http_error", result.errorCode());
        assertEquals("Không thể gửi mã xác nhận. Vui lòng thử lại sau.", result.errorMessage());
        assertFalse(result.errorMessage().contains("SUPER_SECRET_INTERNAL_DETAIL"),
                "Không được lộ raw body của SpeedSMS cho client");
    }

    @Test
    @DisplayName("Body không phải JSON → fail mà không lộ raw body")
    void sendOtp_malformedJson_failsWithoutLeakingBody() {
        server.expect(once(), requestTo(SEND_URL))
                .andRespond(withSuccess("not-json", MediaType.TEXT_PLAIN));

        SmsSendResult result = sender(2, "national").sendOtp("84912345678", "123456");

        assertFalse(result.success());
        assertEquals("invalid_response", result.errorCode());
        assertFalse(result.errorMessage().contains("not-json"),
                "Không được lộ raw body của SpeedSMS cho client");
    }

    @Test
    @DisplayName("Thiếu access token → fail với errorCode missing_token, KHÔNG gọi mạng")
    void sendOtp_missingToken_failsWithoutCallingNetwork() {
        SpeedSmsSender noToken = new SpeedSmsSender(builder, "", SENDER, 2, "national");

        SmsSendResult result = noToken.sendOtp("84912345678", "123456");

        assertFalse(result.success());
        assertEquals("missing_token", result.errorCode());
        // Không có expectation nào được set → nếu code gọi mạng, test sẽ fail.
        server.verify();
    }

    @Test
    @DisplayName("exposesCode = false (production KHÔNG lộ mã OTP)")
    void exposesCode_isFalse() {
        assertFalse(sender(2, "national").exposesCode());
    }
}

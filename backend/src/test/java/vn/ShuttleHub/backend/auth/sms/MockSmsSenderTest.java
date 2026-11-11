package vn.ShuttleHub.backend.auth.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MockSmsSenderTest {

    @Test
    @DisplayName("sendOtp trả về success")
    void sendOtp_returnsSuccess() {
        assertTrue(new MockSmsSender().sendOtp("84912345678", "123456").success());
    }

    @Test
    @DisplayName("sendOtp không có errorCode khi thành công")
    void sendOtp_hasNoErrorCode() {
        assertNull(new MockSmsSender().sendOtp("84912345678", "123456").errorCode());
    }

    @Test
    @DisplayName("sendOtp không có errorMessage khi thành công")
    void sendOtp_hasNoErrorMessage() {
        assertNull(new MockSmsSender().sendOtp("84912345678", "123456").errorMessage());
    }

    @Test
    @DisplayName("exposesCode = true (chỉ mock mới lộ mã OTP)")
    void exposesCode_isTrue() {
        assertTrue(new MockSmsSender().exposesCode());
    }
}

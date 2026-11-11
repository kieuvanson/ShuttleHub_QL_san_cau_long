package vn.ShuttleHub.backend.auth.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SmsSendResultTest {

    @Test
    @DisplayName("ok() → success=true, errorCode=null, errorMessage=null")
    void ok_isSuccessfulWithoutErrors() {
        SmsSendResult result = SmsSendResult.ok();
        assertTrue(result.success());
        assertNull(result.errorCode());
        assertNull(result.errorMessage());
    }

    @Test
    @DisplayName("fail(code, msg) → success=false, giữ nguyên code + message")
    void fail_keepsErrorCodeAndMessage() {
        SmsSendResult result = SmsSendResult.fail("300", "Hệ thống SMS tạm thời quá tải.");
        assertFalse(result.success());
        assertEquals("300", result.errorCode());
        assertEquals("Hệ thống SMS tạm thời quá tải.", result.errorMessage());
    }
}

package vn.ShuttleHub.backend.auth.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SmsErrorMessagesTest {

    @Test
    @DisplayName("105 → Số điện thoại không hợp lệ.")
    void forCode_105_returnsPhoneInvalid() {
        assertEquals("Số điện thoại không hợp lệ.", SmsErrorMessages.forCode("105"));
    }

    @Test
    @DisplayName("300 → Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau.")
    void forCode_300_returnsOverload() {
        assertEquals("Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("300"));
    }

    @Test
    @DisplayName("110 → Nội dung tin nhắn không được hỗ trợ. Vui lòng thử lại sau.")
    void forCode_110_returnsUnsupportedContent() {
        assertEquals("Nội dung tin nhắn không được hỗ trợ. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("110"));
    }

    @Test
    @DisplayName("113 → Nội dung tin nhắn quá dài.")
    void forCode_113_returnsTooLong() {
        assertEquals("Nội dung tin nhắn quá dài.", SmsErrorMessages.forCode("113"));
    }

    @Test
    @DisplayName("101 → Không thể gửi mã xác nhận. Vui lòng thử lại sau.")
    void forCode_101_returnsGeneric() {
        assertEquals("Không thể gửi mã xác nhận. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("101"));
    }

    @Test
    @DisplayName("007 → Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.")
    void forCode_007_returnsUnavailable() {
        assertEquals("Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("007"));
    }

    @Test
    @DisplayName("008 → Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.")
    void forCode_008_returnsUnavailable() {
        assertEquals("Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("008"));
    }

    @Test
    @DisplayName("009 → Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.")
    void forCode_009_returnsUnavailable() {
        assertEquals("Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("009"));
    }

    @Test
    @DisplayName("500 → Không thể gửi mã xác nhận. Vui lòng thử lại sau.")
    void forCode_500_returnsGeneric() {
        assertEquals("Không thể gửi mã xác nhận. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("500"));
    }

    @Test
    @DisplayName("999 (không biết) → message mặc định")
    void forCode_unknown_returnsGeneric() {
        assertEquals("Không thể gửi mã xác nhận. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode("999"));
    }

    @Test
    @DisplayName("null → message mặc định")
    void forCode_null_returnsGeneric() {
        assertEquals("Không thể gửi mã xác nhận. Vui lòng thử lại sau.",
                SmsErrorMessages.forCode(null));
    }

    @Test
    @DisplayName("code có khoảng trắng thừa vẫn match")
    void forCode_withWhitespace_trimsCode() {
        assertEquals("Số điện thoại không hợp lệ.", SmsErrorMessages.forCode(" 105 "));
    }
}

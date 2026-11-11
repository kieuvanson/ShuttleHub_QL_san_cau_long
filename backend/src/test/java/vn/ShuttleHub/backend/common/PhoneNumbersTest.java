package vn.ShuttleHub.backend.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Test chuẩn hoá số điện thoại về E.164.
 *
 * ⚠️ Vì sao quan trọng: nếu user gõ "+84912345678" ở ô "Gửi mã" nhưng
 * "0912345678" ở form đăng ký → OTP không khớp → "Mã OTP không tồn tại",
 * và user có thể đăng ký 2 tài khoản cho cùng 1 số.
 */
class PhoneNumbersTest {

    @Test
    @DisplayName("0912345678 → 84912345678")
    void normalize_nationalFormat_returnsE164() {
        assertEquals("84912345678", PhoneNumbers.normalize("0912345678"));
    }

    @Test
    @DisplayName("+84912345678 → 84912345678")
    void normalize_internationalWithPlus_returnsE164() {
        assertEquals("84912345678", PhoneNumbers.normalize("+84912345678"));
    }

    @Test
    @DisplayName("84912345678 → 84912345678 (giữ nguyên)")
    void normalize_alreadyE164_returnsUnchanged() {
        assertEquals("84912345678", PhoneNumbers.normalize("84912345678"));
    }

    @Test
    @DisplayName("912345678 → 84912345678")
    void normalize_withoutLeadingZero_returnsE164() {
        assertEquals("84912345678", PhoneNumbers.normalize("912345678"));
    }

    @Test
    @DisplayName("0912 345 678 → 84912345678 (bỏ khoảng trắng)")
    void normalize_stripsSpaces() {
        assertEquals("84912345678", PhoneNumbers.normalize("0912 345 678"));
    }

    @Test
    @DisplayName("0912-345-678 → 84912345678 (bỏ gạch nối)")
    void normalize_stripsDashes() {
        assertEquals("84912345678", PhoneNumbers.normalize("0912-345-678"));
    }

    @Test
    @DisplayName("+84 912 345 678 → 84912345678")
    void normalize_stripsSpacesAndPlus() {
        assertEquals("84912345678", PhoneNumbers.normalize("+84 912 345 678"));
    }

    @Test
    @DisplayName("840912345678 → 84912345678 (số 10 số kiểu cũ)")
    void normalize_legacyTenDigitNumber_returnsE164() {
        assertEquals("84912345678", PhoneNumbers.normalize("840912345678"));
    }

    @Test
    @DisplayName("09123456789 → 84912345678 (số 10 số kiểu cũ bỏ số 0 thứ 3)")
    void normalize_legacyNationalTenDigit_returnsE164() {
        assertEquals("84912345678", PhoneNumbers.normalize("09123456789"));
    }

    @Test
    @DisplayName("null → null")
    void normalize_null_returnsNull() {
        assertNull(PhoneNumbers.normalize(null));
    }

    @Test
    @DisplayName("\"\" → null")
    void normalize_empty_returnsNull() {
        assertNull(PhoneNumbers.normalize(""));
    }

    @Test
    @DisplayName("\"12345\" → null (quá ngắn)")
    void normalize_tooShort_returnsNull() {
        assertNull(PhoneNumbers.normalize("12345"));
    }

    @Test
    @DisplayName("\"abcdefghij\" → null (không phải số)")
    void normalize_nonNumeric_returnsNull() {
        assertNull(PhoneNumbers.normalize("abcdefghij"));
    }
}

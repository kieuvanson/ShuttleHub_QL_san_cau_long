package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test chuẩn hoá số điện thoại tại biên DTO.
 *
 * ⚠️ Compact constructor của record chạy LÚC Jackson deserialize, tức là
 * TRƯỚC khi Bean Validation chạy → giá trị đã chuẩn hoá mới được validate.
 */
class PhoneNormalizationDtoTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        if (factory != null) {
            factory.close();
        }
    }

    @Test
    @DisplayName("SendOtpRequest chuẩn hoá \"0912 345 678\" → \"84912345678\"")
    void sendOtpRequest_normalizesPhone() {
        assertEquals("84912345678", new SendOtpRequest("0912 345 678").phone());
    }

    @Test
    @DisplayName("RegisterRequest chuẩn hoá \"+84912345678\" → \"84912345678\"")
    void registerRequest_normalizesPhone() {
        RegisterRequest req = new RegisterRequest(
            "Nguyễn A", "a@b.com", "+84912345678", "matkhau", "123456", "user01"
        );
        assertEquals("84912345678", req.phone());
    }

    @Test
    @DisplayName("SendOtpRequest với SĐT sai định dạng → null")
    void sendOtpRequest_invalidPhone_becomesNull() {
        assertNull(new SendOtpRequest("abc").phone());
    }

    @Test
    @DisplayName("SĐT đã chuẩn hoá vẫn vượt qua validation @Pattern")
    void sendOtpRequest_normalizedPhone_passesValidation() {
        assertTrue(validator.validate(new SendOtpRequest("0912345678")).isEmpty(),
                "SĐT sau chuẩn hoá phải pass validation");
    }

    @Test
    @DisplayName("SĐT sai định dạng bị validation chặn")
    void sendOtpRequest_invalidPhone_failsValidation() {
        assertEquals(1, validator.validate(new SendOtpRequest("abc")).size(),
                "SĐT không chuẩn hoá được phải bị validation chặn");
    }
}

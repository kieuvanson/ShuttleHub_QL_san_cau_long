package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import vn.ShuttleHub.backend.common.PhoneNumbers;

import java.util.Locale;

/**
 * Yêu cầu hoàn thiện hồ sơ cho user đăng nhập bằng Facebook.
 *
 * ⚠️ Vì sao Facebook phải hoàn thiện hồ sơ?
 *   Facebook KHÔNG cung cấp cờ `email_verified` → ta không thể tin email
 *   mà Facebook trả về. Nên ta yêu cầu user tự nhập email + SĐT (verify OTP)
 *   để xác minh danh tính thật, tránh việc chiếm đoạt tài khoản.
 */
public record FacebookCompleteRequest(
        @NotBlank(message = "Ticket không được để trống")
        String ticket,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email chưa đúng định dạng")
        String email,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^84[0-9]{9}$", message = "Số điện thoại chưa hợp lệ")
        String phone,

        @NotBlank(message = "Mã OTP không được để trống")
        @Pattern(regexp = "^[0-9]{6}$", message = "Mã OTP phải là 6 chữ số")
        String otp
) {
    /**
     * Chuẩn hoá TRƯỚC khi validate — cùng pattern với RegisterRequest.
     */
    public FacebookCompleteRequest {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        phone = PhoneNumbers.normalize(phone);
    }
}

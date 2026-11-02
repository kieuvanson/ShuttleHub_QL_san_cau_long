package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record RegisterRequest(
    @NotBlank(message = "Họ tên không được để trống")
    @Size(min = 2, max = 100, message = "Họ tên phải từ 2 đến 100 ký tự")
    String fullName,

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email chưa đúng định dạng")
    String email,

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
        regexp = "^(0|\\+84)[0-9]{9,10}$",
        message = "Số điện thoại chưa hợp lệ"
    )
    String phone,

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 100, message = "Mật khẩu phải từ 6 đến 100 ký tự")
    String password,

    @NotBlank(message = "Mã OTP không được để trống")
    @Pattern(regexp = "^[0-9]{6}$", message = "Mã OTP phải là 6 chữ số")
    String otp,

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Tên đăng nhập chỉ gồm chữ, số, gạch dưới")
    String username
) {
    /**
     * Compact constructor: chuẩn hoá input TRƯỚC khi Bean Validation chạy.
     *
     * ⚠️ Vì sao cần?
     * Jackson gọi constructor này khi deserialize JSON → record được tạo với
     * giá trị ĐÃ chuẩn hoá → sau đó @Email mới validate.
     *
     * Nếu không chuẩn hoá ở đây, "@Email" sẽ fail với input
     * "  Test@ABC.com  " (có space) dù user chỉ lỡ tay gõ thừa space.
     */
    public RegisterRequest {
        email = normalizeEmail(email);
        username = username == null ? null : username.trim();
        phone = phone == null ? null : phone.trim();
        fullName = fullName == null ? null : fullName.trim();
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}

package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record LoginRequest(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email chưa đúng định dạng")
    String email,

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 100, message = "Mật khẩu không hợp lệ")
    String password
) {
    /**
     * Chuẩn hoá email trước khi validate (xem giải thích ở RegisterRequest).
     */
    public LoginRequest {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}

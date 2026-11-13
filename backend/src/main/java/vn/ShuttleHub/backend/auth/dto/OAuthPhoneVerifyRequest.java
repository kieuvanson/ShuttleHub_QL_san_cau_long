package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import vn.ShuttleHub.backend.common.PhoneNumbers;

/**
 * Yêu cầu xác minh SĐT khi Facebook KHÔNG chia sẻ email.
 *
 * ⚠️ Vì sao SĐT + OTP thay vì email tự khai?
 *   Nếu bắt user tự nhập email → kẻ xấu khai email người khác để chiếm
 *   chỗ tài khoản đó trước khi chủ sở hữu thật đăng ký.
 *   SĐT + OTP SMS là bằng chứng sở hữu thật, và `users.phone_number`
 *   UNIQUE → không ai chiếm chỗ được.
 */
public record OAuthPhoneVerifyRequest(
        @NotBlank(message = "Ticket không được để trống")
        String ticket,

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
    public OAuthPhoneVerifyRequest {
        phone = PhoneNumbers.normalize(phone);
    }
}

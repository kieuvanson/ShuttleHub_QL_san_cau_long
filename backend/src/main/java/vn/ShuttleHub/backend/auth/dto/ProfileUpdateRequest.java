package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import vn.ShuttleHub.backend.common.PhoneNumbers;

import java.util.Locale;

/**
 * Yêu cầu cập nhật hồ sơ — endpoint PUT /api/auth/profile.
 *
 * ⚠️ Mọi trường đều TUỢ CHỌN — user chỉ gửi những gì muốn đổi.
 *   • `phone` có giá trị → BẮT BUỘC kèm `otp` hợp lệ (chứng minh sở hữu SĐT).
 *   • Đổi email khi user CHƯA có SĐT → cũng bắt buộc `phone` + `otp` trong
 *     cùng request, nếu không user có thể chiếm email người khác.
 */
public record ProfileUpdateRequest(
        @Email(message = "Email chưa đúng định dạng")
        String email,

        @Pattern(regexp = "^84[0-9]{9}$", message = "Số điện thoại chưa hợp lệ")
        String phone,

        @Pattern(regexp = "^[0-9]{6}$", message = "Mã OTP phải là 6 chữ số")
        String otp
) {
    /**
     * Chuẩn hoá TRƯỚC khi validate — cùng pattern với RegisterRequest.
     */
    public ProfileUpdateRequest {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        phone = PhoneNumbers.normalize(phone);
    }
}

package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import vn.ShuttleHub.backend.common.PhoneNumbers;

public record SendOtpRequest(
    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
        regexp = "^84[0-9]{9}$",
        message = "Số điện thoại chưa hợp lệ (VD: 0912345678)"
    )
    String phone
) {
    /**
     * Compact constructor: chuẩn hoá SĐT TRƯỚC khi Bean Validation chạy.
     *
     * ⚠️ Vì sao?
     * Jackson gọi constructor này lúc deserialize JSON → record được tạo với
     * giá trị ĐÃ chuẩn hoá về E.164 ("84912345678") → sau đó @Pattern mới
     * validate. Nếu không chuẩn hoá ở đây, cùng một số điện thoại sẽ được
     * lưu dưới nhiều dạng → OTP không khớp + đăng ký trùng tài khoản.
     */
    public SendOtpRequest {
        phone = PhoneNumbers.normalize(phone);
    }
}

package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SendOtpRequest(
    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
        regexp = "^(0|\\+84)[0-9]{9,10}$",
        message = "Số điện thoại chưa hợp lệ (VD: 0912345678)"
    )
    String phone
) {}

package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthExchangeRequest(
        @NotBlank(message = "Ticket không được để trống")
        String ticket
) {}

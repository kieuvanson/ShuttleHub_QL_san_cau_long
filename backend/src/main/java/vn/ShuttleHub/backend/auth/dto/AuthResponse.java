package vn.ShuttleHub.backend.auth.dto;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String tokenType,    // "Bearer"
    long expiresIn,      // giây, ví dụ 900 = 15 phút
    UserDto user
) {}

package vn.ShuttleHub.backend.auth.dto;

import java.time.LocalDateTime;

public record UserDto(
    String id,
    String username,
    String email,
    String fullName,
    String phone,
    String role,
    LocalDateTime createdAt
) {}

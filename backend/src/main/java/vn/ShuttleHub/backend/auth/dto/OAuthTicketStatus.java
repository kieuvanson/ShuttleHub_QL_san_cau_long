package vn.ShuttleHub.backend.auth.dto;

/**
 * Trạng thái của ticket — frontend dùng để biết cần làm gì tiếp.
 */
public record OAuthTicketStatus(
        String status,      // "READY" | "NEEDS_PROFILE"
        String provider,
        String fullName
) {
    public static final String READY = "READY";
    public static final String NEEDS_PROFILE = "NEEDS_PROFILE";
}

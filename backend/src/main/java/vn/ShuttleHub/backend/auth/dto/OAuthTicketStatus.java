package vn.ShuttleHub.backend.auth.dto;

/**
 * Trạng thái của ticket — frontend dùng để biết cần làm gì tiếp.
 */
public record OAuthTicketStatus(
        String status,      // "READY" | "NEEDS_PHONE"
        String provider,
        String fullName
) {
    public static final String READY = "READY";
    public static final String NEEDS_PHONE = "NEEDS_PHONE";
}

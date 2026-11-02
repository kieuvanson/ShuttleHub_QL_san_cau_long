package vn.ShuttleHub.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Bảng lưu refresh token để thực hiện ROTATION.
 *
 * Mỗi lần gọi /api/auth/refresh:
 *   • token cũ bị đánh dấu revoked (hoặc xoá)
 *   • token mới được cấp
 *
 * Nếu một token đã bị revoke lại được dùng → phát hiện token bị trộm
 * → toàn bộ session của user bị vô hiệu hoá.
 *
 * tokenHash: chỉ lưu SHA-256 hash, KHÔNG lưu token gốc.
 */
@Entity
@Table(
    name = "refresh_tokens",
    indexes = {
        @Index(name = "idx_refresh_user", columnList = "user_id"),
        @Index(name = "idx_refresh_expires", columnList = "expires_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private String id;

    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    /** SHA-256 hash của refresh token (hex string, 64 ký tự) */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "revoked", nullable = false)
    @Builder.Default
    private Boolean revoked = false;

    /** Token đã bị thay thế bởi token mới (dùng để phát hiện token bị trộm) */
    @Column(name = "replaced_by")
    private String replacedBy;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
}

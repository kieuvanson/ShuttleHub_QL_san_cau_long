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
 * Ticket dùng-một-lần để trao JWT cho frontend sau OAuth callback.
 *
 * Vòng đời: sinh ra sau callback → frontend đọc từ URL → đổi lấy JWT →
 * đánh dấu used=true. Hết hạn sau 60 giây.
 */
@Entity
@Table(
    name = "oauth_tickets",
    indexes = {
        @Index(name = "idx_oauth_tickets_expires_at", columnList = "expires_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OAuthTicket {

    @Id
    @Column(name = "ticket", length = 64)
    private String ticket;

    /** NULL = ticket đang chờ user hoàn thiện hồ sơ (Facebook) */
    @Column(name = "user_id", length = 255)
    private String userId;

    @Column(name = "provider", nullable = false, length = 20)
    private String provider;

    @Column(name = "provider_user_id", nullable = false, length = 255)
    private String providerUserId;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "avatar_url", length = 500)
    // ⚠️ Vì sao ticket cũng cần avatar? Nhánh Facebook không trả email →
    //   user phải xác minh SĐT bằng OTP trước khi tạo tài khoản. Avatar
    //   phải sống sót qua bước chờ đó → mang theo trong ticket.
    private String avatarUrl;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used", nullable = false)
    @Builder.Default
    private Boolean used = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

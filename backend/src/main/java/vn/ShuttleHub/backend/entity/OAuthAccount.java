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
 * Liên kết tài khoản OAuth (Google/Facebook) với user trong hệ thống.
 *
 * ⚠️ Không lưu token của provider — chỉ lưu định danh (provider + id).
 * Token provider là thứ không bao giờ được phép chạm tới DB của ta:
 * nó có thể bị đánh cắp và dùng để truy cập tài khoản Google/Facebook
 * của user ngoài hệ thống của mình.
 */
@Entity
@Table(
    name = "oauth_accounts",
    indexes = {
        @Index(name = "idx_oauth_accounts_user_id", columnList = "user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OAuthAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private String id;

    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    /** "google" | "facebook" */
    @Column(name = "provider", nullable = false, length = 20)
    private String provider;

    /** ID user ở phía provider (Google: claim `sub`; Facebook: `id`) */
    @Column(name = "provider_user_id", nullable = false, length = 255)
    private String providerUserId;

    /** Email tại thời điểm liên kết — dùng để đối chiếu khi user đổi email */
    @Column(name = "email_at_registration", length = 100)
    private String emailAtRegistration;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

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
 * Ghi lại mỗi lần user thử đăng ký tài khoản.
 *
 * ⚠️ Vì sao cần bảng riêng, không dùng bảng `users`?
 * Bảng `users` chỉ chứa user ĐĂNG KÝ THÀNH CÔNG. Kẻ spam dùng 1 số điện
 * thoại để đăng ký nhiều tài khoản → `users` sẽ chặn (unique phone) nhưng
 * vẫn tốn 1 tin SMS cho MỖI lần đăng ký thất bại → đốt tiền tài khoản.
 * Bảng này đếm MỌI lần đăng ký để chặn đốt tiền.
 */
@Entity
@Table(
    name = "registration_attempts",
    indexes = {
        @Index(name = "idx_reg_attempt_phone_created", columnList = "phone, created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private String id;

    /** Số điện thoại đã chuẩn hoá E.164. */
    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

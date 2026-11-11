package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.entity.RegistrationAttempt;
import vn.ShuttleHub.backend.repository.RegistrationAttemptRepository;

import java.time.LocalDateTime;

/**
 * Đếm & ghi số lần đăng ký tài khoản theo số điện thoại.
 *
 * ⚠️ Mục đích: chặn spam đăng ký. Kẻ xấu có 1 SIM rác nhưng vẫn đăng ký
 * hàng loạt tài khoản được (mỗi lần dùng 1 email khác) → vừa đốt tiền SMS
 * vừa làm bẩn database. Giới hạn theo IP KHÔNG chặn được vì mỗi request
 * đến từ IP khác nhau (proxy/VPN).
 */
@Service
@RequiredArgsConstructor
public class RegistrationAttemptService {

    /** Cửa sổ đếm: 24 giờ tính lùi. */
    private static final int WINDOW_HOURS = 24;

    /** Giữ lại bản ghi tối đa 7 ngày rồi xoá (dọn lười). */
    private static final int RETENTION_DAYS = 7;

    private final RegistrationAttemptRepository repo;

    /**
     * Đếm số lần đăng ký của SĐT trong 24h gần nhất.
     *
     * ⚠️ Đồng thời xoá bản ghi cũ hơn 7 ngày (dọn lười) để bảng không
     * phình vô hạn — không cần job {@code @Scheduled}.
     */
    @Transactional
    public long countRegistrationsInLast24h(String phone) {
        LocalDateTime now = LocalDateTime.now();
        repo.deleteByPhoneAndCreatedAtBefore(phone, now.minusDays(RETENTION_DAYS));
        return repo.countByPhoneAndCreatedAtAfter(phone, now.minusHours(WINDOW_HOURS));
    }

    /**
     * Ghi lại 1 lần đăng ký.
     *
     * ⚠️ REQUIRES_NEW: lần ghi phải được COMMIT kể cả khi transaction cha
     * (register) rollback sau đó — nếu không, kẻ spam đăng ký lỗi liên tục
     * sẽ không bao giờ bị đếm.
     *
     * ⚠️ Tách class riêng (không gọi {@code this.recordRegistration}) vì
     * Spring quản lý transaction qua PROXY — tự gọi sẽ bỏ qua
     * {@code @Transactional}.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRegistration(String phone) {
        repo.save(RegistrationAttempt.builder()
                .phone(phone)
                .createdAt(LocalDateTime.now())
                .build());
    }
}

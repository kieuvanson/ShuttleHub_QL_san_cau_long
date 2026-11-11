package vn.ShuttleHub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.ShuttleHub.backend.entity.RegistrationAttempt;

import java.time.LocalDateTime;

@Repository
public interface RegistrationAttemptRepository extends JpaRepository<RegistrationAttempt, String> {

    /** Đếm số lần đăng ký của SĐT sau mốc thời gian. */
    long countByPhoneAndCreatedAtAfter(String phone, LocalDateTime after);

    /** Xoá các bản ghi cũ hơn mốc thời gian (dọn lười). */
    long deleteByPhoneAndCreatedAtBefore(String phone, LocalDateTime before);
}

package vn.ShuttleHub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.ShuttleHub.backend.entity.OtpCode;

import java.util.List;
import java.util.Optional;

@Repository
public interface OtpCodeRepository extends JpaRepository<OtpCode, String> {

    /**
     * Tìm OTP mới nhất của SĐT, chưa dùng, còn hạn.
     * Sắp xếp theo createdAt DESC để lấy OTP gửi gần nhất.
     */
    Optional<OtpCode> findFirstByPhoneAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
        String phone, java.time.LocalDateTime now
    );

    /**
     * Đếm số OTP đã gửi cho SĐT trong khoảng thời gian (dùng để rate-limit).
     */
    long countByPhoneAndCreatedAtAfter(String phone, java.time.LocalDateTime after);
}

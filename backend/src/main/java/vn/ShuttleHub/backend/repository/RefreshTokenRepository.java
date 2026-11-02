package vn.ShuttleHub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.ShuttleHub.backend.entity.RefreshToken;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserIdAndRevokedFalse(String userId);

    /**
     * Xoá toàn bộ token đã hết hạn (dọn dẹp định kỳ).
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);

    /**
     * Vô hiệu hoá toàn bộ session của user (dùng khi phát hiện token bị trộm).
     *
     * clearAutomatically = true: xoá các entity đang nằm trong persistence
     * context, tránh đọc được dữ liệu CŨ (đã revoke) trong cùng request.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :now "
        + "WHERE rt.userId = :userId AND rt.revoked = false")
    int revokeAllByUserId(@Param("userId") String userId, @Param("now") LocalDateTime now);
}

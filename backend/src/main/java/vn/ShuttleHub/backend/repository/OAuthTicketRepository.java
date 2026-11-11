package vn.ShuttleHub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.ShuttleHub.backend.entity.OAuthTicket;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OAuthTicketRepository extends JpaRepository<OAuthTicket, String> {

    Optional<OAuthTicket> findByTicket(String ticket);

    @Modifying
    @Query("DELETE FROM OAuthTicket t WHERE t.expiresAt < :cutoff")
    int deleteByExpiresAtBefore(@Param("cutoff") LocalDateTime cutoff);
}

package vn.ShuttleHub.backend.auth.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.repository.OAuthTicketRepository;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test truy vấn & dọn bảng oauth_tickets.
 */
@SpringBootTest
@Transactional
class OAuthTicketRepositoryTest {

    @Autowired
    private OAuthTicketRepository repo;

    @Test
    @DisplayName("Tìm ticket theo chuỗi; deleteByExpiresAtBefore chỉ xoá bản ghi quá ngưỡng")
    void findByTicket_andDeleteExpired() {
        LocalDateTime now = LocalDateTime.now();
        repo.save(OAuthTicket.builder()
                .ticket("fresh-ticket").userId(null).provider("facebook")
                .providerUserId("pid-1").fullName("Nguyen Van A")
                .expiresAt(now.plusSeconds(60)).used(false)
                .createdAt(now).build());
        repo.save(OAuthTicket.builder()
                .ticket("stale-ticket").userId(null).provider("facebook")
                .providerUserId("pid-2").fullName("B")
                .expiresAt(now.minusDays(1)).used(false)
                .createdAt(now.minusDays(1)).build());

        assertTrue(repo.findByTicket("fresh-ticket").isPresent());
        assertTrue(repo.findByTicket("khong-ton-tai").isEmpty());

        // Ngưỡng 7 ngày → bản ghi 1 ngày tuổi chưa bị xoá.
        int deleted = repo.deleteByExpiresAtBefore(now.minusDays(7));
        assertEquals(0, deleted, "bản ghi quá 1 ngày chưa tới ngưỡng dọn 7 ngày");
    }
}

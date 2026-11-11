package vn.ShuttleHub.backend.auth.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.entity.OAuthAccount;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.OAuthAccountRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test ràng buộc UNIQUE (provider, provider_user_id) trên bảng oauth_accounts.
 *
 * ⚠️ Vì sao cần test này?
 * Khi user mở 2 tab đăng nhập Google đồng thời, cả 2 request có thể cùng
 * tới bước "tạo oauth_account" → nếu không có UNIQUE constraint, ta sẽ tạo
 * 2 bản ghi trỏ cùng 1 user. UNIQUE constraint ở DB là lớp bảo vệ CUỐI
 * CÙNG chống race condition này.
 */
@SpringBootTest
@Transactional
class OAuthAccountRepositoryTest {

    @Autowired
    private OAuthAccountRepository repo;

    @Autowired
    private UserRepository userRepo;

    private User newUser(String email) {
        return userRepo.save(User.builder()
                .username("u_" + System.nanoTime())
                .email(email)
                .password("hash")
                .role(Role.CUSTOMER)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    @Test
    @DisplayName("Tìm oauth_account theo (provider, provider_user_id)")
    void findByProviderAndProviderUserId_returnsRow() {
        User u = newUser("a" + System.nanoTime() + "@x.com");
        repo.save(OAuthAccount.builder()
                .userId(u.getId())
                .provider("google")
                .providerUserId("sub-123")
                .emailAtRegistration(u.getEmail())
                .createdAt(LocalDateTime.now())
                .build());

        assertTrue(repo.findByProviderAndProviderUserId("google", "sub-123").isPresent());
        assertTrue(repo.existsByProviderAndProviderUserId("google", "sub-123"));
        assertFalse(repo.existsByProviderAndProviderUserId("facebook", "sub-123"));
    }

    @Test
    @DisplayName("UNIQUE (provider, provider_user_id) — 2 lần đăng nhập song song chỉ tạo 1 bản ghi")
    void duplicateProviderUserId_violatesUniqueConstraint() {
        User u = newUser("b" + System.nanoTime() + "@x.com");
        repo.save(OAuthAccount.builder()
                .userId(u.getId())
                .provider("google")
                .providerUserId("sub-dup")
                .emailAtRegistration(u.getEmail())
                .createdAt(LocalDateTime.now())
                .build());

        assertThrows(DataIntegrityViolationException.class, () -> {
            repo.saveAndFlush(OAuthAccount.builder()
                    .userId(u.getId())
                    .provider("google")
                    .providerUserId("sub-dup")
                    .emailAtRegistration(u.getEmail())
                    .createdAt(LocalDateTime.now())
                    .build());
        });
    }
}

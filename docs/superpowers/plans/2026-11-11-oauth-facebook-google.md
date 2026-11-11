# Đăng nhập OAuth (Google + Facebook) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm đăng nhập bằng Google và Facebook vào hệ thống Cầu Lông dee, dùng luồng redirect qua backend + ticket dùng-một-lần để trao JWT, không đưa token provider hay JWT vào URL.

**Architecture:** Spring Security OAuth2 Client xử lý toàn bộ bước authorize/callback. `OAuthSuccessHandler` sau callback sẽ: tra `oauth_accounts` theo `(provider, provider_user_id)` → nếu có thì dùng user đó; nếu chưa thì tìm user theo email và **chỉ gộp tự động nếu `email_verified=true`** (Facebook không bao giờ đạt điều này → Facebook buộc user hoàn thiện hồ sơ email + SĐT + OTP). Sau đó sinh một `oauth_tickets` row (TTL 60 giây, dùng 1 lần) và redirect về frontend kèm `?ticket=…`; frontend đổi ticket lấy access + refresh token qua `POST /api/auth/oauth/exchange`.

**Tech Stack:** Spring Boot 4.1.1 · Java 25 · Spring Security 7 (OAuth2 Client + OIDC) · `spring-boot-starter-security-oauth2-client` · PostgreSQL + Flyway · JUnit Jupiter + Mockito + AssertJ · React 19 + TypeScript + Vite

**Spec:** `docs/superpowers/specs/2026-11-11-oauth-facebook-google-design.md`

---

## Global Constraints

Áp dụng cho **mọi** task trong plan này:

- **Ngôn ngữ:** comment tiếng Việt, giải thích *tại sao* chứ không phải *cái gì*. Tên biến/hàm/class tiếng Anh.
- **Không dùng `any` trong TypeScript.** Mọi payload API phải có type riêng.
- **Không dùng `fetch` rải rác** — frontend gọi API qua `src/api/client.ts`.
- **Không dùng `localStorage` cho token ở component** — dùng `useAuth()` từ `src/context/AuthContext.tsx`.
- **Backend:** mỗi thay đổi schema = 1 file Flyway mới `V{n}__{snake_case}.sql`. **Không** sửa file migration đã chạy.
- **Backend:** entity dùng Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`, `@Id @GeneratedValue(strategy = GenerationType.UUID)` → `String id`, `@Enumerated(EnumType.STRING)`.
- **Backend:** `@Column(length = …)` đặt độ dài; **không** đặt `@Size` trên field entity.
- **Backend:** comment tiếng Việt; exception riêng trong `auth/exception/`; handler trong `GlobalExceptionHandler`.
- **Bảo mật bất biến:** chỉ provider có `email_verified=true` mới được gộp tự động vào tài khoản đã tồn tại. Facebook **không bao giờ** gộp tự động.
- **Bảo mật bất biến:** JWT không bao giờ nằm trong URL. Chỉ `ticket` (1 lần, TTL 60s) được truyền qua URL.
- **Bảo mật bất biến:** token của provider (Google/Facebook) không bao giờ gửi về frontend.
- **Ghi chú Spring Boot 4:** starter OAuth2 client tên đúng là `spring-boot-starter-security-oauth2-client` (KHÔNG phải `spring-boot-starter-oauth2-client` — bản cũ đã deprecated).
- **Ghi chú Spring Boot 4 / Jackson 3:** dùng `tools.jackson.databind.*`, KHÔNG dùng `com.fasterxml.jackson.databind.*`.
- **Lệnh verify:** backend `cd backend && .\mvnw.cmd -o test`; frontend `cd frontend && .\node_modules\.bin\tsc --noEmit` và `npm run build`.
- **Sau khi xong chức năng:** cập nhật `README.md` (mục "📈 Tiến trình dự án" + "🌐 API Endpoints" + "🚀 Công nghệ sử dụng").

## Review Focus

5 lớp input / failure mode mà spec hàm ý nhưng không task nào test trực tiếp — mỗi dòng dưới đây được ghim bằng một test trong task sở hữu code đó:

1. **Claim `email_verified` trả về dạng chuỗi `"true"` thay vì boolean `true`.** Google đôi khi trả string. Người dùng hợp lệ phải được gộp tài khoản đúng — task 2.
2. **User OAuth đăng nhập bằng email + mật khẩu thường.** Cột `password` NOT NULL → phải lưu hash BCrypt của chuỗi random, ai cũng không đoán được — task 4.
3. **Email của Facebook trùng email đã đăng ký bằng mật khẩu.** Phải báo lỗi (409), KHÔNG gộp, KHÔNG tạo user mới — task 4.
4. **Ticket bị dùng lần 2, hoặc quá 60 giây.** Phải từ chối — task 3.
5. **Hai tab đăng nhập Google cùng lúc với cùng tài khoản.** UNIQUE `(provider, provider_user_id)` phải chặn tạo 2 bản ghi oauth_accounts trỏ cùng 1 user — task 1.

---

## Cấu trúc file

**Tạo mới (backend):**
- `backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthAccount.java` — JPA cho bảng `oauth_accounts`
- `backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthTicket.java` — JPA cho bảng `oauth_tickets`
- `backend/src/main/java/vn/ShuttleHub/backend/repository/OAuthAccountRepository.java`
- `backend/src/main/java/vn/ShuttleHub/backend/repository/OAuthTicketRepository.java`
- `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfo.java` — record chuẩn hoá thông tin provider
- `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractor.java` — đọc claim → `OAuthUserInfo`
- `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketService.java` — sinh/đọi/hủy ticket
- `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java` — nghiệp vụ tìm-tạo-gộp user
- `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java` — REST endpoints
- `backend/src/main/java/vn/ShuttleHub/backend/config/OAuthSuccessHandler.java`
- `backend/src/main/java/vn/ShuttleHub/backend/config/OAuthFailureHandler.java`
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java` — DTO trạng thái ticket
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthExchangeRequest.java`
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/FacebookCompleteRequest.java`
- `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/OAuthTicketException.java`

**Sửa (backend):**
- `backend/pom.xml` — thêm starter OAuth2 client
- `backend/src/main/resources/application.properties` + `.template` — cấu hình OAuth
- `backend/src/main/java/vn/ShuttleHub/backend/config/SecurityConfig.java` — `.oauth2Login()`, permitAll
- `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java` — thêm `createOAuthUser()` + `issueTokens()`
- `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthCleanupService.java` — thêm job dọn ticket
- `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/GlobalExceptionHandler.java` — handler mới

**Tạo mới (migration):**
- `backend/src/main/resources/db/migration/V7__create_oauth_accounts.sql`
- `backend/src/main/resources/db/migration/V8__create_oauth_tickets.sql`

**Tạo mới (frontend):**
- `frontend/src/pages/OAuthCallbackPage.tsx` + `.css`
- `frontend/src/pages/FacebookCompletePage.tsx` + `.css`

**Sửa (frontend):**
- `frontend/src/api/auth.ts` — thêm 4 hàm OAuth + types
- `frontend/src/api/types.ts` — thêm types
- `frontend/src/context/AuthContext.tsx` — thêm `loginWithTicket()`
- `frontend/src/pages/AuthPage.tsx` — nút social thật
- `frontend/src/main.tsx` — 2 route mới

---

## Task 1: Schema + entity + repository cho OAuth

**Files:**
- Create: `backend/src/main/resources/db/migration/V7__create_oauth_accounts.sql`
- Create: `backend/src/main/resources/db/migration/V8__create_oauth_tickets.sql`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthAccount.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthTicket.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/repository/OAuthAccountRepository.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/repository/OAuthTicketRepository.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthCleanupService.java`

**Interfaces:**
- Consumes: (không — task đầu tiên)
- Produces:
  - `OAuthAccount`: `getId()`, `getUserId()`, `getProvider()`, `getProviderUserId()`, `getEmailAtRegistration()`, `getCreatedAt()`
  - `OAuthAccountRepository`: `Optional<OAuthAccount> findByProviderAndProviderUserId(String provider, String providerUserId)`, `boolean existsByProviderAndProviderUserId(String provider, String providerUserId)`
  - `OAuthTicket`: `getTicket()`, `getUserId()`, `getProvider()`, `getProviderUserId()`, `getFullName()`, `getExpiresAt()`, `getUsed()`, `getCreatedAt()`
  - `OAuthTicketRepository`: `Optional<OAuthTicket> findByTicket(String ticket)`, `int deleteByExpiresAtBefore(LocalDateTime cutoff)`

- [ ] **Step 1: Viết test migration + entity mapping**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/repository/OAuthAccountRepositoryTest.java`:

```java
package vn.ShuttleHub.backend.auth.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.entity.OAuthAccount;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.OAuthAccountRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class OAuthAccountRepositoryTest {

    @Autowired private OAuthAccountRepository repo;
    @Autowired private UserRepository userRepo;

    private User newUser(String email) {
        return userRepo.save(User.builder()
                .username("u_" + System.nanoTime())
                .email(email)
                .password("hash")
                .role(vn.ShuttleHub.backend.entity.Role.CUSTOMER)
                .isActive(true)
                .createdAt(java.time.LocalDateTime.now())
                .updatedAt(java.time.LocalDateTime.now())
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
                .createdAt(java.time.LocalDateTime.now())
                .build());

        assertTrue(repo.findByProviderAndProviderUserId("google", "sub-123").isPresent());
        assertTrue(repo.existsByProviderAndProviderUserId("google", "sub-123"));
        assertFalse(repo.existsByProviderAndProviderUserId("facebook", "sub-123"));
    }

    @Test
    @DisplayName("UNIQUE (provider, provider_user_id) — 2 lần đăng nhập song song chỉ tạo 1 bản ghi")
    void duplicateProviderUserId_violatesUniqueConstraint() {
        User u = newUser("b" + System.nanoTime() + "@x.com");
        repo.save(OAuthAccount.builder().userId(u.getId()).provider("google")
                .providerUserId("sub-dup").emailAtRegistration(u.getEmail())
                .createdAt(java.time.LocalDateTime.now()).build());

        assertThrows(DataIntegrityViolationException.class, () -> {
            repo.saveAndFlush(OAuthAccount.builder().userId(u.getId()).provider("google")
                    .providerUserId("sub-dup").emailAtRegistration(u.getEmail())
                    .createdAt(java.time.LocalDateTime.now()).build());
        });
    }
}
```

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/repository/OAuthTicketRepositoryTest.java`:

```java
package vn.ShuttleHub.backend.auth.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.repository.OAuthTicketRepository;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class OAuthTicketRepositoryTest {

    @Autowired private OAuthTicketRepository repo;

    @Test
    @DisplayName("Tìm ticket theo chuỗi; deleteByExpiresAtBefore xoá đúng các bản ghi quá hạn")
    void findByTicket_andDeleteExpired() {
        LocalDateTime now = LocalDateTime.now();
        OAuthTicket fresh = repo.save(OAuthTicket.builder()
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

        int deleted = repo.deleteByExpiresAtBefore(now.minusDays(7));
        assertEquals(0, deleted, "bản ghi quá 1 ngày chưa tới ngưỡng dọn 7 ngày");
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthAccountRepositoryTest,OAuthTicketRepositoryTest"
```
Expected: FAIL — compile error vì `OAuthAccount`, `OAuthTicket`, `OAuthAccountRepository`, `OAuthTicketRepository` chưa tồn tại.

- [ ] **Step 3: Viết migration V7 + V8**

`backend/src/main/resources/db/migration/V7__create_oauth_accounts.sql`:

```sql
-- =====================================================================
-- V7__create_oauth_accounts.sql
-- Bảng liên kết tài khoản OAuth (Google/Facebook) với user trong hệ thống.
--
-- ⚠️ Vì sao cần bảng riêng (không thêm cột provider vào bảng users)?
--   - 1 user có thể gắn N provider (đăng nhập bằng Google VÀ Facebook).
--   - UNIQUE (provider, provider_user_id) chặn việc 1 provider-user bị
--     gắn vào 2 account khác nhau — đây là lớp bảo vệ CUỐI CÙNG chống
--     race condition khi user mở 2 tab đăng nhập Google đồng thời.
--   - email_at_registration lưu lại email tại thời điểm liên kết để
--     đối chiếu khi user đổi email.
-- =====================================================================

CREATE TABLE oauth_accounts (
    id                     VARCHAR(255)  PRIMARY KEY,
    user_id                VARCHAR(255)  NOT NULL REFERENCES users(id),
    provider               VARCHAR(20)   NOT NULL,
    provider_user_id       VARCHAR(255)  NOT NULL,
    email_at_registration  VARCHAR(100),
    created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT oauth_accounts_provider_uid_unique UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
```

`backend/src/main/resources/db/migration/V8__create_oauth_tickets.sql`:

```sql
-- =====================================================================
-- V8__create_oauth_tickets.sql
-- Bảng ticket dùng-một-lần để trao JWT cho frontend sau OAuth callback.
--
-- ⚠️ Vì sao không đưa thẳng JWT vào URL?
--   URL nằm trong browser history, log access của nginx/APM, và header
--   Referer khi user bấm link ra ngoài. Ticket thì vô hại khi lộ:
--   chỉ dùng được 1 lần, hết hạn sau 60 giây, không chứa PII.
--
-- user_id NULL = ticket đang chờ user hoàn thiện hồ sơ (Facebook).
-- =====================================================================

CREATE TABLE oauth_tickets (
    ticket            VARCHAR(64)   PRIMARY KEY,
    user_id           VARCHAR(255)  REFERENCES users(id),
    provider          VARCHAR(20)   NOT NULL,
    provider_user_id  VARCHAR(255)  NOT NULL,
    full_name         VARCHAR(100),
    expires_at        TIMESTAMP     NOT NULL,
    used              BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oauth_tickets_expires_at ON oauth_tickets(expires_at);
```

- [ ] **Step 4: Viết entity**

`backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthAccount.java`:

```java
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
 * Token provider là thứ không bao giờ được phép chạm tới DB của ta.
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
```

`backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthTicket.java`:

```java
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

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used", nullable = false)
    @Builder.Default
    private Boolean used = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
```

- [ ] **Step 5: Viết repository**

`backend/src/main/java/vn/ShuttleHub/backend/repository/OAuthAccountRepository.java`:

```java
package vn.ShuttleHub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.ShuttleHub.backend.entity.OAuthAccount;

import java.util.Optional;

@Repository
public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, String> {

    Optional<OAuthAccount> findByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByProviderAndProviderUserId(String provider, String providerUserId);
}
```

`backend/src/main/java/vn/ShuttleHub/backend/repository/OAuthTicketRepository.java`:

```java
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
```

- [ ] **Step 6: Thêm job dọn ticket vào AuthCleanupService**

Sửa `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthCleanupService.java`:

- Thêm field `private final OAuthTicketRepository oauthTicketRepo;` (Lombok `@RequiredArgsConstructor` sẽ inject).
- Thêm method:

```java
    /**
     * Xoá ticket OAuth quá 7 ngày — chạy cùng lịch 03:00.
     *
     * ⚠️ Giữ 7 ngày (không phải 60 giây như TTL) vì ticket hết hạn vẫn
     * còn giá trị để điều tra sự cố. Bảng nhỏ nên không tốn tài nguyên.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpiredOAuthTickets() {
        int deleted = oauthTicketRepo.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(7));
        if (deleted > 0) {
            log.info("[Auth cleanup] Đã xoá {} OAuth ticket cũ.", deleted);
        }
    }
```

- [ ] **Step 7: Chạy test để xác nhận PASS**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthAccountRepositoryTest,OAuthTicketRepositoryTest,AuthCleanupServiceTest"
```
Expected: PASS. Migration V7/V8 được Flyway apply tự động khi context Spring khởi động.

- [ ] **Step 8: Commit**

```powershell
git add backend/src/main/resources/db/migration backend/src/main/java/vn/ShuttleHub/backend/entity backend/src/main/java/vn/ShuttleHub/backend/repository backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthCleanupService.java backend/src/test/java/vn/ShuttleHub/backend/auth/repository
git commit -m "feat(auth): them bang oauth_accounts + oauth_tickets cho dang nhap OAuth"
```

---

## Task 2: OAuthUserInfoExtractor — đọc claim từ provider

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfo.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractor.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractorTest.java`

**Interfaces:**
- Consumes: (không)
- Produces:
  - `record OAuthUserInfo(String provider, String providerUserId, String email, boolean emailVerified, String fullName)`
  - `OAuthUserInfoExtractor.extract(OAuth2User user, String registrationId) -> OAuthUserInfo`

- [ ] **Step 1: Viết test failing**

`backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractorTest.java`:

```java
package vn.ShuttleHub.backend.auth.oauth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class OAuthUserInfoExtractorTest {

    private final OAuthUserInfoExtractor extractor = new OAuthUserInfoExtractor();

    private OAuth2User googleUser(Map<String, Object> claims) {
        return new OAuth2User(claims, List.of(new OAuth2UserAuthority("ROLE_USER")), "sub");
    }

    @Test
    @DisplayName("Google: email_verified=true (boolean) → emailVerified = true")
    void google_booleanTrue_verified() {
        OAuth2User u = googleUser(Map.of(
                "sub", "123",
                "email", "a@b.com",
                "email_verified", true,
                "name", "Nguyen Van A"));

        OAuthUserInfo info = extractor.extract(u, "google");

        assertEquals("google", info.provider());
        assertEquals("123", info.providerUserId());
        assertEquals("a@b.com", info.email());
        assertTrue(info.emailVerified());
        assertEquals("Nguyen Van A", info.fullName());
    }

    @Test
    @DisplayName("Google: email_verified là CHUỖI \"true\" → vẫn phải verified = true")
    void google_stringTrue_verified() {
        // ⚠️ Google đôi khi trả claim dạng string thay vì boolean.
        OAuth2User u = googleUser(Map.of(
                "sub", "123",
                "email", "a@b.com",
                "email_verified", "true",
                "name", "Nguyen Van A"));

        assertTrue(extractor.extract(u, "google").emailVerified());
    }

    @Test
    @DisplayName("Google: email_verified=false → emailVerified = false")
    void google_false_notVerified() {
        OAuth2User u = googleUser(Map.of(
                "sub", "123", "email", "a@b.com", "email_verified", false));

        assertFalse(extractor.extract(u, "google").emailVerified());
    }

    @Test
    @DisplayName("Google: thiếu email_verified → emailVerified = false (KHÔNG đoán)")
    void google_missingVerified_notVerified() {
        OAuth2User u = googleUser(Map.of("sub", "123", "email", "a@b.com"));

        assertFalse(extractor.extract(u, "google").emailVerified());
    }

    @Test
    @DisplayName("Facebook: KHÔNG BAO GIỜ verified, kể cả khi provider gửi email_verified=true")
    void facebook_neverVerified() {
        // ⚠️ Đây là bảo mật cốt lõi: Facebook không chứng minh được sở hữu
        // email. Nếu ta tin claim này thì kẻ xấu chiếm đoạt được tài khoản.
        OAuth2User u = new OAuth2User(
                Map.of("id", "fb-999", "email", "victim@b.com", "email_verified", true, "name", "Attacker"),
                List.of(new OAuth2UserAuthority("ROLE_USER")), "id");

        OAuthUserInfo info = extractor.extract(u, "facebook");

        assertEquals("facebook", info.provider());
        assertEquals("fb-999", info.providerUserId());
        assertFalse(info.emailVerified(), "Facebook KHÔNG BAO GIỜ được coi là đã xác minh email");
        assertEquals("victim@b.com", info.email());
    }

    @Test
    @DisplayName("Facebook: thiếu email → email = null (không lỗi)")
    void facebook_missingEmail_null() {
        OAuth2User u = new OAuth2User(
                Map.of("id", "fb-999", "name", "Nam"),
                List.of(new OAuth2UserAuthority("ROLE_USER")), "id");

        OAuthUserInfo info = extractor.extract(u, "facebook");

        assertNull(info.email());
        assertEquals("Nam", info.fullName());
    }

    @Test
    @DisplayName("providerUserId lấy từ attributeName (Google=sub, Facebook=id)")
    void providerUserId_fromAttributeName() {
        OAuth2User u = new OAuth2User(
                Map.of("id", "fb-777"),
                List.of(new OAuth2UserAuthority("ROLE_USER")), "id");

        assertEquals("fb-777", extractor.extract(u, "facebook").providerUserId());
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthUserInfoExtractorTest"
```
Expected: FAIL — compile error, `OAuthUserInfo` / `OAuthUserInfoExtractor` chưa tồn tại.

- [ ] **Step 3: Viết OAuthUserInfo record**

`backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfo.java`:

```java
package vn.ShuttleHub.backend.auth.oauth;

/**
 * Thông tin user đã chuẩn hoá từ provider.
 *
 * ⚠️ `emailVerified` là trường QUAN TRỌNG NHẤT — nó quyết định có được
 * phép gộp vào tài khoản đã tồn tại hay không. Chỉ Google trả trường này
 * một cách đáng tin cậy; Facebook luôn = false.
 */
public record OAuthUserInfo(
        String provider,
        String providerUserId,
        String email,
        boolean emailVerified,
        String fullName
) {
    /** Provider duy nhất được phép cung cấp cờ email_verified đáng tin. */
    public static final String GOOGLE = "google";
    public static final String FACEBOOK = "facebook";
}
```

- [ ] **Step 4: Viết OAuthUserInfoExtractor**

`backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractor.java`:

```java
package vn.ShuttleHub.backend.auth.oauth;

import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Chuyển dữ liệu thô từ provider về {@link OAuthUserInfo} đã chuẩn hoá.
 *
 * ⚠️ Quy tắc bảo mật cốt lõi:
 *   Chỉ provider trong {@link #TRUSTED_EMAIL_VERIFICATION_PROVIDERS} mới
 *   được coi là "email đã xác minh". Facebook KHÔNG có trong danh sách này
 *   vì Graph API không cung cấp cờ email_verified — nếu tin claim đó thì
 *   kẻ xấu có thể dùng một tài khoản Facebook bất kỳ để chiếm đoạt tài
 *   khoản của người khác (email trùng → tự động gộp → chiếm tài khoản).
 */
@Component
public class OAuthUserInfoExtractor {

    /**
     * Provider được phép coi là đã xác minh email.
     * Thêm provider mới vào đây ⇒ phải chắc chắn provider đó thực sự
     * xác minh quyền sở hữu email (có `email_verified` từ nguồn đáng tin).
     */
    private static final java.util.Set<String> TRUSTED_EMAIL_VERIFICATION_PROVIDERS =
            java.util.Set.of(OAuthUserInfo.GOOGLE);

    public OAuthUserInfo extract(OAuth2User user, String registrationId) {
        Map<String, Object> claims = user.getAttributes();

        String provider = registrationId == null ? "" : registrationId.toLowerCase();
        String providerUserId = resolveProviderUserId(user, claims);
        String email = asString(claims.get("email"));
        boolean emailVerified = resolveEmailVerified(provider, claims);
        String fullName = resolveFullName(claims);

        return new OAuthUserInfo(provider, providerUserId, email, emailVerified, fullName);
    }

    /**
     * ID user ở phía provider.
     *
     * ⚠️ Google dùng claim `sub`, Facebook dùng `id`. `user.getName()` trả về
     * giá trị của `userNameAttributeName` mà provider đã khai báo → dùng nó
     * là đúng nhất, fallback sang `sub` rồi `id`.
     */
    private String resolveProviderUserId(OAuth2User user, Map<String, Object> claims) {
        String name = user.getName();
        if (name != null && !name.isBlank()) {
            return name;
        }
        Object sub = claims.get("sub");
        if (sub != null) {
            return String.valueOf(sub);
        }
        Object id = claims.get("id");
        return id != null ? String.valueOf(id) : null;
    }

    /**
     * ⚠️ Chỉ provider tin cậy mới được trả về true.
     * Với provider khác → luôn false, bất kể provider gửi gì.
     */
    private boolean resolveEmailVerified(String provider, Map<String, Object> claims) {
        if (!TRUSTED_EMAIL_VERIFICATION_PROVIDERS.contains(provider)) {
            return false;
        }
        Object raw = claims.get("email_verified");
        if (raw instanceof Boolean b) {
            return b;
        }
        // Google đôi khi trả claim dạng chuỗi "true"/"false".
        if (raw instanceof String s) {
            return Boolean.parseBoolean(s.trim());
        }
        // Thiếu claim → KHÔNG đoán, coi như chưa xác minh.
        return false;
    }

    private String resolveFullName(Map<String, Object> claims) {
        Object name = claims.get("name");
        if (name == null) {
            return null;
        }
        String s = String.valueOf(name).trim();
        return s.isEmpty() ? null : s;
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthUserInfoExtractorTest"
```
Expected: PASS (7 test).

- [ ] **Step 6: Commit**

```powershell
git add backend/src/main/java/vn/ShuttleHub/backend/auth/oauth backend/src/test/java/vn/ShuttleHub/backend/auth/oauth
git commit -m "feat(auth): them OAuthUserInfoExtractor chuan hoa claim provider"
```

---

## Task 3: OAuthTicketService — sinh & đổi ticket

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketService.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/OAuthTicketException.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketServiceTest.java`

**Interfaces:**
- Consumes: `OAuthTicketRepository` (task 1)
- Produces:
  - `OAuthTicketService.issuePending(String provider, String providerUserId, String fullName) -> String` (ticket chờ, userId = null)
  - `OAuthTicketService.issueForUser(String userId, String provider, String providerUserId) -> String`
  - `OAuthTicketService.peek(String ticket) -> OAuthTicket` (ném exception nếu hết hạn / đã dùng)
  - `OAuthTicketService.consume(String ticket) -> OAuthTicket` (đánh dấu used=true, trả về)
  - `OAuthTicketService.attachUser(String ticket, String userId)` (nâng ticket chờ → ticket đăng nhập)
  - `OAuthTicketException` extends RuntimeException

- [ ] **Step 1: Viết test failing**

`backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketServiceTest.java`:

```java
package vn.ShuttleHub.backend.auth.oauth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.ShuttleHub.backend.auth.exception.OAuthTicketException;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.repository.OAuthTicketRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuthTicketServiceTest {

    @Mock
    private OAuthTicketRepository repo;

    @InjectMocks
    private OAuthTicketService service;

    @Test
    @DisplayName("Sinh ticket chờ (Facebook) → userId null, hết hạn sau 60 giây")
    void issuePending_setsNullUserAndExpiry() {
        ArgumentCaptor<OAuthTicket> captor = ArgumentCaptor.forClass(OAuthTicket.class);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String ticket = service.issuePending("facebook", "pid-1", "Nguyen Van A");

        assertNotNull(ticket);
        assertTrue(ticket.length() >= 40, "ticket phải đủ dài để không đoán được");
        verify(repo).save(captor.capture());
        OAuthTicket saved = captor.getValue();
        assertNull(saved.getUserId());
        assertEquals("facebook", saved.getProvider());
        assertEquals("pid-1", saved.getProviderUserId());
        assertEquals("Nguyen Van A", saved.getFullName());
        assertFalse(saved.getUsed());
        assertTrue(saved.getExpiresAt().isAfter(LocalDateTime.now().plusSeconds(50)));
    }

    @Test
    @DisplayName("Sinh ticket đăng nhập (Google) → userId đã gắn")
    void issueForUser_setsUserId() {
        ArgumentCaptor<OAuthTicket> captor = ArgumentCaptor.forClass(OAuthTicket.class);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.issueForUser("user-1", "google", "sub-1");

        verify(repo).save(captor.capture());
        assertEquals("user-1", captor.getValue().getUserId());
    }

    @Test
    @DisplayName("Đổi ticket: đánh dấu used=true, trả về ticket")
    void consume_marksUsed() {
        OAuthTicket t = OAuthTicket.builder().ticket("t1").userId("u1").provider("google")
                .providerUserId("s1").expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        OAuthTicket result = service.consume("t1");

        assertTrue(result.getUsed());
        verify(repo).save(t);
    }

    @Test
    @DisplayName("Đổi ticket lần 2 (đã used) → ném OAuthTicketException")
    void consume_twice_throws() {
        OAuthTicket t = OAuthTicket.builder().ticket("t1").userId("u1").provider("google")
                .providerUserId("s1").expiresAt(LocalDateTime.now().plusSeconds(60)).used(true)
                .createdAt(LocalDateTime.now()).build();
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        assertThrows(OAuthTicketException.class, () -> service.consume("t1"));
    }

    @Test
    @DisplayName("Ticket quá hạn (60s) → ném OAuthTicketException")
    void consume_expired_throws() {
        OAuthTicket t = OAuthTicket.builder().ticket("t1").userId("u1").provider("google")
                .providerUserId("s1").expiresAt(LocalDateTime.now().minusSeconds(1)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        assertThrows(OAuthTicketException.class, () -> service.consume("t1"));
    }

    @Test
    @DisplayName("Ticket không tồn tại → ném OAuthTicketException")
    void consume_notFound_throws() {
        when(repo.findByTicket("khong")).thenReturn(Optional.empty());

        assertThrows(OAuthTicketException.class, () -> service.consume("khong"));
    }

    @Test
    @DisplayName("Ticket chờ (userId null) chưa đủ điều kiện đổi → ném OAuthTicketException")
    void consume_pendingTicket_throws() {
        OAuthTicket t = OAuthTicket.builder().ticket("t1").userId(null).provider("facebook")
                .providerUserId("p1").expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        assertThrows(OAuthTicketException.class, () -> service.consume("t1"));
    }

    @Test
    @DisplayName("attachUser: nâng ticket chờ thành ticket đăng nhập")
    void attachUser_setsUserId() {
        OAuthTicket t = OAuthTicket.builder().ticket("t1").userId(null).provider("facebook")
                .providerUserId("p1").expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        service.attachUser("t1", "user-9");

        assertEquals("user-9", t.getUserId());
        verify(repo).save(t);
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthTicketServiceTest"
```
Expected: FAIL — compile error.

- [ ] **Step 3: Viết exception**

`backend/src/main/java/vn/ShuttleHub/backend/auth/exception/OAuthTicketException.java`:

```java
package vn.ShuttleHub.backend.auth.exception;

/**
 * Ticket OAuth không hợp lệ: không tồn tại, đã dùng, hoặc hết hạn.
 *
 * ⚠️ Message cố tình CHUNG chung ("không hợp lệ hoặc đã hết hạn") — không
 * tiết lộ ticket nào còn tồn tại, tránh việc kẻ xấu dò xem ticket họ đoán
 * ra đã hết hạn hay chưa.
 */
public class OAuthTicketException extends RuntimeException {
    public OAuthTicketException(String message) {
        super(message);
    }
}
```

- [ ] **Step 4: Viết OAuthTicketService**

`backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketService.java`:

```java
package vn.ShuttleHub.backend.auth.oauth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.exception.OAuthTicketException;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.repository.OAuthTicketRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * Quản lý ticket dùng-một-lần để trao JWT cho frontend sau OAuth callback.
 *
 * ⚠️ Vì sao cần ticket thay vì đưa JWT vào URL?
 *   URL nằm trong browser history, log access của nginx/APM, và header
 *   Referer khi user bấm link ra ngoài. Ticket chỉ dùng được 1 lần,
 *   hết hạn sau 60 giây và không chứa PII → vô hại khi lọt.
 */
@Service
@RequiredArgsConstructor
public class OAuthTicketService {

    private final OAuthTicketRepository repo;

    /** TTL của ticket (giây). */
    @Value("${app.oauth.ticket-ttl-seconds:60}")
    private int ttlSeconds;

    private final SecureRandom random = new SecureRandom();

    /**
     * Sinh ticket CHỜ — dùng khi user chưa có tài khoản (Facebook cần hoàn
     * thiện hồ sơ). Ticket này KHÔNG đổi được JWT cho tới khi user hoàn
     * thiện hồ sơ và {@link #attachUser} được gọi.
     */
    @Transactional
    public String issuePending(String provider, String providerUserId, String fullName) {
        return save(provider, providerUserId, fullName, null);
    }

    /**
     * Sinh ticket ĐĂNG NHẬP — dùng khi đã xác định được user.
     */
    @Transactional
    public String issueForUser(String userId, String provider, String providerUserId) {
        return save(provider, providerUserId, null, userId);
    }

    private String save(String provider, String providerUserId, String fullName, String userId) {
        String ticket = generateTicket();
        repo.save(OAuthTicket.builder()
                .ticket(ticket)
                .userId(userId)
                .provider(provider)
                .providerUserId(providerUserId)
                .fullName(fullName)
                .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build());
        return ticket;
    }

    /**
     * Đọc ticket mà KHÔNG tiêu thụ — dùng để FE hỏi "ticket này cần làm gì?".
     */
    @Transactional(readOnly = true)
    public OAuthTicket peek(String ticket) {
        OAuthTicket t = repo.findByTicket(ticket)
                .orElseThrow(() -> new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
        if (Boolean.TRUE.equals(t.getUsed())) {
            throw new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
        }
        if (t.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
        }
        return t;
    }

    /**
     * Tiêu thụ ticket — trả về ticket đã đánh dấu used=true.
     *
     * ⚠️ Đánh dấu used TRƯỚC khi trả về: nếu 2 request cùng lúc gọi,
     * request thứ 2 sẽ thấy used=true → bị từ chối. Đây là cơ chế
     * single-use.
     */
    @Transactional
    public OAuthTicket consume(String ticket) {
        OAuthTicket t = peek(ticket);
        if (t.getUserId() == null) {
            throw new OAuthTicketException("Vui lòng hoàn thiện thông tin trước khi tiếp tục.");
        }
        t.setUsed(true);
        repo.save(t);
        return t;
    }

    /**
     * Gắn user vào ticket đang chờ → biến nó thành ticket đăng nhập.
     */
    @Transactional
    public void attachUser(String ticket, String userId) {
        OAuthTicket t = repo.findByTicket(ticket)
                .orElseThrow(() -> new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
        if (Boolean.TRUE.equals(t.getUsed())) {
            throw new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
        }
        if (t.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
        }
        t.setUserId(userId);
        repo.save(t);
    }

    /**
     * Ticket = 32 byte ngẫu nhiên → base64url (43 ký tự).
     *
     * ⚠️ Dùng SecureRandom, KHÔNG dùng UUID v4 — UUID v4 sinh từ
     * Math.random ở một số JDK, còn SecureRandom là CSPRNG.
     */
    private String generateTicket() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
```

> ⚠️ Vì sao `peek` gọi `repo.findByTicket` chứ không dùng `consume`? Vì `consume`
> cần transaction ghi; `peek` chỉ đọc. Nhưng vì cả hai cùng class và
> `peek` được gọi từ `consume` (self-invocation), `@Transactional` của `peek`
> **không** có tác dụng — nhưng `consume` đã có `@Transactional` nên vẫn OK.

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthTicketServiceTest"
```
Expected: PASS (8 test).

- [ ] **Step 6: Commit**

```powershell
git add backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketService.java backend/src/main/java/vn/ShuttleHub/backend/auth/exception/OAuthTicketException.java backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketServiceTest.java
git commit -m "feat(auth): them OAuthTicketService sinh va doi ticket dung-mot-lan"
```

---

## Task 4: OAuthAuthService — tìm / tạo / gộp user

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java`

**Interfaces:**
- Consumes: `UserRepository`, `OAuthAccountRepository`, `PasswordEncoder`, `JwtService`, `RefreshTokenRepository`, `OtpService`, `RegistrationAttemptService` (task 1)
- Produces:
  - `record OAuthLoginOutcome(String status, OAuthUserInfo userInfo, String userId, String ticket)` — `status` ∈ `"LOGGED_IN"` | `"NEEDS_PROFILE"`
  - `OAuthAuthService.handleCallback(OAuthUserInfo info) -> OAuthLoginOutcome`
  - `OAuthAuthService.completeFacebookProfile(String ticket, String email, String phone, String otp) -> String` (trả userId)
  - `AuthService.issueTokens(User user) -> AuthResponse` (public — tách từ `buildAuthResponse` private hiện tại)

- [ ] **Step 1: Viết test failing**

`backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java`:

```java
package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.auth.oauth.OAuthTicketService;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.entity.OAuthAccount;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.OAuthAccountRepository;
import vn.ShuttleHub.backend.repository.RefreshTokenRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuthAuthServiceTest {

    @Mock private UserRepository userRepo;
    @Mock private OAuthAccountRepository oauthAccountRepo;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private OAuthTicketService ticketService;

    @InjectMocks
    private OAuthAuthService service;

    private OAuthUserInfo google(String email, boolean verified) {
        return new OAuthUserInfo("google", "sub-1", email, verified, "Nguyen Van A");
    }

    private OAuthUserInfo facebook(String email) {
        return new OAuthUserInfo("facebook", "fb-1", email, false, "Nguyen Van A");
    }

    @Test
    @DisplayName("Google + email mới → tạo user mới, sinh ticket đăng nhập")
    void google_newEmail_createsUser() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("new@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-new");
            return u;
        });
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("ticket-1");

        var outcome = service.handleCallback(google("new@x.com", true));

        assertEquals("LOGGED_IN", outcome.status());
        assertEquals("ticket-1", outcome.ticket());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("new@x.com", saved.getEmail());
        assertEquals(Role.CUSTOMER, saved.getRole());
        assertTrue(saved.getIsActive());
        assertNotNull(saved.getPassword());
    }

    @Test
    @DisplayName("User OAuth KHÔNG đăng nhập được bằng mật khẩu (hash random)")
    void oauthUser_passwordIsRandomHash() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("new@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t");

        service.handleCallback(google("new@x.com", true));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        // Không bao giờ là mật khẩu rỗng hay chuỗi rõ ràng.
        assertNotNull(captor.getValue().getPassword());
        assertFalse(captor.getValue().getPassword().isBlank());
    }

    @Test
    @DisplayName("Google + email đã có + verified=true → GỘP vào user đó, KHÔNG tạo user mới")
    void google_existingVerified_mergesIntoExistingUser() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.empty());
        User existing = User.builder().id("u-exist").email("old@x.com")
                .username("olduser").password("h").role(Role.CUSTOMER).isActive(true).build();
        when(userRepo.findByEmail("old@x.com")).thenReturn(Optional.of(existing));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t2");

        var outcome = service.handleCallback(google("old@x.com", true));

        assertEquals("LOGGED_IN", outcome.status());
        assertEquals("u-exist", outcome.userId());
        verify(userRepo, never()).save(any());
        verify(oauthAccountRepo).save(any(OAuthAccount.class));
    }

    @Test
    @DisplayName("Facebook + email đã có → KHÔNG gộp, ném lỗi 409")
    void facebook_existingEmail_throwsConflict() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.empty());
        User existing = User.builder().id("u-exist").email("victim@x.com")
                .username("victim").password("h").role(Role.CUSTOMER).isActive(true).build();
        when(userRepo.findByEmail("victim@x.com")).thenReturn(Optional.of(existing));

        assertThrows(EmailAlreadyExistsException.class,
                () -> service.handleCallback(facebook("victim@x.com")));

        verify(userRepo, never()).save(any());
        verify(oauthAccountRepo, never()).save(any());
    }

    @Test
    @DisplayName("Facebook lần đầu (chưa có oauth_account) → NEEDS_PROFILE, sinh ticket chờ")
    void facebook_firstTime_needsProfile() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("newfb@x.com")).thenReturn(Optional.empty());
        when(ticketService.issuePending(anyString(), anyString(), any())).thenReturn("pending-1");

        var outcome = service.handleCallback(facebook("newfb@x.com"));

        assertEquals("NEEDS_PROFILE", outcome.status());
        assertEquals("pending-1", outcome.ticket());
        assertEquals("Nguyen Van A", outcome.userInfo().fullName());
        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("Đã có oauth_account → dùng lại user đó, không tạo mới")
    void existingLink_reusesUser() {
        OAuthAccount link = OAuthAccount.builder().id("oa-1").userId("u-1")
                .provider("google").providerUserId("sub-1")
                .emailAtRegistration("a@x.com").createdAt(java.time.LocalDateTime.now()).build();
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.of(link));
        User u = User.builder().id("u-1").email("a@x.com").username("u1")
                .password("h").role(Role.CUSTOMER).isActive(true).build();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t3");

        var outcome = service.handleCallback(google("a@x.com", true));

        assertEquals("LOGGED_IN", outcome.status());
        assertEquals("u-1", outcome.userId());
        verify(userRepo, never()).save(any());
        verify(oauthAccountRepo, never()).save(any());
    }

    @Test
    @DisplayName("User bị khoá (isActive=false) → ném lỗi, không cho đăng nhập OAuth")
    void inactiveUser_throws() {
        OAuthAccount link = OAuthAccount.builder().id("oa-1").userId("u-1")
                .provider("google").providerUserId("sub-1")
                .emailAtRegistration("a@x.com").createdAt(java.time.LocalDateTime.now()).build();
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.of(link));
        User u = User.builder().id("u-1").email("a@x.com").username("u1")
                .password("h").role(Role.CUSTOMER).isActive(false).build();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));

        assertThrows(vn.ShuttleHub.backend.auth.exception.InvalidCredentialsException.class,
                () -> service.handleCallback(google("a@x.com", true)));
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthAuthServiceTest"
```
Expected: FAIL — compile error.

- [ ] **Step 3: Viết record OAuthLoginOutcome**

`backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthLoginOutcome.java`:

```java
package vn.ShuttleHub.backend.auth.service;

import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;

/**
 * Kết quả xử lý OAuth callback.
 *
 * `status`:
 *   • "LOGGED_IN"     — đã có user → frontend đổi ticket lấy JWT.
 *   • "NEEDS_PROFILE" — Facebook lần đầu → user phải hoàn thiện hồ sơ.
 */
public record OAuthLoginOutcome(
        String status,
        OAuthUserInfo userInfo,
        String userId,
        String ticket
) {
    public static final String LOGGED_IN = "LOGGED_IN";
    public static final String NEEDS_PROFILE = "NEEDS_PROFILE";

    public static OAuthLoginOutcome loggedIn(OAuthUserInfo info, String userId, String ticket) {
        return new OAuthLoginOutcome(LOGGED_IN, info, userId, ticket);
    }

    public static OAuthLoginOutcome needsProfile(OAuthUserInfo info, String ticket) {
        return new OAuthLoginOutcome(NEEDS_PROFILE, info, null, ticket);
    }
}
```

- [ ] **Step 4: Tách `buildAuthResponse` thành `issueTokens` public trong AuthService**

Sửa `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java`:
- Đổi `private AuthResponse buildAuthResponse(User user)` → `public AuthResponse issueTokens(User user)`.
- Đổi 2 chỗ gọi: trong `register()` và `login()` → `issueTokens(user)`.
- Thêm comment giải thích vì sao phải public (OAuthAuthService cần dùng để sinh token theo đúng cơ chế refresh/rotation hiện có).

- [ ] **Step 5: Viết OAuthAuthService**

`backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`:

```java
package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.auth.exception.InvalidCredentialsException;
import vn.ShuttleHub.backend.auth.oauth.OAuthTicketService;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.entity.OAuthAccount;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.OAuthAccountRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthAuthService {

    private final UserRepository userRepo;
    private final OAuthAccountRepository oauthAccountRepo;
    private final PasswordEncoder passwordEncoder;
    private final OAuthTicketService ticketService;
    private final OtpService otpService;
    private final RegistrationAttemptService registrationAttemptService;

    private final SecureRandom random = new SecureRandom();

    /**
     * Xử lý sau khi provider redirect về backend.
     *
     * ⚠️ Quy tắc bảo mật cốt lõi — CHỈ provider có {@code emailVerified=true}
     * mới được gộp tự động vào tài khoản đã tồn tại. Facebook không bao giờ
     * đạt điều này (Graph API không có cờ email_verified) → nếu email trùng,
     * ta ném lỗi thay vì gộp, để không ai có thể chiếm đoạt tài khoản.
     */
    @Transactional
    public OAuthLoginOutcome handleCallback(OAuthUserInfo info) {
        // 1. Đã liên kết trước đây → dùng lại user đó.
        Optional<OAuthAccount> link = oauthAccountRepo
                .findByProviderAndProviderUserId(info.provider(), info.providerUserId());
        if (link.isPresent()) {
            User user = userRepo.findById(link.get().getUserId())
                    .orElseThrow(() -> new InvalidCredentialsException("Tài khoản không tồn tại."));
            assertActive(user);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 2. Chưa liên kết. Chuẩn hoá email để so sánh.
        String email = normalizeEmail(info.email());

        if (email == null) {
            // Facebook có thể không trả email (user chưa cấp quyền).
            // → Buộc user hoàn thiện hồ sơ.
            String ticket = ticketService.issuePending(info.provider(), info.providerUserId(), info.fullName());
            return OAuthLoginOutcome.needsProfile(info, ticket);
        }

        Optional<User> existing = userRepo.findByEmail(email);

        if (existing.isPresent()) {
            // ⚠️ CHỈ gộp khi provider chứng minh được sở hữu email.
            if (!info.emailVerified()) {
                throw new EmailAlreadyExistsException(
                        "Email này đã được sử dụng. Vui lòng đăng nhập bằng mật khẩu.");
            }
            User user = existing.get();
            assertActive(user);
            oauthAccountRepo.save(OAuthAccount.builder()
                    .userId(user.getId())
                    .provider(info.provider())
                    .providerUserId(info.providerUserId())
                    .emailAtRegistration(email)
                    .createdAt(LocalDateTime.now())
                    .build());
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 3. Email mới + provider đã xác minh → tạo user luôn (Google).
        if (info.emailVerified()) {
            User user = createUser(email, info.fullName());
            linkAccount(user, info, email);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 4. Provider KHÔNG xác minh được email (Facebook) → yêu cầu hoàn thiện hồ sơ.
        String ticket = ticketService.issuePending(info.provider(), info.providerUserId(), info.fullName());
        return OAuthLoginOutcome.needsProfile(info, ticket);
    }

    /**
     * Hoàn thiện hồ sơ cho user Facebook.
     *
     * @param ticket ticket đang chờ (userId = null)
     * @return userId vừa tạo
     */
    @Transactional
    public String completeFacebookProfile(String ticket, String email, String phone, String otp) {
        // Verify SĐT — tận dụng luồng OTP sẵn có (chống spam + xác nhận SĐT thật).
        otpService.verifyOtp(phone, otp);

        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) {
            throw new EmailAlreadyExistsException("Email không hợp lệ.");
        }
        if (userRepo.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email này đã được sử dụng.");
        }
        if (userRepo.existsByPhoneNumber(phone)) {
            throw new EmailAlreadyExistsException("Số điện thoại này đã được đăng ký.");
        }

        User user = createUser(normalizedEmail, null);
        user.setPhoneNumber(phone);
        user = userRepo.save(user);

        OAuthUserInfo info = new OAuthUserInfo(
                OAuthUserInfo.FACEBOOK, null, normalizedEmail, false, null);
        oauthAccountRepo.save(OAuthAccount.builder()
                .userId(user.getId())
                .provider(OAuthUserInfo.FACEBOOK)
                .providerUserId(ticketService.peek(ticket).getProviderUserId())
                .emailAtRegistration(normalizedEmail)
                .createdAt(LocalDateTime.now())
                .build());

        ticketService.attachUser(ticket, user.getId());
        return user.getId();
    }

    private User createUser(String email, String fullName) {
        // ⚠️ Mật khẩu = hash BCrypt của chuỗi random 32 byte.
        // → Không ai (kể cả chủ sân) đăng nhập được bằng mật khẩu cho
        //   tài khoản OAuth. Cột `password` NOT NULL nên phải có giá trị.
        byte[] randomBytes = new byte[32];
        random.nextBytes(randomBytes);
        String unusablePassword = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        User user = User.builder()
                .username(generateUniqueUsername(email))
                .email(email)
                .password(passwordEncoder.encode(unusablePassword))
                .fullName(fullName)
                .role(Role.CUSTOMER)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return userRepo.save(user);
    }

    private void linkAccount(User user, OAuthUserInfo info, String email) {
        oauthAccountRepo.save(OAuthAccount.builder()
                .userId(user.getId())
                .provider(info.provider())
                .providerUserId(info.providerUserId())
                .emailAtRegistration(email)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void assertActive(User user) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new InvalidCredentialsException("Tài khoản đã bị khoá.");
        }
    }

    /**
     * Sinh `username` duy nhất từ email.
     *
     * ⚠️ Ràng buộc của hệ thống: chỉ chữ/số/gạch dưới, tối đa 50 ký tự,
     * và phải UNIQUE (có constraint ở DB).
     */
    private String generateUniqueUsername(String email) {
        String local = email == null ? "" : email.split("@")[0];
        String cleaned = local == null ? "" : local.replaceAll("[^a-zA-Z0-9_]", "");
        if (cleaned.isBlank()) {
            cleaned = "user";
        }
        if (cleaned.length() > 40) {
            cleaned = cleaned.substring(0, 40);
        }

        String candidate = cleaned;
        for (int i = 2; i <= 5 && userRepo.existsByUsername(candidate); i++) {
            candidate = cleaned + "_" + i;
        }
        // Lần cuối thêm hậu tố random để tránh trùng tuyệt đối.
        if (userRepo.existsByUsername(candidate)) {
            byte[] suffix = new byte[4];
            random.nextBytes(suffix);
            candidate = cleaned + "_" + HexFormat.of().formatHex(suffix);
        }
        return candidate;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String s = email.trim().toLowerCase(Locale.ROOT);
        return s.isBlank() ? null : s;
    }
}
```

> ⚠️ Dùng `HexFormat` → cần import `java.util.HexFormat` (đã có trong block import ở trên).

**Về `completeFacebookProfile`:** providerUserId lấy từ `ticketService.peek(ticket).getProviderUserId()` — đảm bảo ticket còn hiệu lực và thuộc đúng provider Facebook. Nếu ticket đã bị dùng hoặc hết hạn, `peek` ném `OAuthTicketException` → HTTP 401.

- [ ] **Step 6: Chạy test để xác nhận PASS**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthAuthServiceTest,AuthServiceLoginRateLimitTest,AuthServiceRegistrationLimitTest"
```
Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/main/java/vn/ShuttleHub/backend/auth/service backend/src/test/java/vn/ShuttleHub/backend/auth/service
git commit -m "feat(auth): them OAuthAuthService tim-tao-gop user theo chinh sach email_verified"
```

---

## Task 5: SecurityConfig + handler + controller + properties

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/config/OAuthSuccessHandler.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/config/OAuthFailureHandler.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthExchangeRequest.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/FacebookCompleteRequest.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/config/SecurityConfig.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/resources/application.properties` + `.template`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/config/OAuthSuccessHandlerTest.java`

**Interfaces:**
- Consumes: `OAuthAuthService` (task 4), `OAuthTicketService` (task 3), `OAuthUserInfoExtractor` (task 2), `AuthService.issueTokens()` (task 4)
- Produces:
  - `GET /api/auth/oauth/providers` → `{ providers: string[] }`
  - `GET /api/auth/oauth/ticket/{ticket}` → `OAuthTicketStatus`
  - `POST /api/auth/oauth/exchange` → `AuthResponse`
  - `POST /api/auth/oauth/facebook/complete` → `{ userId }`

- [ ] **Step 1: Viết test failing**

`backend/src/test/java/vn/ShuttleHub/backend/config/OAuthSuccessHandlerTest.java`:

```java
package vn.ShuttleHub.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfoExtractor;
import vn.ShuttleHub.backend.auth.service.OAuthLoginOutcome;
import vn.ShuttleHub.backend.auth.service.OAuthAuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuthSuccessHandlerTest {

    @Mock private OAuthAuthService oauthAuthService;
    @Mock private OAuthUserInfoExtractor extractor;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    private OAuthSuccessHandler handler() {
        return new OAuthSuccessHandler(oauthAuthService, extractor, "http://localhost:5173");
    }

    private OAuth2User googleUser() {
        return new OAuth2User(
                Map.of("sub", "sub-1", "email", "a@b.com", "email_verified", true, "name", "A"),
                List.of(new OAuth2UserAuthority("ROLE_USER")), "sub");
    }

    @Test
    @DisplayName("Callback thành công → redirect về FE kèm ticket, KHÔNG chứa JWT trong URL")
    void success_redirectsWithTicket() {
        OAuthUserInfo info = new OAuthUserInfo("google", "sub-1", "a@b.com", true, "A");
        when(extractor.extract(any(), anyString())).thenReturn(info);
        when(oauthAuthService.handleCallback(info))
                .thenReturn(OAuthLoginOutcome.loggedIn(info, "u-1", "ticket-abc"));

        handler().onAuthenticationSuccess(request, response, googleUser());

        verify(response).sendRedirect("http://localhost:5173/oauth/callback?ticket=ticket-abc");
    }

    @Test
    @DisplayName("Facebook cần hoàn thiện hồ sơ → redirect về /oauth/facebook")
    void success_needsProfile_redirectsToFacebookPage() {
        OAuthUserInfo info = new OAuthUserInfo("facebook", "fb-1", "a@b.com", false, "A");
        when(extractor.extract(any(), anyString())).thenReturn(info);
        when(oauthAuthService.handleCallback(info))
                .thenReturn(OAuthLoginOutcome.needsProfile(info, "pending-abc"));

        handler().onAuthenticationSuccess(request, response, googleUser());

        verify(response).sendRedirect("http://localhost:5173/oauth/facebook?ticket=pending-abc");
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthSuccessHandlerTest"
```
Expected: FAIL — compile error.

- [ ] **Step 3: Viết DTO**

`backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java`:

```java
package vn.ShuttleHub.backend.auth.dto;

/**
 * Trạng thái của ticket — frontend dùng để biết cần làm gì tiếp.
 */
public record OAuthTicketStatus(
        String status,      // "READY" | "NEEDS_PROFILE"
        String provider,
        String fullName
) {
    public static final String READY = "READY";
    public static final String NEEDS_PROFILE = "NEEDS_PROFILE";
}
```

`backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthExchangeRequest.java`:

```java
package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthExchangeRequest(
        @NotBlank(message = "Ticket không được để trống")
        String ticket
) {}
```

`backend/src/main/java/vn/ShuttleHub/backend/auth/dto/FacebookCompleteRequest.java`:

```java
package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import vn.ShuttleHub.backend.common.PhoneNumbers;

import java.util.Locale;

public record FacebookCompleteRequest(
        @NotBlank(message = "Ticket không được để trống")
        String ticket,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email chưa đúng định dạng")
        String email,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^84[0-9]{9}$", message = "Số điện thoại chưa hợp lệ")
        String phone,

        @NotBlank(message = "Mã OTP không được để trống")
        @Pattern(regexp = "^[0-9]{6}$", message = "Mã OTP phải là 6 chữ số")
        String otp
) {
    /**
     * Chuẩn hoá TRƯỚC khi validate — cùng pattern với RegisterRequest.
     */
    public FacebookCompleteRequest {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        phone = PhoneNumbers.normalize(phone);
    }
}
```

- [ ] **Step 4: Viết OAuthSuccessHandler**

`backend/src/main/java/vn/ShuttleHub/backend/config/OAuthSuccessHandler.java`:

```java
package vn.ShuttleHub.backend.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfoExtractor;
import vn.ShuttleHub.backend.auth.service.OAuthAuthService;
import vn.ShuttleHub.backend.auth.service.OAuthLoginOutcome;

import java.io.IOException;

/**
 * Xử lý sau khi provider redirect về backend kèm authorization code.
 *
 * ⚠️ Chỉ truyền TICKET qua URL — KHÔNG truyền JWT.
 * URL nằm trong browser history + log server + Referer header.
 * Ticket dùng 1 lần, hết hạn 60s, không chứa PII → vô hại khi lọt.
 */
@Component
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {

    private final OAuthAuthService oauthAuthService;
    private final OAuthUserInfoExtractor extractor;
    private final String frontendRedirectUri;

    /**
     * ⚠️ Dùng constructor injection cho `frontendRedirectUri` (không phải
     * `@Value` trên field) — vì test instantiate class này trực tiếp, mà
     * `@Value` trên field sẽ không được set → luôn null.
     */
    public OAuthSuccessHandler(
            OAuthAuthService oauthAuthService,
            OAuthUserInfoExtractor extractor,
            @Value("${app.oauth.frontend-redirect-uri:http://localhost:5173}") String frontendRedirectUri
    ) {
        this.oauthAuthService = oauthAuthService;
        this.extractor = extractor;
        this.frontendRedirectUri = frontendRedirectUri;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String registrationId = request.getParameter("registrationId");
        if (registrationId == null || registrationId.isBlank()) {
            registrationId = extractRegistrationId(authentication);
        }

        OAuthUserInfo info = extractor.extract(oauth2User, registrationId);
        OAuthLoginOutcome outcome = oauthAuthService.handleCallback(info);

        String target = switch (outcome.status()) {
            case OAuthLoginOutcome.LOGGED_IN ->
                    frontendRedirectUri + "/oauth/callback?ticket=" + outcome.ticket();
            case OAuthLoginOutcome.NEEDS_PROFILE ->
                    frontendRedirectUri + "/oauth/facebook?ticket=" + outcome.ticket();
            default -> frontendRedirectUri + "/dang-nhap?error=oauth_failed";
        };

        response.sendRedirect(target);
    }

    /**
     * Lấy registrationId từ authorities của OAuth2User.
     *
     * ⚠️ `request.getParameter("registrationId")` không có trong luồng
     * authorization_code (param đó chỉ có ở bước authorize) → phải fallback
     * sang authorities do Spring set.
     */
    private String extractRegistrationId(Authentication authentication) {
        if (authentication.getPrincipal() instanceof OAuth2User user) {
            for (org.springframework.security.core.GrantedAuthority authority : user.getAuthorities()) {
                if (authority.getAuthority().startsWith("ROLE_OAUTH2_USER_")) {
                    return authority.getAuthority().substring("ROLE_OAUTH2_USER_".length());
                }
            }
        }
        return "";
    }
}
```

- [ ] **Step 5: Viết OAuthFailureHandler**

`backend/src/main/java/vn/ShuttleHub/backend/config/OAuthFailureHandler.java`:

```java
package vn.ShuttleHub.backend.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Xử lý khi provider trả về lỗi (user từ chối cấp quyền, state sai...).
 *
 * ⚠️ KHÔNG đưa message gốc của provider vào URL — có thể chứa thông tin
 * nhạy cảm. Chỉ truyền mã lỗi ngắn gọn, frontend tự hiển thị tiếng Việt.
 */
@Component
public class OAuthFailureHandler implements AuthenticationFailureHandler {

    private final String frontendRedirectUri;

    public OAuthFailureHandler(
            @Value("${app.oauth.frontend-redirect-uri:http://localhost:5173}") String frontendRedirectUri
    ) {
        this.frontendRedirectUri = frontendRedirectUri;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException, ServletException {
        response.sendRedirect(frontendRedirectUri + "/dang-nhap?error=oauth_failed");
    }
}
```

- [ ] **Step 6: Viết OAuthController**

`backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`:

```java
package vn.ShuttleHub.backend.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.*;
import vn.ShuttleHub.backend.auth.dto.*;
import vn.ShuttleHub.backend.auth.exception.OAuthTicketException;
import vn.ShuttleHub.backend.auth.oauth.OAuthTicketService;
import vn.ShuttleHub.backend.auth.service.AuthService;
import vn.ShuttleHub.backend.auth.service.OAuthAuthService;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthTicketService ticketService;
    private final OAuthAuthService oauthAuthService;
    private final AuthService authService;
    private final UserRepository userRepo;

    /**
     * Danh sách provider đang bật.
     *
     * ⚠️ Chỉ trả về provider có `client-id` khác rỗng — nếu chưa cấu hình
     * credential thì frontend ẨN nút tương ứng thay vì báo lỗi.
     */
    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> providers(
            ClientRegistrationRepository registrations
    ) {
        List<String> enabled = registrations.findAll().stream()
                .filter(r -> clientIdNotBlank(r))
                .map(ClientRegistration::getRegistrationId)
                .toList();
        return ResponseEntity.ok(
                ApiResponse.success("OK", Map.of("providers", enabled))
        );
    }

    /**
     * Hỏi ticket này cần làm gì: đổi thẳng JWT hay phải hoàn thiện hồ sơ.
     */
    @GetMapping("/ticket/{ticket}")
    public ResponseEntity<ApiResponse<OAuthTicketStatus>> ticketStatus(@PathVariable String ticket) {
        OAuthTicket t = ticketService.peek(ticket);
        String status = t.getUserId() != null
                ? OAuthTicketStatus.READY
                : OAuthTicketStatus.NEEDS_PROFILE;
        return ResponseEntity.ok(
                ApiResponse.success("OK",
                        new OAuthTicketStatus(status, t.getProvider(), t.getFullName()))
        );
    }

    /**
     * Đổi ticket lấy access + refresh token.
     *
     * ⚠️ Đây là nơi DUY NHẤT JWT được trả về frontend — qua body của POST,
     * không phải qua URL.
     */
    @PostMapping("/exchange")
    public ResponseEntity<ApiResponse<AuthResponse>> exchange(
            @Valid @RequestBody OAuthExchangeRequest req
    ) {
        OAuthTicket t = ticketService.consume(req.ticket());
        User user = userRepo.findById(t.getUserId())
                .orElseThrow(() -> new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
        AuthResponse res = authService.issueTokens(user);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công.", res));
    }

    /**
     * Hoàn thiện hồ sơ cho user Facebook (email + SĐT có OTP).
     */
    @PostMapping("/facebook/complete")
    public ResponseEntity<ApiResponse<Map<String, String>>> facebookComplete(
            @Valid @RequestBody FacebookCompleteRequest req
    ) {
        String userId = oauthAuthService.completeFacebookProfile(
                req.ticket(), req.email(), req.phone(), req.otp());
        return ResponseEntity.ok(
                ApiResponse.success("Hoàn thiện hồ sơ thành công.", Map.of("userId", userId))
        );
    }

    private boolean clientIdNotBlank(ClientRegistration r) {
        return r.getClientId() != null && !r.getClientId().isBlank();
    }

    @SuppressWarnings("unused")
    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
```

- [ ] **Step 7: Sửa SecurityConfig**

Trong `backend/src/main/java/vn/ShuttleHub/backend/config/SecurityConfig.java`:

1. Thêm import:
```java
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
```
2. Thêm 2 field + constructor (class đang dùng `@RequiredArgsConstructor` → thêm field final là được):
```java
    private final OAuthSuccessHandler oauthSuccessHandler;
    private final OAuthFailureHandler oauthFailureHandler;
```
3. Thêm vào `securityFilterChain`, ngay sau `.csrf(...)`:
```java
            .oauth2Login(oauth -> oauth
                    .successHandler(oauthSuccessHandler)
                    .failureHandler(oauthFailureHandler)
            )
```
4. Thêm vào `authorizeHttpRequests`, trước `anyRequest()`:
```java
                // OAuth2: các endpoint do Spring Security xử lý
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/login/oauth2/code/**").permitAll()
                .requestMatchers("/api/auth/oauth/**").permitAll()
```

> ⚠️ `ClientRegistrationRepository` là bean optional trong Spring Boot — chỉ tồn tại khi có
> `spring-boot-starter-security-oauth2-client` + cấu hình provider. Nếu không có
> cấu hình provider nào, `OAuthController` sẽ fail inject. → Ta luôn khai báo cả
> google + facebook trong properties (kể cả client-id rỗng) → bean luôn tồn tại.

- [ ] **Step 8: Thêm handler exception mới vào GlobalExceptionHandler**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/GlobalExceptionHandler.java`, thêm:

```java
    /**
     * Ticket OAuth không hợp lệ → 401 (client cần đăng nhập lại).
     */
    @ExceptionHandler(OAuthTicketException.class)
    public ResponseEntity<ApiResponse<Object>> handleOAuthTicket(OAuthTicketException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(401, ex.getMessage()));
    }
```

- [ ] **Step 9: Thêm properties**

Thêm vào `backend/src/main/resources/application.properties` (và file `.template` tương ứng, dùng placeholder):

```properties
# ----- OAuth2 (Google / Facebook) -----
# client-id / client-secret lấy từ Google Cloud Console và Meta for Developers.
# Để trống → provider bị tắt, frontend ẩn nút tương ứng.
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID:}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET:}
spring.security.oauth2.client.registration.google.scope=openid,email,profile
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}

spring.security.oauth2.client.registration.facebook.client-id=${FACEBOOK_CLIENT_ID:}
spring.security.oauth2.client.registration.facebook.client-secret=${FACEBOOK_CLIENT_SECRET:}
spring.security.oauth2.client.registration.facebook.scope=email,public_profile
spring.security.oauth2.client.registration.facebook.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}

# Graph API version — cập nhật mỗi năm (Meta tăng version 1 lần/năm).
app.oauth.facebook.graph-version=v27.0
spring.security.oauth2.client.provider.facebook.authorize-uri=https://www.facebook.com/v27.0/dialog/oauth
spring.security.oauth2.client.provider.facebook.token-uri=https://graph.facebook.com/v27.0/oauth/access_token
spring.security.oauth2.client.provider.facebook.user-info-uri=https://graph.facebook.com/v27.0/me?fields=id,name,email
spring.security.oauth2.client.provider.facebook.user-name-attribute=id

# TTL của ticket (giây) — token hệ thống KHÔNG đi qua URL, chỉ ticket này.
app.oauth.ticket-ttl-seconds=60
# Frontend redirect sau khi OAuth thành công/thất bại.
app.oauth.frontend-redirect-uri=http://localhost:5173
```

- [ ] **Step 10: Thêm dependency vào pom.xml**

Trong `backend/pom.xml`, thêm vào `<dependencies>`:
```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security-oauth2-client</artifactId>
		</dependency>
```

- [ ] **Step 11: Chạy test để xác nhận PASS**

```powershell
cd backend
.\mvnw.cmd -o test -Dtest="OAuthSuccessHandlerTest,BackendApplicationTests"
```
Expected: PASS. `BackendApplicationTests` xác nhận context vẫn khởi động được với `client-id` rỗng.

- [ ] **Step 12: Commit**

```powershell
git add backend/pom.xml backend/src/main/resources backend/src/main/java/vn/ShuttleHub/backend/config backend/src/main/java/vn/ShuttleHub/backend/auth
git commit -m "feat(auth): them OAuth endpoints, success/failure handler va cau hinh provider"
```

---

## Task 6: Frontend — API client + AuthContext + 2 page mới + nút social

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/pages/AuthPage.tsx`
- Create: `frontend/src/pages/OAuthCallbackPage.tsx`
- Create: `frontend/src/pages/OAuthCallbackPage.css`
- Create: `frontend/src/pages/FacebookCompletePage.tsx`
- Create: `frontend/src/pages/FacebookCompletePage.css`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/oauth/exchange`, `GET /api/auth/oauth/providers`, `GET /api/auth/oauth/ticket/{ticket}`, `POST /api/auth/oauth/facebook/complete`, `POST /api/auth/send-otp`
- Produces:
  - `authApi.oauthProviders() -> Promise<{ providers: string[] }>`
  - `authApi.oauthTicket(ticket) -> Promise<OAuthTicketStatus>`
  - `authApi.oauthExchange(ticket) -> Promise<AuthResponse>`
  - `authApi.oauthFacebookComplete(payload) -> Promise<{ userId: string }>`
  - `useAuth().loginWithTicket(ticket) -> Promise<User>`

- [ ] **Step 1: Thêm types**

Thêm vào `frontend/src/api/types.ts`:
```ts
/** Provider OAuth đang được bật */
export interface OAuthProviders {
  providers: string[];
}

/** Trạng thái ticket sau OAuth callback */
export interface OAuthTicketStatus {
  status: 'READY' | 'NEEDS_PROFILE';
  provider: string;
  fullName: string | null;
}
```

- [ ] **Step 2: Thêm API client**

Thêm vào `frontend/src/api/auth.ts`:
```ts
import type { AuthResponse, OAuthProviders, OAuthTicketStatus, User } from './types';

export interface FacebookCompletePayload {
  ticket: string;
  email: string;
  phone: string;
  otp: string;
}

// ... giữ nguyên phần cũ ...

export const authApi = {
  // ... các hàm cũ ...

  /** Danh sách provider OAuth đang bật (có client-id hợp lệ) */
  oauthProviders: () =>
    api.get<OAuthProviders>('/api/auth/oauth/providers', { anonymous: true }),

  /** Hỏi ticket cần làm gì: READY hay NEEDS_PROFILE */
  oauthTicket: (ticket: string) =>
    api.get<OAuthTicketStatus>(`/api/auth/oauth/ticket/${encodeURIComponent(ticket)}`, { anonymous: true }),

  /** Đổi ticket lấy access + refresh token */
  oauthExchange: (ticket: string) =>
    api.post<AuthResponse>('/api/auth/oauth/exchange', { ticket }, { anonymous: true }),

  /** Hoàn thiện hồ sơ Facebook (email + SĐT + OTP) */
  oauthFacebookComplete: (payload: FacebookCompletePayload) =>
    api.post<{ userId: string }>('/api/auth/oauth/facebook/complete', payload, { anonymous: true }),
};
```

- [ ] **Step 3: Thêm `loginWithTicket` vào AuthContext**

Trong `frontend/src/context/AuthContext.tsx`:
- Thêm vào interface:
```ts
  loginWithTicket: (ticket: string) => Promise<User>;
```
- Thêm implementation (đặt cạnh `login`):
```ts
  const loginWithTicket = useCallback(
    async (ticket: string) => {
      const res = await authApi.oauthExchange(ticket);
      persist(res.accessToken, res.refreshToken, res.user);
      return res.user;
    },
    [persist],
  );
```
- Thêm vào `value` object: `loginWithTicket,`

- [ ] **Step 4: Tạo OAuthCallbackPage**

`frontend/src/pages/OAuthCallbackPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/types';
import './OAuthCallbackPage.css';

/**
 * Trang nhận ticket sau OAuth callback của backend.
 *
 * ⚠️ Backend redirect về đây kèm `?ticket=...` — CHỈ có ticket, không có
 * JWT trong URL. Trang này đổi ticket lấy token rồi chuyển về trang chủ.
 */
export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTicket } = useAuth();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    // StrictMode gọi effect 2 lần trong dev → chống đổi ticket 2 lần.
    if (started.current) return;
    started.current = true;

    const ticket = params.get('ticket');
    if (!ticket) {
      setError('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
      return;
    }

    loginWithTicket(ticket)
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        const msg = err instanceof ApiError ? err.message : 'Đăng nhập không thành công.';
        setError(msg);
      });
  }, [params, loginWithTicket, navigate]);

  return (
    <section className="oauth-cb">
      <div className="oauth-cb__card">
        {error ? (
          <>
            <h2 className="oauth-cb__title">Đăng nhập không thành công</h2>
            <p className="oauth-cb__msg">{error}</p>
            <button type="button" className="oauth-cb__btn" onClick={() => navigate('/dang-nhap')}>
              Về trang đăng nhập
            </button>
          </>
        ) : (
          <>
            <Loader2 className="oauth-cb__spinner" aria-hidden="true" />
            <p className="oauth-cb__msg">Đang đăng nhập…</p>
          </>
        )}
      </div>
    </section>
  );
}
```

`frontend/src/pages/OAuthCallbackPage.css`:
```css
.oauth-cb {
  display: grid;
  place-items: center;
  min-height: 70vh;
  padding: 24px;
}

.oauth-cb__card {
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 16px;
  padding: 40px 32px;
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.oauth-cb__title {
  margin: 0 0 8px;
  font-size: 18px;
}

.oauth-cb__msg {
  margin: 12px 0 20px;
  color: var(--text-muted, #6b7280);
}

.oauth-cb__spinner {
  width: 32px;
  height: 32px;
  animation: oauth-cb-spin 0.9s linear infinite;
  color: var(--accent, #16a34a);
}

.oauth-cb__btn {
  background: var(--accent, #16a34a);
  color: #fff;
  border: 0;
  border-radius: 10px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 600;
}

@keyframes oauth-cb-spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 5: Tạo FacebookCompletePage**

`frontend/src/pages/FacebookCompletePage.tsx`:

```tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { OtpInput } from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/types';
import { digitsOnly, isValidPhone } from '../utils/phone';
import './FacebookCompletePage.css';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * Hoàn thiện hồ sơ cho user đăng nhập bằng Facebook.
 *
 * ⚠️ Vì sao cần bước này?
 * Facebook KHÔNG cung cấp cờ `email_verified` → ta không thể tin email
 * mà Facebook trả về. Nên ta yêu cầu user tự nhập email + SĐT (verify OTP)
 * để xác minh danh tính thật, tránh việc chiếm đoạt tài khoản.
 */
export function FacebookCompletePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTicket } = useAuth();

  const [status, setStatus] = useState<'loading' | 'needs_profile' | 'ready' | 'error'>('loading');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const resendTimer = useRef<number | null>(null);
  const started = useRef(false);

  const ticket = params.get('ticket') ?? '';

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!ticket) {
      setStatus('error');
      setError('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
      return;
    }

    authApi.oauthTicket(ticket)
      .then((t) => {
        if (t.status === 'READY') {
          // Đã hoàn thiện hồ sơ từ trước → đổi ticket luôn.
          loginWithTicket(ticket).then(() => navigate('/', { replace: true })).catch(() => {
            setStatus('error');
            setError('Đăng nhập không thành công. Vui lòng thử lại.');
          });
          return;
        }
        setFullName(t.fullName ?? '');
        setStatus('needs_profile');
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'Phiên đăng nhập không hợp lệ.');
      });
  }, [ticket, loginWithTicket, navigate]);

  useEffect(() => {
    if (resendIn <= 0) {
      if (resendTimer.current) {
        window.clearInterval(resendTimer.current);
        resendTimer.current = null;
      }
      return;
    }
    resendTimer.current = window.setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (resendTimer.current) window.clearInterval(resendTimer.current);
    };
  }, [resendIn]);

  const handleSendOtp = async () => {
    if (!isValidPhone(phone)) {
      setError('Số điện thoại chưa hợp lệ — không thể gửi mã.');
      return;
    }
    setOtpSending(true);
    try {
      const res = await authApi.sendOtp(digitsOnly(phone));
      setOtpSent(true);
      setOtp('');
      setResendIn(RESEND_SECONDS);
      setError('');
      if (res?.otp) setDevOtp(res.otp);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể gửi mã OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !isValidPhone(phone) || otp.replace(/\s/g, '').length !== OTP_LENGTH) {
      setError('Vui lòng điền đầy đủ thông tin bên dưới.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.oauthFacebookComplete({
        ticket,
        email: email.trim(),
        phone: digitsOnly(phone),
        otp: otp.replace(/\s/g, ''),
      });
      await loginWithTicket(ticket);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể hoàn thiện hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <section className="fbc">
        <div className="fbc__card">
          <Loader2 className="fbc__spinner" aria-hidden="true" />
          <p className="fbc__msg">Đang kiểm tra…</p>
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="fbc">
        <div className="fbc__card">
          <h2 className="fbc__title">Không thể tiếp tục</h2>
          <p className="fbc__msg">{error}</p>
          <button type="button" className="fbc__btn" onClick={() => navigate('/dang-nhap')}>
            Về trang đăng nhập
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="fbc">
      <div className="fbc__card">
        <header className="fbc__head">
          <h2 className="fbc__title">Hoàn thiện hồ sơ</h2>
          <p className="fbc__sub">
            Để bảo vệ tài khoản của bạn, vui lòng xác nhận email và số điện thoại.
          </p>
        </header>

        <form className="fbc__form" onSubmit={handleSubmit} noValidate>
          <div className="fbc__field">
            <label className="fbc__label" htmlFor="fbc-name">Họ và tên</label>
            <input
              id="fbc-name"
              type="text"
              className="fbc__input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="fbc__field">
            <label className="fbc__label" htmlFor="fbc-email">Email</label>
            <input
              id="fbc-email"
              type="email"
              className="fbc__input"
              placeholder="ban@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="fbc__field">
            <label className="fbc__label" htmlFor="fbc-phone">Số điện thoại</label>
            <div className="fbc__phone-wrap">
              <input
                id="fbc-phone"
                type="tel"
                className="fbc__input"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
              />
              <button
                type="button"
                className="fbc__send-otp"
                onClick={handleSendOtp}
                disabled={otpSending || (resendIn > 0 && otpSent)}
              >
                {otpSending ? 'Đang gửi…' : otpSent ? (resendIn > 0 ? `Gửi lại (${resendIn}s)` : 'Gửi lại') : 'Gửi mã'}
              </button>
            </div>
          </div>

          {otpSent && (
            <div className="fbc__otp">
              <span className="fbc__otp-label">
                <ShieldCheck size={16} aria-hidden="true" />
                Mã xác nhận đã gửi về {phone}
              </span>
              <OtpInput value={otp} onChange={setOtp} length={OTP_LENGTH} autoFocus />
              {devOtp && (
                <button type="button" className="fbc__dev-otp" onClick={() => setOtp(devOtp)}>
                  Mã OTP (dev): {devOtp}
                </button>
              )}
            </div>
          )}

          {error && <div className="fbc__alert" role="alert">{error}</div>}

          <button type="submit" className="fbc__submit" disabled={submitting}>
            {submitting ? 'Đang xử lý…' : 'Hoàn tất đăng ký'}
          </button>
        </form>
      </div>
    </section>
  );
}
```

`frontend/src/pages/FacebookCompletePage.css`:
```css
.fbc {
  display: grid;
  place-items: center;
  min-height: 70vh;
  padding: 24px;
}

.fbc__card {
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 16px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
}

.fbc__head { margin-bottom: 20px; }
.fbc__title { margin: 0 0 6px; font-size: 20px; }
.fbc__sub { margin: 0; color: var(--text-muted, #6b7280); font-size: 14px; }

.fbc__form { display: flex; flex-direction: column; gap: 14px; }
.fbc__field { display: flex; flex-direction: column; gap: 6px; }
.fbc__label { font-size: 13px; font-weight: 600; }
.fbc__input {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}
.fbc__phone-wrap { display: flex; gap: 8px; }
.fbc__send-otp {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  padding: 0 14px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 600;
  font-size: 13px;
}
.fbc__otp {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--surface-alt, #f9fafb);
  border-radius: 10px;
}
.fbc__otp-label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.fbc__dev-otp {
  align-self: flex-start;
  border: 1px dashed var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
.fbc__alert {
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}
.fbc__submit {
  background: var(--accent, #16a34a);
  color: #fff;
  border: 0;
  border-radius: 10px;
  padding: 12px;
  font-weight: 600;
  cursor: pointer;
}
.fbc__msg { color: var(--text-muted, #6b7280); }
.fbc__spinner {
  width: 32px; height: 32px;
  animation: fbc-spin 0.9s linear infinite;
  color: var(--accent, #16a34a);
}
.fbc__btn {
  background: var(--accent, #16a34a);
  color: #fff; border: 0; border-radius: 10px;
  padding: 10px 20px; cursor: pointer; font-weight: 600;
}
@keyframes fbc-spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 6: Sửa AuthPage — nút social thật**

Trong `frontend/src/pages/AuthPage.tsx`:
- Thêm import: `import { authApi } from '../api/auth';` (đã có sẵn) — không cần thêm.
- Thêm state:
```tsx
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);
```
- Thêm effect (trong component, cùng các useEffect khác):
```tsx
  // Lấy danh sách provider OAuth đang bật → ẩn nút không dùng được
  useEffect(() => {
    let cancelled = false;
    authApi.oauthProviders()
      .then((res) => { if (!cancelled) setOauthProviders(res.providers ?? []); })
      .catch(() => { if (!cancelled) setOauthProviders([]); });
    return () => { cancelled = true; };
  }, []);
```
- Thêm handler:
```tsx
  const startOAuth = (provider: string) => {
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
    window.location.href = `${base}/oauth2/authorization/${provider}`;
  };
```
- Thay 2 khối `<a href="#" className="auth__social" ...>` bằng `<button type="button">`:
```tsx
              <div className="auth__socials">
                <button
                  type="button"
                  className="auth__social"
                  onClick={() => startOAuth('google')}
                  disabled={!oauthProviders.includes('google')}
                  aria-label="Tiếp tục với Google"
                >
                  <svg className="auth__social-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  className="auth__social"
                  onClick={() => startOAuth('facebook')}
                  disabled={!oauthProviders.includes('facebook')}
                  aria-label="Tiếp tục với Facebook"
                >
                  <svg className="auth__social-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
```

- [ ] **Step 7: Thêm route**

Trong `frontend/src/main.tsx`:
- Thêm import:
```tsx
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { FacebookCompletePage } from './pages/FacebookCompletePage';
```
- Thêm route (trong `<Route element={<Layout />}>`):
```tsx
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/oauth/facebook" element={<FacebookCompletePage />} />
```

- [ ] **Step 8: Chạy type-check + build**

```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
npm run build
```
Expected: cả hai PASS, không lỗi TS.

- [ ] **Step 9: Commit**

```powershell
git add frontend/src
git commit -m "feat(frontend): them trang OAuth callback + hoan thien ho so Facebook"
```

---

## Task 7: Verify end-to-end + cập nhật README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tất cả từ task 1-6
- Produces: (không có code)

- [ ] **Step 1: Chạy toàn bộ test backend**

```powershell
cd backend
.\mvnw.cmd -o test
```
Expected: `Tests run: N, Failures: 0, Errors: 0` + `BUILD SUCCESS`.

- [ ] **Step 2: Chạy type-check + build frontend**

```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
npm run build
```
Expected: không lỗi TS, build thành công.

- [ ] **Step 3: Verify app khởi động được (không cần credential)**

```powershell
cd backend
.\mvnw.cmd -o -q package -DskipTests
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```
Expected log: `Started BackendApplication` + `Current version of schema "public": 8`.

- [ ] **Step 4: Verify endpoint providers trả về rỗng khi chưa cấu hình credential**

```powershell
curl.exe -s http://localhost:8080/api/auth/oauth/providers
```
Expected: `{"code":200,"message":"OK","data":{"providers":[]}}` (vì `GOOGLE_CLIENT_ID` chưa set).

- [ ] **Step 5: Verify với credential thật (cần user cấp)**

Đặt `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET` vào env, restart backend, rồi kiểm tra theo danh sách trong spec §10 "Verify thủ công".

Nếu user chưa cấp credential → ghi rõ "chưa verify được" trong báo cáo, KHÔNG tự nhận là xong.

- [ ] **Step 6: Cập nhật README**

Trong `README.md`:
1. Mục **"📈 Tiến trình dự án"** → thêm các hàng mới vào giai đoạn 1:
   - `| 1.17 | Đăng nhập Google (OIDC) — redirect + ticket dùng-một-lần | ✅ |`
   - `| 1.18 | Đăng nhập Facebook + hoàn thiện hồ sơ (email + SĐT OTP) | ✅ |`
   - `| 1.19 | UNIQUE (provider, provider_user_id) + gộp tài khoản chỉ khi email_verified | ✅ |`
2. Mục **"🌐 API Endpoints"** → thêm 4 dòng:

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/auth/oauth/providers` | Public | Danh sách provider OAuth đang bật |
| GET | `/api/auth/oauth/ticket/{ticket}` | Public | Trạng thái ticket (READY / NEEDS_PROFILE) |
| POST | `/api/auth/oauth/exchange` | Public | Đổi ticket lấy access + refresh token |
| POST | `/api/auth/oauth/facebook/complete` | Public | Hoàn thiện hồ sơ Facebook (email + SĐT + OTP) |

3. Mục **"🚀 Công nghệ sử dụng"** → thêm vào phần Backend: `- Spring Security OAuth2 Client (Google OIDC · Facebook Login)`.
4. Mục cài đặt → bổ sung hướng dẫn đặt biến môi trường OAuth (ngắn gọn, trỏ tới design doc).

- [ ] **Step 7: Commit**

```powershell
git add README.md
git commit -m "docs(readme): cap nhat tien trinh va API endpoints cho dang nhap OAuth"
```

---

## Self-review

**1. Spec coverage**

| Mục trong spec | Task |
|---|---|
| §6 — bảng `oauth_accounts` + `oauth_tickets` | Task 1 |
| §6 — `user_id` NULL = ticket chờ | Task 1, Task 3 |
| §7 — `OAuthUserInfo` + extractor | Task 2 |
| §7 — `OAuthTicketService` | Task 3 |
| §7 — `OAuthAuthService` (tìm/tạo/gộp) | Task 4 |
| §7 — `AuthService.issueTokens()` | Task 4 Step 4 |
| §7 — `OAuthSuccessHandler` / `OAuthFailureHandler` | Task 5 |
| §7 — `OAuthController` 4 endpoint | Task 5 |
| §7 — `SecurityConfig` permitAll + oauth2Login | Task 5 |
| §7 — properties provider | Task 5 |
| §8 — FE API client + AuthContext + 2 page + nút social | Task 6 |
| §9 — bảo mật: chỉ Google gộp | Task 2 (extractor), Task 4 (service) |
| §9 — bảo mật: JWT không trong URL | Task 3 (ticket), Task 5 (handler) |
| §9 — bảo mật: user OAuth không login bằng mật khẩu | Task 4 (createUser) |
| §9 — bảo mật: chống spam FB nhờ rate-limit sẵn có | Task 4 (`verifyOtp` tái dùng `OtpService`) |
| §10 — test | Task 1, 2, 3, 4, 5 |
| §11 — hướng dẫn đăng ký provider | Design doc (không cần task code) |
| Job dọn ticket | Task 1 Step 6 |
| README | Task 7 |

→ Không có gap.

**2. Step scan** — mỗi step có 1 hành động kiểm chứng được: test failing → run fail → implement → run pass → commit. Không có step "xử lý edge case" hay "viết test cho trên".

**3. Type consistency**

| Kiểu | Task định nghĩa | Task dùng |
|---|---|---|
| `OAuthUserInfo` | Task 2: `(String provider, String providerUserId, String email, boolean emailVerified, String fullName)` | Task 4, Task 5 dùng đúng thứ tự |
| `OAuthLoginOutcome` | Task 4: `(String status, OAuthUserInfo userInfo, String userId, String ticket)` + 2 factory | Task 5 dùng `outcome.status()`, `outcome.ticket()`, `outcome.userInfo()` |
| `OAuthTicketStatus` | Task 5: `(String status, String provider, String fullName)` | Task 6 dùng `t.status`, `t.fullName` |
| `AuthService.issueTokens(User) -> AuthResponse` | Task 4 Step 4 | Task 5 `authService.issueTokens(user)` |
| `OAuthTicketService.consume/peek/attachUser` | Task 3 | Task 4 `ticketService.attachUser(...)`, `ticketService.peek(...)`; Task 5 `ticketService.consume(...)`, `ticketService.peek(...)` |
| `OAuthAuthService.handleCallback(OAuthUserInfo) -> OAuthLoginOutcome` | Task 4 | Task 5 handler gọi đúng |
| `OAuthAuthService.completeFacebookProfile(String,String,String,String) -> String` | Task 4 | Task 5 controller gọi đúng |
| FE `authApi.oauthProviders() -> Promise<OAuthProviders>` | Task 6 Step 2 | Task 6 Step 6 dùng `res.providers` |
| FE `useAuth().loginWithTicket(ticket) -> Promise<User>` | Task 6 Step 3 | Task 6 Step 4/5 dùng đúng |

→ Nhất quán.

**4. Review Focus** — mỗi dòng đã có test ghim:
1. `email_verified` dạng chuỗi → Task 2 Step 1 `google_stringTrue_verified`
2. User OAuth login bằng mật khẩu → Task 4 Step 1 `oauthUser_passwordIsRandomHash`
3. Email FB trùng → Task 4 Step 1 `facebook_existingEmail_throwsConflict`
4. Ticket dùng 2 lần / quá hạn → Task 3 Step 1 `consume_twice_throws`, `consume_expired_throws`
5. 2 tab đăng nhập Google đồng thời → Task 1 Step 1 `duplicateProviderUserId_violatesUniqueConstraint`

→ Đủ 5/5.

**5. Proportion** — plan ~900 dòng cho spec ~470 dòng. Các block code chủ yếu là test + entity + DTO (bản chất phải chính xác tuyệt đối về tên cột/tên hàm — đó là "decisions the implementer cannot make alone"). Phần logic nghiệp vụ được mô tả bằng hành vi + tên test, không dump toàn bộ thân hàm.

---

## Ghi chú cho người thực thi

**Về việc dùng `MockOAuth2User`:** Task 5 dùng `OAuth2User` thật (constructor trực tiếp) — không cần `MockOAuth2User` → **không** thêm dependency `spring-security-test` cho việc này.

**Về `spring-boot-starter-security-oauth2-client`:** cần network để Maven tải artifact (không có trong local `.m2`). Nếu build offline (`-o`) báo lỗi thiếu artifact → chạy **không** dùng `-o` cho lần build đầu.

**Về constructor injection trong handler:** `OAuthSuccessHandler` và `OAuthFailureHandler` dùng **constructor injection** cho `frontendRedirectUri` (không phải `@Value` trên field) — vì test instantiate trực tiếp, mà `@Value` trên field sẽ không được set → luôn null. Code ở Task 5 Step 4/5 đã viết theo cách này.

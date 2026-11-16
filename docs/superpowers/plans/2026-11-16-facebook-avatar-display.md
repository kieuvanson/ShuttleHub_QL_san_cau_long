# Hiển thị avatar & tên rút gọn sau đăng nhập Facebook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sau khi đăng nhập bằng Facebook, header và ô viết bài đầu feed hiển thị avatar Facebook thật + tên rút gọn ("Kieu Van Son" → "Son"), còn tên đầy đủ vẫn giữ trong DB và trang cá nhân.

**Architecture:** Backend lấy `picture.data.url` từ Graph API (thêm `picture.type(large)` vào `userInfoUri`), lưu vào cột `users.avatar_url` (nullable) + `oauth_tickets.avatar_url` (để nhánh xác minh SĐT mang được avatar qua ticket). `UserDto` trả `avatarUrl` cho frontend. Frontend có helper `shortDisplayName()` rút gọn họ tên lấy từ cuối, và component `UserAvatar` bọc `Avatar` của Astryx (tự fallback về chữ cái đầu khi ảnh lỗi / không có URL).

**Tech Stack:** Spring Boot 4.1.1 · Java 25 · Spring Security OAuth2 · PostgreSQL + Flyway · Vite + React 19 + TypeScript · Vitest + Testing Library · `@astryxdesign/core`

**Spec:** `docs/superpowers/specs/2026-11-16-facebook-avatar-display-design.md`

---

## Global Constraints

- Trả lời + comment tiếng Việt; tên biến/hàm/class tiếng Anh.
- `ddl-auto=validate` → **mọi** thay đổi schema phải có file migration Flyway mới; không sửa file migration đã chạy.
- **1 thay đổi schema = 1 file migration.** Cột `avatar_url` cho `users` + `oauth_tickets` nằm trong **cùng 1 file** `V9__add_avatar_url.sql`.
- Không dùng `@Size`/`@NotBlank` trên entity; đặt `length` trong `@Column`.
- Comment tiếng Việt giải thích **tại sao**, không phải **cái gì**.
- Frontend: không dùng `any`; gọi API qua `src/api/client.ts`; CSS cùng file component; màu lấy từ `src/styles/tokens.css`.
- Lỗi 500 không trả `ex.getMessage()` cho client.
- TDD bắt buộc: viết test fail → xem fail → code tối thiểu → xem pass → commit.
- Không commit `application.properties`, `.env`.
- Không tự `git push`.

## Review Focus

Năm lớp input/lỗi mà spec hàm ý nhưng không task nào test trực tiếp — mỗi dòng dưới đây được ghim bằng một test trong task sở hữu code đó:

1. **Ảnh Facebook hết hạn / trả 404** → avatar phải fallback về chữ cái đầu, không vỡ layout. *(Task 6 — `UserAvatar.test.tsx`)*
2. **User đăng ký bằng email/mật khẩu (không OAuth)** → `avatarUrl = null` → avatar hiện chữ cái đầu, không hiện ảnh vỡ. *(Task 6 — `UserAvatar.test.tsx`)*
3. **Facebook không trả claim `picture`** → `avatarUrl = null`, không crash. *(Task 2 — `OAuthUserInfoExtractorTest`)*
4. **Tên Facebook chỉ có 1 từ** ("Son") → rút gọn vẫn ra "Son", không trả rỗng. *(Task 5 — `displayName.test.ts`)*
5. **`full_name` rỗng / chỉ khoảng trắng** → rút gọn trả `null` → component fallback sang `username`. *(Task 5 — `displayName.test.ts`)*

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `backend/src/main/resources/db/migration/V9__add_avatar_url.sql` | Thêm cột `avatar_url` cho `users` + `oauth_tickets` |
| `backend/.../entity/User.java` | Field `avatarUrl` |
| `backend/.../entity/OAuthTicket.java` | Field `avatarUrl` |
| `backend/.../auth/oauth/OAuthUserInfo.java` | Field `avatarUrl` trong record + constructor 5 tham số (tương thích) |
| `backend/.../auth/oauth/OAuthUserInfoExtractor.java` | Đọc `picture.data.url` |
| `backend/.../config/OAuth2ClientConfig.java` | `userInfoUri` có `picture.type(large)` |
| `backend/.../auth/oauth/OAuthTicketService.java` | `issuePending()` mang `avatarUrl` |
| `backend/.../auth/service/OAuthAuthService.java` | Lưu / cập nhật avatar ở mọi nhánh Facebook |
| `backend/.../auth/dto/UserDto.java` | Field `avatarUrl` |
| `backend/.../auth/dto/OAuthTicketStatus.java` | Field `avatarUrl` |
| `backend/.../auth/service/AuthService.java` | `toUserDto()` truyền `avatarUrl` |
| `backend/.../auth/service/ProfileService.java` | Dựng `UserDto` truyền `avatarUrl` |
| `frontend/src/utils/displayName.ts` | `shortDisplayName()` — rút gọn họ tên |
| `frontend/src/utils/displayName.test.ts` | Test cho hàm trên |
| `frontend/src/components/UserAvatar.tsx` | Wrapper `Avatar` của Astryx, dùng chung |
| `frontend/src/components/UserAvatar.test.tsx` | Test component |
| `frontend/src/components/Header.tsx` | Avatar + tên rút gọn ở nút user |
| `frontend/src/components/Header.test.tsx` | Test header |
| `frontend/src/components/feed/FeedComposer.tsx` | Avatar thật ở ô viết bài |
| `frontend/src/components/feed/FeedComposer.test.tsx` | Test composer |
| `frontend/src/components/feed/Feed.tsx` | Truyền `user` xuống `FeedComposer` |
| `frontend/src/api/types.ts` | `User.avatarUrl`, `OAuthTicketStatus.avatarUrl` |

---

## Task 1: Migration + entity `avatarUrl`

**Files:**
- Create: `backend/src/main/resources/db/migration/V9__add_avatar_url.sql`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/entity/User.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthTicket.java`

**Interfaces:**
- Consumes: (không có)
- Produces: `User.getAvatarUrl(): String`, `User.setAvatarUrl(String)`, `OAuthTicket.getAvatarUrl(): String`, `OAuthTicket.setAvatarUrl(String)`. Schema: `users.avatar_url VARCHAR(500)`, `oauth_tickets.avatar_url VARCHAR(500)`.

> Migration + entity là **thay đổi schema**, không có test hành vi riêng. Xác minh bằng `ddl-auto=validate`: nếu entity lệch với schema thì app **fail lúc start** → đó là "test" của task này. Test hành vi của avatar thuộc Task 2/3.

- [ ] **Step 1: Viết file migration**

`backend/src/main/resources/db/migration/V9__add_avatar_url.sql`:

```sql
-- =====================================================================
-- V9__add_avatar_url.sql
-- Thêm cột avatar_url cho user + ticket OAuth.
--
-- ⚠️ Vì sao lưu URL ảnh thay vì dựng động?
--   URL ảnh Facebook (picture.data.url) có chữ ký tạm thời → dựng động
--   cần access token và tốn 1 request mỗi lần render. Ta lưu lại lúc
--   đăng nhập và cập nhật mỗi lần user đăng nhập Facebook lại.
--   Ảnh hỏng (URL hết hạn) → frontend fallback về chữ cái đầu.
--
-- ⚠️ users.avatar_url NULL = user không đăng nhập qua OAuth.
--
-- Bảng này được Flyway quản lý (ddl-auto=validate ⇒ Hibernate KHÔNG tự
-- tạo/sửa bảng, chỉ kiểm tra schema có khớp entity hay không).
-- =====================================================================

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE oauth_tickets ADD COLUMN avatar_url VARCHAR(500);
```

- [ ] **Step 2: Thêm field vào entity `User`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/entity/User.java`, thêm ngay **sau** field `fullName`:

```java
    @Column(name = "avatar_url", length = 500)
    // ⚠️ NULL = user không đăng nhập qua OAuth → frontend hiện chữ cái đầu.
    // length 500: URL ảnh Facebook (có chữ ký query) có thể dài vài trăm ký tự.
    private String avatarUrl;
```

- [ ] **Step 3: Thêm field vào entity `OAuthTicket`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthTicket.java`, thêm ngay **sau** field `fullName`:

```java
    @Column(name = "avatar_url", length = 500)
    // ⚠️ Vì sao ticket cũng cần avatar? Nhánh Facebook không trả email →
    //   user phải xác minh SĐT bằng OTP trước khi tạo tài khoản. Avatar
    //   phải sống sót qua bước chờ đó → mang theo trong ticket.
    private String avatarUrl;
```

- [ ] **Step 4: Verify schema khớp entity — chạy app thật**

Run:
```powershell
cd backend
.\mvnw.cmd -o -q package -DskipTests
.\mvnw.cmd spring-boot:run
```
Expected: log có `Started BackendApplication` và **không** có `Schema-validation: missing column` / `wrong column type`. Nếu lỗi schema → app không start, tức entity lệch migration.

**Nếu app đang chạy sẵn ở port 8080**, kill tiến trình cũ trước:
```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id <pid> -Force
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V9__add_avatar_url.sql backend/src/main/java/vn/ShuttleHub/backend/entity/User.java backend/src/main/java/vn/ShuttleHub/backend/entity/OAuthTicket.java
git commit -m "feat(auth): them cot avatar_url cho users va oauth_tickets"
```

---

## Task 2: Lấy avatar từ Graph API

**Files:**
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfo.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractor.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/config/OAuth2ClientConfig.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractorTest.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/config/OAuth2ClientConfigTest.java`

**Interfaces:**
- Consumes: (không có)
- Produces:
  - `OAuthUserInfo` record mới — 6 thành phần: `OAuthUserInfo(String provider, String providerUserId, String email, boolean emailVerified, String fullName, String avatarUrl)`. `avatarUrl` là tham số **cuối cùng**.
  - Constructor tương thích 5 tham số: `OAuthUserInfo(String provider, String providerUserId, String email, boolean emailVerified, String fullName)` → `avatarUrl = null`. **Bắt buộc** để 6 call site cũ (`OAuthSuccessHandlerTest` ×2, `OAuthAuthServiceTest` ×4) không phải sửa.
  - `OAuthUserInfoExtractor.extract(OAuth2User, String): OAuthUserInfo` — chữ ký không đổi, giá trị trả về có thêm `avatarUrl()`.

- [ ] **Step 1: Viết test fail — đọc `picture.data.url`**

Thêm vào `backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractorTest.java`:

```java
    @Test
    @DisplayName("Facebook: picture.data.url → avatarUrl lấy đúng URL ảnh")
    void facebook_pictureUrl_extracted() {
        OAuth2User u = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority("ROLE_USER", Map.of("id", "fb-1"), "id")),
                Map.of(
                        "id", "fb-1",
                        "name", "Kieu Van Son",
                        "picture", Map.of("data", Map.of("url", "https://cdn.fb/son.jpg"))),
                "id");

        assertEquals("https://cdn.fb/son.jpg", extractor.extract(u, "facebook").avatarUrl());
    }

    @Test
    @DisplayName("Facebook: thiếu claim picture → avatarUrl = null (không lỗi)")
    void facebook_missingPicture_null() {
        OAuth2User u = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority("ROLE_USER", Map.of("id", "fb-1"), "id")),
                Map.of("id", "fb-1", "name", "Kieu Van Son"),
                "id");

        assertNull(extractor.extract(u, "facebook").avatarUrl());
    }

    @Test
    @DisplayName("Facebook: picture không có data → avatarUrl = null (không lỗi)")
    void facebook_pictureWithoutData_null() {
        OAuth2User u = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority("ROLE_USER", Map.of("id", "fb-1"), "id")),
                Map.of("id", "fb-1", "name", "Kieu Van Son", "picture", Map.of()),
                "id");

        assertNull(extractor.extract(u, "facebook").avatarUrl());
    }
```

- [ ] **Step 2: Run test để verify fail**

Run:
```powershell
cd backend
.\mvnw.cmd -o test -Dtest=OAuthUserInfoExtractorTest
```
Expected: **FAIL** — lỗi compile `cannot find symbol: method avatarUrl()`.

- [ ] **Step 3: Thêm field + constructor tương thích vào `OAuthUserInfo`**

Thay toàn bộ record trong `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfo.java`:

```java
public record OAuthUserInfo(
    String provider,
    String providerUserId,
    String email,
    boolean emailVerified,
    String fullName,
    String avatarUrl
) {
    /** Provider duy nhất được phép cung cấp cờ email_verified đáng tin. */
    public static final String GOOGLE = "google";
    public static final String FACEBOOK = "facebook";

    /**
     * Constructor 5 tham số — tương thích ngược cho provider không có
     * ảnh đại diện (Google không trả claim `picture`).
     */
    public OAuthUserInfo(String provider, String providerUserId, String email,
                         boolean emailVerified, String fullName) {
        this(provider, providerUserId, email, emailVerified, fullName, null);
    }
}
```

- [ ] **Step 4: Implement đọc `picture.data.url`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractor.java`:

**(i)** Sửa dòng `String fullName = resolveFullName(claims);` → thêm dòng ngay sau:

```java
        String avatarUrl = resolveAvatarUrl(claims);
```

**(ii)** Sửa dòng `return new OAuthUserInfo(provider, providerUserId, email, emailVerified, fullName);` →

```java
        return new OAuthUserInfo(provider, providerUserId, email, emailVerified, fullName, avatarUrl);
```

**(iii)** Thêm method mới, đặt ngay sau method `resolveFullName`:

```java
    /**
     * Lấy URL ảnh đại diện từ claim `picture` của provider.
     *
     * ⚠️ Facebook trả `picture` dạng object lồng nhau: { data: { url } }.
     * Google KHÔNG trả claim này → luôn null → frontend hiện chữ cái đầu.
     *
     * ⚠️ Đọc bằng `instanceof` (không ép kiểu cứng) vì shape của claim phụ
     * thuộc provider và có thể đổi theo phiên bản Graph API.
     */
    private String resolveAvatarUrl(Map<String, Object> claims) {
        Object picture = claims.get("picture");
        if (!(picture instanceof Map<?, ?> pictureMap)) {
            return null;
        }
        Object data = pictureMap.get("data");
        if (!(data instanceof Map<?, ?> dataMap)) {
            return null;
        }
        return asString(dataMap.get("url"));
    }
```

- [ ] **Step 5: Run test để verify pass**

Run:
```powershell
cd backend
.\mvnw.cmd -o test -Dtest=OAuthUserInfoExtractorTest
```
Expected: **PASS** — 9 test (6 cũ + 3 mới).

- [ ] **Step 6: Viết test fail — `userInfoUri` phải yêu cầu `picture.type(large)`**

Thêm vào `backend/src/test/java/vn/ShuttleHub/backend/config/OAuth2ClientConfigTest.java`:

```java
    @Test
    @DisplayName("Facebook: userInfoUri yêu cầu picture.type(large) để lấy ảnh đại diện")
    void facebook_userInfoUri_requestsPicture() {
        ClientRegistrationRepository repo =
                configWith("", "fid", "v27.0").clientRegistrationRepository();

        ClientRegistration fb = repo.findByRegistrationId("facebook");

        assertTrue(userInfoUri(fb).contains("picture.type(large)"),
                "userInfoUri phải yêu cầu picture: " + userInfoUri(fb));
    }
```

- [ ] **Step 7: Run test để verify fail**

Run:
```powershell
cd backend
.\mvnw.cmd -o test -Dtest=OAuth2ClientConfigTest
```
Expected: **FAIL** — `userInfoUri` không chứa `picture.type(large)`.

- [ ] **Step 8: Implement — thêm `picture.type(large)`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/config/OAuth2ClientConfig.java`, sửa dòng:

```java
                .userInfoUri("https://graph.facebook.com/v" + v + "/me?fields=id,name,email,picture.type(large)")
```

- [ ] **Step 9: Run test để verify pass**

Run:
```powershell
cd backend
.\mvnw.cmd -o test -Dtest=OAuth2ClientConfigTest
```
Expected: **PASS** — 6 test (5 cũ + 1 mới).

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfo.java backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractor.java backend/src/main/java/vn/ShuttleHub/backend/config/OAuth2ClientConfig.java backend/src/test/java/vn/ShuttleHub/backend/auth/oauth/OAuthUserInfoExtractorTest.java backend/src/test/java/vn/ShuttleHub/backend/config/OAuth2ClientConfigTest.java
git commit -m "feat(auth): lay avatar tu Graph API picture.data.url"
```

---

## Task 3: Lưu avatar khi đăng nhập Facebook

**Files:**
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java`

**Interfaces:**
- Consumes: `OAuthUserInfo.avatarUrl()` (Task 2), `User.avatarUrl` / `OAuthTicket.avatarUrl` (Task 1).
- Produces:
  - `OAuthTicketService.issuePending(String provider, String providerUserId, String fullName, String avatarUrl): String` — **thêm tham số cuối**.
  - `OAuthAuthService.createUser(String email, String fullName, String avatarUrl): User` (private, đổi chữ ký).
  - Hành vi mới: đăng nhập Facebook lần 2 **cập nhật** `users.avatar_url` nếu URL mới khác.

> **Lưu ý cho implementer:** file test hiện có dùng Mockito (`@Mock UserRepository`, `ArgumentCaptor<User>`). Bám theo đúng cách setup đã có trong file — KHÔNG tự chế repo mới.

- [ ] **Step 1: Viết test fail — nhánh tạo user mới lưu avatar**

Thêm vào `backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java`:

```java
    @Test
    @DisplayName("Facebook + email mới → user mới lưu avatar_url")
    void facebook_withEmail_savesAvatar() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("newfb@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-fb");
            return u;
        });
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t-fb");

        service.handleCallback(new OAuthUserInfo(
                "facebook", "fb-1", "newfb@x.com", false, "Kieu Van Son", "https://cdn.fb/son.jpg"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("https://cdn.fb/son.jpg", captor.getValue().getAvatarUrl());
    }
```

- [ ] **Step 2: Viết test fail — nhánh "đã liên kết" cập nhật avatar**

```java
    @Test
    @DisplayName("Facebook đăng nhập lại → avatar_url được cập nhật nếu URL mới")
    void facebook_relogin_updatesAvatar() {
        OAuthAccount link = OAuthAccount.builder().id("oa-1").userId("u-1")
                .provider("facebook").providerUserId("fb-1")
                .emailAtRegistration("a@x.com").createdAt(LocalDateTime.now()).build();
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.of(link));
        User u = User.builder().id("u-1").email("a@x.com").username("u1")
                .password("h").role(Role.CUSTOMER).isActive(true)
                .avatarUrl("https://cdn.fb/old.jpg").build();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t4");

        service.handleCallback(new OAuthUserInfo(
                "facebook", "fb-1", "a@x.com", false, "Kieu Van Son", "https://cdn.fb/new.jpg"));

        assertEquals("https://cdn.fb/new.jpg", u.getAvatarUrl());
    }
```

- [ ] **Step 3: Viết test fail — nhánh xác minh SĐT mang avatar từ ticket**

```java
    @Test
    @DisplayName("Verify SĐT: user mới lưu avatar lấy từ ticket chờ")
    void verifyPhoneAndCreateUser_savesAvatarFromTicket() {
        OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
                .provider("facebook").providerUserId("fb-1").fullName("Kieu Van Son")
                .avatarUrl("https://cdn.fb/son.jpg")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(ticketService.peek("pending-1")).thenReturn(pending);
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(false);
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-fb");
            return u;
        });

        service.verifyPhoneAndCreateUser("pending-1", "84912345678", "123456");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("https://cdn.fb/son.jpg", captor.getValue().getAvatarUrl());
    }
```

- [ ] **Step 4: Run test để verify fail**

Run:
```powershell
cd backend
.\mvnw.cmd -o test -Dtest=OAuthAuthServiceTest
```
Expected: **FAIL** — 3 test mới fail: `expected: <https://cdn.fb/son.jpg> but was: <null>` (hoặc compile error nếu `getAvatarUrl()` chưa tồn tại trên `User` — khi đó Task 1 chưa xong).

- [ ] **Step 5: Implement — `OAuthTicketService.issuePending()` mang avatar**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketService.java`:

**(i)** Sửa method `issuePending`:
```java
    @Transactional
    public String issuePending(String provider, String providerUserId, String fullName, String avatarUrl) {
        return save(provider, providerUserId, fullName, avatarUrl, null, pendingTtlSeconds);
    }
```

**(ii)** Sửa method `issueForUser`:
```java
    @Transactional
    public String issueForUser(String userId, String provider, String providerUserId) {
        return save(provider, providerUserId, null, null, userId, ttlSeconds);
    }
```

**(iii)** Sửa method `save`:
```java
    private String save(String provider, String providerUserId, String fullName, String avatarUrl,
                        String userId, int ttl) {
        String ticket = generateTicket();
        repo.save(OAuthTicket.builder()
                .ticket(ticket)
                .userId(userId)
                .provider(provider)
                .providerUserId(providerUserId)
                .fullName(fullName)
                .avatarUrl(avatarUrl)
                .expiresAt(LocalDateTime.now().plusSeconds(ttl))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build());
        return ticket;
    }
```

- [ ] **Step 6: Implement — `OAuthAuthService` lưu / cập nhật avatar**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`:

**(i)** Nhánh "đã liên kết trước đây" — sửa đoạn:
```java
            assertActive(user);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
```
thành:
```java
            assertActive(user);
            // ⚠️ Cập nhật avatar mỗi lần đăng nhập lại — user có thể đã
            //   đổi ảnh trên Facebook. URL cũ có thời hạn nên phải làm mới.
            refreshAvatar(user, info.avatarUrl());
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
```

**(ii)** Nhánh gộp vào user có sẵn (`existing.isPresent()`) — sửa đoạn:
```java
            User user = existing.get();
            assertActive(user);
            linkAccount(user.getId(), info, email);
```
thành:
```java
            User user = existing.get();
            assertActive(user);
            refreshAvatar(user, info.avatarUrl());
            linkAccount(user.getId(), info, email);
```

**(iii)** Nhánh tạo user mới — sửa:
```java
        User user = userRepo.save(createUser(email, info.fullName()));
```
thành:
```java
        User user = userRepo.save(createUser(email, info.fullName(), info.avatarUrl()));
```

**(iv)** Nhánh xác minh SĐT — sửa:
```java
        User user = createUser(tempEmail, pending.getFullName());
```
thành:
```java
        User user = createUser(tempEmail, pending.getFullName(), pending.getAvatarUrl());
```

**(v)** Sửa method `createUser` — đổi chữ ký + set avatar:
```java
    private User createUser(String email, String fullName, String avatarUrl) {
```
và trong builder, thêm `.avatarUrl(avatarUrl)` ngay sau `.fullName(fullName)`.

**(vi)** Thêm method mới `refreshAvatar`, đặt ngay sau `createUser`:
```java
    /**
     * Làm mới avatar của user nếu provider trả về URL mới.
     *
     * ⚠️ Vì sao cần? URL ảnh Facebook có thời hạn → ảnh cũ sẽ hỏng. Lần
     *   đăng nhập tiếp theo là cơ hội lấy URL mới.
     *
     * ⚠️ Vì sao không ghi khi URL null? Provider có thể không trả `picture`
     *   (user chưa đặt ảnh, hoặc quyền bị thu hồi) → giữ ảnh cũ còn hơn
     *   làm mất ảnh đang hiển thị tốt.
     */
    private void refreshAvatar(User user, String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return;
        }
        if (avatarUrl.equals(user.getAvatarUrl())) {
            return;
        }
        user.setAvatarUrl(avatarUrl);
        user.setUpdatedAt(LocalDateTime.now());
        userRepo.save(user);
    }
```

- [ ] **Step 7: Run test để verify pass**

Run:
```powershell
cd backend
.\mvnw.cmd -o test -Dtest=OAuthAuthServiceTest
```
Expected: **PASS** — tất cả test (cũ + 3 mới).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/vn/ShuttleHub/backend/auth/oauth/OAuthTicketService.java backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java
git commit -m "feat(auth): luu va cap nhat avatar khi dang nhap Facebook"
```

---

## Task 4: Trả `avatarUrl` cho frontend

**Files:**
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/UserDto.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/ProfileService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`

**Interfaces:**
- Consumes: `User.avatarUrl` (Task 1), `OAuthTicket.avatarUrl` (Task 1).
- Produces:
  - `UserDto(String id, String username, String email, String fullName, String phoneNumber, String role, LocalDateTime createdAt, String avatarUrl)` — `avatarUrl` **cuối cùng**.
  - `OAuthTicketStatus(String status, String provider, String fullName, String avatarUrl)` — `avatarUrl` **cuối cùng**.

- [ ] **Step 1: Viết test fail — `UserDto` mang `avatarUrl`**

Thêm vào `backend/src/test/java/vn/ShuttleHub/backend/auth/service/ProfileServiceTest.java` (file này đã có sẵn `ProfileService` + `UserRepository` mock):

```java
    @Test
    @DisplayName("UserDto trả avatarUrl của user")
    void toUserDto_includesAvatarUrl() {
        // ... setup user với avatarUrl, theo cách setup sẵn có trong file
        UserDto dto = service.getProfile(userId);   // điền đúng tên method hiện có
        assertEquals("https://cdn.fb/son.jpg", dto.avatarUrl());
    }
```

> **Lưu ý cho implementer:** đọc `ProfileServiceTest.java` trước và bám theo đúng tên method + cách setup đã có trong file.

- [ ] **Step 2: Run test để verify fail**

Run:
```powershell
cd backend
.\mvnw.cmd -o test -Dtest=ProfileServiceTest
```
Expected: **FAIL** — compile error `cannot find symbol: method avatarUrl()`.

- [ ] **Step 3: Implement — `UserDto` + `OAuthTicketStatus`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/dto/UserDto.java`:
```java
public record UserDto(
    String id,
    String username,
    String email,
    String fullName,
    String phoneNumber,
    String role,
    LocalDateTime createdAt,
    String avatarUrl
) {}
```

`backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java`:
```java
public record OAuthTicketStatus(
        String status,      // "READY" | "NEEDS_PHONE"
        String provider,
        String fullName,
        String avatarUrl
) {
    public static final String READY = "READY";
    public static final String NEEDS_PHONE = "NEEDS_PHONE";
}
```

- [ ] **Step 4: Implement — sửa 2 chỗ dựng `UserDto`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java`, trong `toUserDto(User user)`:
```java
        return new UserDto(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFullName(),
            user.getPhoneNumber(),
            user.getRole().name(),
            user.getCreatedAt(),
            user.getAvatarUrl()
        );
```

`backend/src/main/java/vn/ShuttleHub/backend/auth/service/ProfileService.java`:
```java
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getAvatarUrl()
        );
```

- [ ] **Step 5: Implement — `OAuthController` trả `avatarUrl` trong ticket status**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`, tìm chỗ dựng `OAuthTicketStatus` và thêm `t.getAvatarUrl()` làm tham số cuối.

- [ ] **Step 6: Run test để verify pass**

Run:
```powershell
cd backend
.\mvnw.cmd -o test
```
Expected: **PASS** — toàn bộ test backend xanh (bao gồm `OAuthControllerIntegrationTest`).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/vn/ShuttleHub/backend/auth/dto/UserDto.java backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java backend/src/main/java/vn/ShuttleHub/backend/auth/service/ProfileService.java backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java backend/src/test/java/vn/ShuttleHub/backend/auth/service/ProfileServiceTest.java
git commit -m "feat(auth): tra avatarUrl trong UserDto va OAuthTicketStatus"
```

---

## Task 5: Frontend — rút gọn tên + type

**Files:**
- Create: `frontend/src/utils/displayName.ts`
- Create: `frontend/src/utils/displayName.test.ts`
- Modify: `frontend/src/api/types.ts`

**Interfaces:**
- Consumes: (không có)
- Produces:
  - `shortDisplayName(fullName: string | null | undefined): string | null` — trả `null` nếu `fullName` rỗng/không có; nếu tên có nhiều từ thì trả **từ cuối**; nếu 1 từ thì trả chính từ đó.
  - `User.avatarUrl: string | null`
  - `OAuthTicketStatus.avatarUrl: string | null`

- [ ] **Step 1: Viết test fail**

`frontend/src/utils/displayName.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shortDisplayName } from './displayName';

describe('shortDisplayName', () => {
  it('"Kieu Van Son" → "Son" (lấy từ cuối)', () => {
    expect(shortDisplayName('Kieu Van Son')).toBe('Son');
  });

  it('"Nguyễn Văn A" → "A"', () => {
    expect(shortDisplayName('Nguyễn Văn A')).toBe('A');
  });

  it('tên chỉ 1 từ → giữ nguyên', () => {
    expect(shortDisplayName('Son')).toBe('Son');
  });

  it('tên null → null', () => {
    expect(shortDisplayName(null)).toBeNull();
  });

  it('tên undefined → null', () => {
    expect(shortDisplayName(undefined)).toBeNull();
  });

  it('tên chỉ khoảng trắng → null', () => {
    expect(shortDisplayName('   ')).toBeNull();
  });

  it('tên nhiều khoảng trắng giữa → vẫn lấy đúng từ cuối', () => {
    expect(shortDisplayName('  Kieu   Van   Son  ')).toBe('Son');
  });
});
```

- [ ] **Step 2: Run test để verify fail**

Run:
```powershell
cd frontend
npm test -- src/utils/displayName.test.ts
```
Expected: **FAIL** — lỗi resolve `Cannot find module './displayName'`.

- [ ] **Step 3: Implement `shortDisplayName`**

`frontend/src/utils/displayName.ts`:

```ts
/**
 * Rút gọn họ tên lấy từ cuối — "Kieu Van Son" → "Son".
 *
 * ⚠️ Vì sao rút gọn ở tầng hiển thị chứ không lưu vào DB?
 *   DB giữ tên đầy đủ (trang cá nhân hiện "Kieu Van Son"), nhưng header và
 *   ô viết bài chỉ cần tên gọi để layout gọn. Rút gọn khi hiển thị giữ
 *   được dữ liệu gốc.
 *
 * @returns tên cuối, hoặc `null` nếu không có tên hợp lệ.
 */
export function shortDisplayName(
  fullName: string | null | undefined,
): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}
```

- [ ] **Step 4: Run test để verify pass**

Run:
```powershell
cd frontend
npm test -- src/utils/displayName.test.ts
```
Expected: **PASS** — 7 test.

- [ ] **Step 5: Cập nhật type API**

`frontend/src/api/types.ts`:

**(i)** Trong `interface User`, thêm field `avatarUrl` sau `createdAt`:
```ts
  createdAt: string;
  /** URL ảnh đại diện (Facebook) — null nếu user không đăng nhập qua OAuth */
  avatarUrl: string | null;
```

**(ii)** Trong `interface OAuthTicketStatus`, thêm:
```ts
  avatarUrl: string | null;
```

- [ ] **Step 6: Type-check**

Run:
```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
```
Expected: exit 0. **Nếu lỗi** vì `User` được dựng ở test/component khác thiếu `avatarUrl` → thêm `avatarUrl: null` vào các object `User` đó (grep `createdAt:` trong `frontend/src`).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/utils/displayName.ts frontend/src/utils/displayName.test.ts frontend/src/api/types.ts
git commit -m "feat(fe): them ham rut gon ten va type avatarUrl"
```

---

## Task 6: Frontend — component `UserAvatar`

**Files:**
- Create: `frontend/src/components/UserAvatar.tsx`
- Create: `frontend/src/components/UserAvatar.test.tsx`

**Interfaces:**
- Consumes: `shortDisplayName()` (Task 5), `Avatar` của `@astryxdesign/core/Avatar`.
- Produces:
  ```tsx
  type UserAvatarProps = {
    user: { fullName?: string | null; avatarUrl?: string | null; username?: string | null } | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  };
  export function UserAvatar({ user, size = 'md', className }: UserAvatarProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test fail**

`frontend/src/components/UserAvatar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('có avatarUrl → render ảnh với src đó', () => {
    render(<UserAvatar user={{ fullName: 'Kieu Van Son', avatarUrl: 'https://cdn.fb/son.jpg' }} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
  });

  it('không có avatarUrl → KHÔNG render ảnh, hiện chữ cái đầu của tên rút gọn', () => {
    render(<UserAvatar user={{ fullName: 'Kieu Van Son', avatarUrl: null }} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('user null → hiện chữ "K" (Khách), không vỡ render', () => {
    render(<UserAvatar user={null} />);

    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('tên rỗng → fallback sang username', () => {
    render(<UserAvatar user={{ fullName: '', avatarUrl: null, username: 'sonvankieu' }} />);

    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('alt text lấy từ tên rút gọn', () => {
    render(<UserAvatar user={{ fullName: 'Kieu Van Son', avatarUrl: 'https://cdn.fb/son.jpg' }} />);

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Son');
  });
});
```

> **Lưu ý cho implementer:** `Avatar` của Astryx có thể render ảnh với `role="img"` hoặc dùng `alt`. Nếu `getByRole('img')` không match vì `Avatar` dùng `<img alt=...>` — `<img>` CÓ `role="img"` mặc định trong testing-library, nên query này đúng. Nếu `Avatar` render chữ cái đầu bằng `<span>` không có text node trực tiếp → dùng `screen.getByText('S')` vẫn match (text node trong span con). Chạy test để xác nhận hành vi thật của `Avatar` và điều chỉnh query cho đúng.

- [ ] **Step 2: Run test để verify fail**

Run:
```powershell
cd frontend
npm test -- src/components/UserAvatar.test.tsx
```
Expected: **FAIL** — lỗi resolve `Cannot find module './UserAvatar'`.

- [ ] **Step 3: Implement `UserAvatar`**

`frontend/src/components/UserAvatar.tsx`:

```tsx
import { Avatar } from '@astryxdesign/core/Avatar';
import { shortDisplayName } from '../utils/displayName';

export type UserAvatarProps = {
  user: {
    fullName?: string | null;
    avatarUrl?: string | null;
    username?: string | null;
  } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/**
 * Avatar của user — dùng chung cho header và ô viết bài.
 *
 * ⚠️ Vì sao bọc `Avatar` của Astryx?
 *   `Avatar` đã tự hiện chữ cái đầu khi `src` lỗi hoặc thiếu → ta chỉ
 *   cần truyền `src` (nếu có) + `name` (tên rút gọn) là xong, không phải
 *   tự xử lý `onError`.
 *
 * ⚠️ Vì sao `name` dùng tên RÚT GỌN?
 *   Chữ cái đầu fallback phải khớp với tên hiển thị ("Son" → "S",
 *   không phải "Kieu Van Son" → "K").
 */
export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const displayName = shortDisplayName(user?.fullName) ?? user?.username ?? 'Khách';

  return (
    <Avatar
      src={user?.avatarUrl ?? undefined}
      name={displayName}
      size={size}
      className={className}
    />
  );
}
```

- [ ] **Step 4: Run test để verify pass**

Run:
```powershell
cd frontend
npm test -- src/components/UserAvatar.test.tsx
```
Expected: **PASS** — 5 test.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/UserAvatar.tsx frontend/src/components/UserAvatar.test.tsx
git commit -m "feat(fe): them component UserAvatar dung chung"
```

---

## Task 7: Frontend — dùng avatar + tên rút gọn ở Header và FeedComposer

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/components/Header.test.tsx`
- Modify: `frontend/src/components/feed/FeedComposer.tsx`
- Modify: `frontend/src/components/feed/FeedComposer.test.tsx`
- Modify: `frontend/src/components/feed/Feed.tsx`

**Interfaces:**
- Consumes: `UserAvatar` (Task 6), `shortDisplayName()` (Task 5).
- Produces:
  - `FeedComposerProps` thêm field: `user: User | null` — **bắt buộc** (không optional) để mọi call site phải truyền rõ.
  - `Header` không đổi chữ ký.

- [ ] **Step 1: Viết test fail — Header hiện tên rút gọn**

Thêm vào `frontend/src/components/Header.test.tsx`:

```tsx
  it('đã đăng nhập → header hiện tên rút gọn, không phải tên đầy đủ', async () => {
    localStorage.setItem('cld_user', JSON.stringify({
      id: 'u-1', username: 'sonvk', email: 'a@b.com',
      fullName: 'Kieu Van Son', phoneNumber: null,
      role: 'CUSTOMER', createdAt: '2026-01-01T00:00:00Z', avatarUrl: null,
    }));
    renderHeader();
    expect(await screen.findByText('Son')).toBeInTheDocument();
    expect(screen.queryByText('Kieu Van Son')).not.toBeInTheDocument();
  });
```

> **Lưu ý cho implementer:** key localStorage là `STORAGE_KEYS.user` — đọc `frontend/src/api/config.ts` để lấy đúng giá trị chuỗi thay vì hardcode `cld_user`. `AuthProvider` đọc user từ localStorage lúc khởi tạo (`readStoredUser`), nên set localStorage **trước** khi render.

- [ ] **Step 2: Viết test fail — FeedComposer hiện avatar user**

Thêm vào `frontend/src/components/feed/FeedComposer.test.tsx`:

```tsx
  it('có user đã đăng nhập → hiện avatar của user thay vì "Khách"', () => {
    render(
      <FeedComposer
        user={{ id: 'u-1', username: 'sonvk', email: 'a@b.com',
                fullName: 'Kieu Van Son', phoneNumber: null,
                role: 'CUSTOMER', createdAt: '2026-01-01T00:00:00Z',
                avatarUrl: 'https://cdn.fb/son.jpg' }}
        onOpenComposer={vi.fn()}
        onUnavailableFeature={vi.fn()}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
  });
```

- [ ] **Step 3: Run test để verify fail**

Run:
```powershell
cd frontend
npm test -- src/components/Header.test.tsx src/components/feed/FeedComposer.test.tsx
```
Expected: **FAIL** — Header chưa hiện "Son"; `FeedComposer` chưa nhận prop `user` (TypeScript lỗi ở test, hoặc test fail vì vẫn ra "Khách").

- [ ] **Step 4: Implement — `FeedComposer` nhận `user`**

`frontend/src/components/feed/FeedComposer.tsx`:

**(i)** Thay import `import {Avatar} from '@astryxdesign/core/Avatar';` → `import { UserAvatar } from '../UserAvatar';` và thêm `import type { User } from '../../api/types';`

**(ii)** Đổi props:
```tsx
export type FeedComposerProps = {
  user: User | null;
  onOpenComposer: (category: PostCategory) => void;
  onUnavailableFeature: (featureName: string) => void;
};
```

**(iii)** Đổi signature component:
```tsx
export function FeedComposer({user, onOpenComposer, onUnavailableFeature}: FeedComposerProps) {
```

**(iv)** Thay `<Avatar name="Khách" size="md" />` → `<UserAvatar user={user} size="md" />`

- [ ] **Step 5: Implement — `Feed.tsx` truyền `user`**

Trong `frontend/src/components/feed/Feed.tsx`, sửa:

```tsx
          <FeedComposer
            user={user}
            onOpenComposer={handleOpenComposer}
            onUnavailableFeature={handleUnavailableFeature}
          />
```

- [ ] **Step 6: Implement — `Header` dùng avatar + tên rút gọn**

Trong `frontend/src/components/Header.tsx`:

**(i)** Thay import `import { LogOut, User as UserIcon } from 'lucide-react';` → giữ `UserIcon` (vẫn dùng cho menu item "Trang cá nhân") và thêm:
```tsx
import { shortDisplayName } from '../utils/displayName';
import { UserAvatar } from './UserAvatar';
```

**(ii)** Sửa nút user:
```tsx
              <button
                type="button"
                className="hdr__user-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <UserAvatar user={user} size="sm" />
                <span>{shortDisplayName(user.fullName) ?? user.username}</span>
              </button>
```

**(iii)** Sửa khối thông tin trong menu (giữ tên **đầy đủ** — đây là chỗ user kiểm tra thông tin), thêm avatar nhỏ:
```tsx
                    <div className="hdr__user-info">
                      <UserAvatar user={user} size="sm" />
                      <span className="hdr__user-info-text">
                        <strong>{user.fullName || user.username}</strong>
                        <span>{user.email}</span>
                      </span>
                    </div>
```

**(iv)** Thêm CSS cho `.hdr__user-info` trong `frontend/src/components/Header.css`:
```css
.hdr__user-info {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.hdr__user-info-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
```

> Nếu `.hdr__user-info` đang có style cũ (ví dụ `display: block`), thay thay vì thêm để tránh xung đột.

- [ ] **Step 7: Sửa test cũ của `FeedComposer` cho khớp prop mới**

Các test cũ trong `frontend/src/components/feed/FeedComposer.test.tsx` render `<FeedComposer onOpenComposer=... onUnavailableFeature=... />` — thiếu prop `user` → TypeScript lỗi. Sửa mỗi chỗ thêm `user={null}`.

- [ ] **Step 8: Run test để verify pass**

Run:
```powershell
cd frontend
npm test -- src/components/Header.test.tsx src/components/feed/FeedComposer.test.tsx src/components/feed/Feed.test.tsx
```
Expected: **PASS**.

- [ ] **Step 9: Type-check + build**

Run:
```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
npm run build
```
Expected: `tsc` exit 0, build thành công.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/components/Header.css frontend/src/components/Header.test.tsx frontend/src/components/feed/FeedComposer.tsx frontend/src/components/feed/FeedComposer.test.tsx frontend/src/components/feed/Feed.tsx
git commit -m "feat(fe): hien avatar va ten rut gon o header va o viet bai"
```

---

## Task 8: Verify toàn bộ + cập nhật README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: mọi thay đổi Task 1–7.
- Produces: mục "📈 Tiến trình dự án" + "🌐 API Endpoints" của `README.md` được cập nhật.

- [ ] **Step 1: Chạy toàn bộ test backend**

```powershell
cd backend
.\mvnw.cmd -o test
```
Expected: **BUILD SUCCESS**, `Tests run: N, Failures: 0, Errors: 0`.

- [ ] **Step 2: Chạy toàn bộ test frontend**

```powershell
cd frontend
npm test
```
Expected: tất cả test files pass.

- [ ] **Step 3: Build cả 2 phía**

```powershell
cd backend
.\mvnw.cmd -o -q package -DskipTests
cd ..\frontend
.\node_modules\.bin\tsc --noEmit
npm run build
```
Expected: BUILD SUCCESS + exit 0 + build thành công.

- [ ] **Step 4: Chạy app thật và test API**

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
Expected: `Started BackendApplication`.

Đăng nhập bằng **email/mật khẩu** (không OAuth) → `GET /api/auth/me` phải trả `"avatarUrl": null` (không lỗi 500).

```powershell
curl.exe -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"<email-test>\",\"password\":\"<password-test>\"}"
```
→ lấy `accessToken`, rồi:
```powershell
curl.exe -s http://localhost:8080/api/auth/me -H "Authorization: Bearer <accessToken>"
```
Expected: JSON có `"avatarUrl": null`.

- [ ] **Step 5: Test API thật với đăng nhập Facebook — CẦN BROWSER THẬT**

Bấm "Đăng nhập bằng Facebook" trên `http://localhost:5173/dang-nhap` → đăng nhập Facebook → sau khi quay lại app:
- Header hiện **avatar Facebook** (ảnh thật, không phải chữ cái đầu).
- Header hiện **tên rút gọn** ("Son").
- Ô viết bài đầu feed hiện **cùng avatar**.
- Trang cá nhân (`/tai-khoan`) hiện tên **đầy đủ** "Kieu Van Son".

> ⚠️ Nếu không verify được (cần browser thật / không có credential Facebook) → **phải nói rõ** "chưa verify được" thay vì tự nhận. Ghi lại đúng phần nào đã / chưa verify.

- [ ] **Step 6: Cập nhật `README.md`**

**(i)** Mục "📈 Tiến trình dự án": tìm hạng mục liên quan đăng nhập OAuth / hồ sơ user. Nếu chưa có hạng mục cho avatar → thêm hàng mới vào đúng giai đoạn (giai đoạn 1 — Xác thực):
```
| 🏷️ Avatar + tên rút gọn từ Facebook (header, ô viết bài) | ✅ |
```
Chỉ đánh `✅` nếu đã verify thật (Step 4 + Step 5). Nếu Step 5 chưa verify được → để `🚧`.

**(ii)** Mục "🌐 API Endpoints": `GET /api/auth/me` và `POST /api/auth/login` giờ trả kèm field `avatarUrl` → cập nhật mô tả response của các endpoint đó (nếu bảng mô tả có liệt kê field).

**(iii)** Mục "🚀 Công nghệ sử dụng": **không đổi** (không thêm dependency).

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: cap nhat README voi avatar Facebook va ten rut gon"
```

---

## Self-Review

**1. Spec coverage:**

| Mục tiêu spec | Task |
|---|---|
| G1. Avatar hiển thị ở header + ô viết bài | Task 6, 7 |
| G2. Tên rút gọn ở 2 chỗ | Task 5, 7 |
| G3. Tên đầy đủ giữ trong DB + trang cá nhân | Task 3, 7 (menu giữ `user.fullName`), Task 8 |
| G4. Cả 2 nhánh Facebook đều có avatar | Task 3 (Step 1, 2, 3) |
| G5. Ảnh lỗi → không vỡ layout | Task 6 (Review Focus 1, 2) |
| G6. Không phá luồng email/mật khẩu | Task 4 (constructor tương thích), Task 8 Step 4 |
| A1. Không đổi avatar thời gian thực | Task 3 (`refreshAvatar` chỉ chạy khi đăng nhập) |
| A3. Không hiện avatar cho bài đăng | Không task nào đụng `FeedPostCard` ✓ |
| A4. Không proxy ảnh | Không task nào thêm endpoint ảnh ✓ |
| A5. Không tải ảnh về server | Không task nào thêm storage ✓ |

**2. Step scan:** mỗi step có 1 hành động kiểm chứng được (test fail / test pass / commit). Task 1 dùng "app start được" làm điều kiện kiểm chứng vì thay đổi schema không có hành vi quan sát được.

**3. Type consistency:**
- `avatarUrl` — tên thuộc tính thống nhất ở `User`, `OAuthTicket`, `OAuthUserInfo`, `UserDto`, `OAuthTicketStatus`, `types.ts`.
- `shortDisplayName` — Task 5 tạo, Task 6/7 dùng. Cùng tên, cùng chữ ký.
- `UserAvatar` — Task 6 tạo, Task 7 dùng. Props `user` / `size` / `className`.
- `FeedComposerProps.user: User | null` — bắt buộc, Task 7 Step 7 sửa test cũ.

**4. Review Focus:** 5 dòng → Task 2 (picture thiếu), Task 5 (tên 1 từ / rỗng), Task 6 (ảnh lỗi / user không OAuth). Đã ghim test cho cả 5.

**5. Proportion:** plan dài hơn spec một chút — hợp lý vì spec là tài liệu thiết kế còn plan là bước làm cụ thể. Không có block code nào chứa logic mà test chưa quyết định.

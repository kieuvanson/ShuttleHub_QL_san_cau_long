# Đăng nhập Facebook tức thì + hoàn thiện hồ sơ ở trang cá nhân — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đăng nhập Facebook vào thẳng app (không ép trang "Hoàn thiện tài khoản"); khi Facebook không trả email thì bắt xác minh SĐT bằng OTP; phần còn thiếu (SĐT, email tạm) nằm ở trang `/tai-khoan` cập nhật tuỳ chọn.

**Architecture:** Backend tách nhánh xử lý OAuth thành "có email → tạo user ngay" và "không có email → ticket chờ + verify SĐT bằng OTP → tạo user". Trạng thái ticket đổi từ `NEEDS_PROFILE` sang `NEEDS_PHONE`. Thêm endpoint `PUT /api/auth/profile` cho user tự cập nhật hồ sơ. Frontend thay trang hoàn thiện cũ bằng trang xác minh SĐT, thêm trang `/tai-khoan`.

**Tech Stack:** Spring Boot 4.1.1 · Java 25 · Spring Security 7 · PostgreSQL · JPA/Hibernate · Flyway · JUnit 5 + Mockito + MockMvc · React 19 · TypeScript · React Router · framer-motion · lucide-react · @astryxdesign/core

**Spec:** `docs/superpowers/specs/2026-11-13-facebook-login-immediate-design.md`

---

## Global Constraints

- **Ngôn ngữ:** comment trong code và message trả về cho user bằng **tiếng Việt**; tên biến/hàm/class bằng tiếng Anh.
- **Backend:** Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder` cho entity; DTO dùng `record` + Bean Validation; **không** đặt `@Size`/`@NotBlank` trên entity.
- **Entity:** `@Id @GeneratedValue(strategy = GenerationType.UUID)` → `String id`; `@Enumerated(EnumType.STRING)`; `createdAt` có `updatable = false`.
- **Migration:** mỗi thay đổi schema = 1 file `V{n}___snake_case.sql`; **không** sửa file migration đã chạy. Task này **không** cần migration.
- **Security:** endpoint ngoài `/api/auth/**` phải có JWT; trong `/api/auth/**` chỉ `permitAll` cho endpoint được liệt kê; lỗi 500 **không** trả `ex.getMessage()`.
- **Lỗi 500:** chỉ `log.error`, không lộ SQL/path cho client.
- **Chuẩn hoá SĐT:** luôn dùng `PhoneNumbers.normalize()` (backend) / `normalizePhone()` (frontend) → E.164 `84` + 9 chữ số.
- **Chuẩn hoá email:** `trim().toLowerCase(Locale.ROOT)`.
- **Frontend:** không dùng `any`; gọi API qua `api.get/post/put` trong `src/api/client.ts`; dùng `useAuth()` từ `src/context/AuthContext.tsx` (không tự đọc `localStorage` token); CSS cùng file component (`X.tsx` + `X.css`); màu từ `src/styles/tokens.css`; icon `lucide-react`; animation `framer-motion`.
- **Verify backend:** `cd backend && .\mvnw.cmd -o -q package -DskipTests` phải BUILD SUCCESS; `.\mvnw.cmd test` phải pass.
- **Verify frontend:** `cd frontend && .\node_modules\.bin\tsc --noEmit` không lỗi; `npm run build` thành công.
- **README:** cập nhật mục "📈 Tiến trình dự án" + "🌐 API Endpoints" sau khi verify (chỉ đánh `✅` khi đã verify thật).
- **Git:** không commit `application.properties` / `.env`; không tự `git push`.

---

## Review Focus

Năm tình huống mà spec ngụ ý nhưng test nào cũng dễ bỏ sót — mỗi dòng dưới đây được gắn vào task sở hữu code của nó:

1. **Facebook trả email đã có trong `users`** → phải trả 409, KHÔNG tạo user mới, KHÔNG gộp vào user cũ (Task 1).
2. **Facebook không trả email** → không được tạo user ngay; phải chờ verify SĐT, và SĐT đã đăng ký phải trả 409 (Task 2).
3. **`providerUserId` phải lấy từ ticket server-side, không lấy từ body client** — nếu lấy từ client, attacker gắn FB account của mình vào `providerUserId` người khác (Task 2).
4. **Email tạm `@facebook.local` phải UNIQUE** — hai user Facebook khác phải ra hai email tạm khác nhau (Task 1).
5. **Đổi email khi user chưa có SĐT** → phải bắt buộc kèm SĐT + OTP hợp lệ; nếu không thì trả 400 chứ không đổi (Task 4).

---

## Cấu trúc file

**Backend — tạo mới**
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/ProfileUpdateRequest.java` — DTO cho `PUT /api/auth/profile`.
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthPhoneVerifyRequest.java` — DTO cho `POST /api/auth/oauth/phone/verify` (thay `FacebookCompleteRequest`).
- `backend/src/main/java/vn/ShuttleHub/backend/auth/service/ProfileService.java` — nghiệp vụ cập nhật hồ sơ (tách riêng khỏi `AuthService`).
- `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/BadRequestException.java` — lỗi nghiệp vụ 400 (thiếu OTP khi đổi hồ sơ). **Cần** vì `InvalidCredentialsException` map về 401, còn `EmailAlreadyExistsException` map về 409 — không cái nào là 400.

**Backend — sửa**
- `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java` — nhánh Facebook tạo user ngay; `verifyPhoneAndCreateUser()`.
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/UserDto.java` — `phone` → `phoneNumber`.
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java` — `NEEDS_PROFILE` → `NEEDS_PHONE`.
- `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthLoginOutcome.java` — `NEEDS_PROFILE` → `NEEDS_PHONE`.
- `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/AuthController.java` — thêm `PUT /profile`.
- `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java` — `/facebook/complete` → `/phone/verify`.
- `backend/src/main/java/vn/ShuttleHub/backend/repository/UserRepository.java` — thêm `findByPhoneNumber`.
- `backend/src/main/java/vn/ShuttleHub/backend/config/SecurityConfig.java` — `PUT /api/auth/profile` cần JWT (mặc định `anyRequest().authenticated()` đã lo).

**Backend — xoá**
- `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/FacebookCompleteRequest.java`

**Backend — test**
- `backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java` — cập nhật + thêm test mới.
- `backend/src/test/java/vn/ShuttleHub/backend/auth/service/ProfileServiceTest.java` — **mới**.
- `backend/src/test/java/vn/ShuttleHub/backend/config/OAuthSuccessHandlerTest.java` — cập nhật.
- `backend/src/test/java/vn/ShuttleHub/backend/auth/controller/OAuthControllerIntegrationTest.java` — cập nhật.

**Frontend — tạo mới**
- `frontend/src/pages/AccountPage.tsx` + `AccountPage.css` — trang `/tai-khoan`.

**Frontend — sửa**
- `frontend/src/pages/FacebookPhoneVerifyPage.tsx` + `.css` — **đổi từ `FacebookCompletePage`** (chỉ SĐT + OTP).
- `frontend/src/main.tsx` — route.
- `frontend/src/components/Header.tsx` — menu "Trang cá nhân".
- `frontend/src/context/AuthContext.tsx` — `updateProfile`.
- `frontend/src/api/auth.ts` — `oauthPhoneVerify` + `updateProfile`.
- `frontend/src/api/types.ts` — `phoneNumber`, `OAuthTicketStatus.status`.

**Frontend — xoá**
- `frontend/src/pages/FacebookCompletePage.tsx` + `FacebookCompletePage.css`

---

## Task 1: Facebook có email → tạo user ngay

**Files:**
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthLoginOutcome.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java`

**Interfaces:**
- Consumes: `OAuthUserInfo(provider, providerUserId, email, emailVerified, fullName)`, `OAuthTicketService.issueForUser(userId, provider, providerUserId) -> String`, `UserRepository.findByEmail/save/existsByUsername`
- Produces:
  - `OAuthAuthService.handleCallback(OAuthUserInfo) -> OAuthLoginOutcome` (giữ nguyên chữ ký)
  - `OAuthLoginOutcome.loggedIn(OAuthUserInfo, String userId, String ticket)` (giữ nguyên)
  - `OAuthLoginOutcome.needsPhone(OAuthUserInfo, String ticket)` — **thay** `needsProfile`
  - `OAuthLoginOutcome.NEEDS_PHONE` — hằng số **thay** `NEEDS_PROFILE`
  - Hằng số trong `OAuthAuthService`: `static final String TEMP_EMAIL_DOMAIN = "facebook.local"` (package-private để test dùng)

- [ ] **Step 1: Viết test thất bại — Facebook có email → LOGGED_IN + tạo user**

Trong `OAuthAuthServiceTest.java`, sửa test cũ `facebook_firstTime_needsProfile` thành:

```java
@Test
@DisplayName("Facebook lần đầu + có email → tạo user ngay, sinh ticket đăng nhập")
void facebook_withEmail_createsUserImmediately() {
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

    var outcome = service.handleCallback(facebook("newfb@x.com"));

    assertEquals("LOGGED_IN", outcome.status());
    assertEquals("t-fb", outcome.ticket());
    assertEquals("u-fb", outcome.userId());

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepo).save(captor.capture());
    assertEquals("newfb@x.com", captor.getValue().getEmail());
    // Chưa có SĐT → user tự điền ở trang cá nhân
    assertNull(captor.getValue().getPhoneNumber());
    assertEquals(Role.CUSTOMER, captor.getValue().getRole());
}
```

Thêm import `assertNull`.

Sửa test cũ `facebook_noEmail_needsProfile` thành:

```java
@Test
@DisplayName("Facebook không có email → NEEDS_PHONE, sinh ticket chờ, KHÔNG tạo user")
void facebook_noEmail_needsPhone() {
    when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
            .thenReturn(Optional.empty());
    when(ticketService.issuePending(anyString(), anyString(), any())).thenReturn("pending-2");

    var outcome = service.handleCallback(new OAuthUserInfo("facebook", "fb-1", null, false, "Nam"));

    assertEquals("NEEDS_PHONE", outcome.status());
    assertEquals("pending-2", outcome.ticket());
    verify(userRepo, never()).save(any());
}
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend && .\mvnw.cmd test -Dtest=OAuthAuthServiceTest`
Expected: FAIL — `expected: <LOGGED_IN> but was: <NEEDS_PROFILE>` (và lỗi compile nếu `needsPhone` chưa tồn tại).

- [ ] **Step 3: Sửa `OAuthLoginOutcome` — đổi NEEDS_PROFILE → NEEDS_PHONE**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthLoginOutcome.java`:
- Đổi hằng `public static final String NEEDS_PROFILE = "NEEDS_PROFILE";` → `public static final String NEEDS_PHONE = "NEEDS_PHONE";`
- Đổi `needsProfile(...)` → `needsPhone(...)`, trả `new OAuthLoginOutcome(NEEDS_PHONE, info, null, ticket)`.
- Cập nhật Javadoc: `NEEDS_PHONE` — Facebook không trả email → user phải xác minh SĐT bằng OTP.

- [ ] **Step 4: Sửa `OAuthAuthService.handleCallback()` — tách nhánh Facebook**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`:

Thêm hằng số (ngay sau phần khai báo field):

```java
/**
 * Domain của email tạm cho user Facebook chưa cấp quyền email.
 *
 * ⚠️ Vì sao cần email tạm? `users.email` NOT NULL → không có email thì không
 * tạo được user. Email tạm gắn với providerUserId (duy nhất) nên không bao
 * giờ trùng. User tự đổi ở trang cá nhân.
 */
static final String TEMP_EMAIL_DOMAIN = "facebook.local";
```

Thêm hằng số hàm:

```java
/**
 * Sinh email tạm cho user Facebook chưa chia sẻ email.
 *
 * ⚠️ Dùng providerUserId (duy nhất theo provider) → không trùng với user khác.
 */
private String buildTempEmail(String providerUserId) {
    String local = "fb_" + (providerUserId == null ? "unknown" : providerUserId)
            .replaceAll("[^a-zA-Z0-9_]", "");
    return local + "@" + TEMP_EMAIL_DOMAIN;
}
```

Thay nhánh cuối của `handleCallback()` (từ `// 2. Chưa liên kết...` trở đi) bằng:

```java
        // 2. Chưa liên kết. Chuẩn hoá email để so sánh.
        String email = normalizeEmail(info.email());

        if (email == null) {
            // Facebook không trả email (user chưa cấp quyền email).
            // → Chưa tạo user: bắt user xác minh SĐT bằng OTP trước.
            //   SĐT là bằng chứng sở hữu thật + UNIQUE trong DB → không ai
            //   khai SĐT của người khác để chiếm chỗ được.
            String ticket = ticketService.issuePending(info.provider(), info.providerUserId(), info.fullName());
            return OAuthLoginOutcome.needsPhone(info, ticket);
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
            linkAccount(user.getId(), info, email);
            String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
            return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
        }

        // 3. Email mới.
        //    - Provider xác minh được email (Google) → tạo user luôn.
        //    - Facebook không có cờ email_verified, nhưng TẠO USER MỚI bằng
        //      email đó vẫn AN TOÀN (không xung đột với ai) → cũng tạo luôn.
        //      Sự khác biệt: Facebook KHÔNG BAO GIỜ gộp vào tài khoản có sẵn
        //      (đã xử lý ở nhánh `existing.isPresent()` phía trên).
        User user = userRepo.save(createUser(email, info.fullName()));
        linkAccount(user.getId(), info, email);
        String ticket = ticketService.issueForUser(user.getId(), info.provider(), info.providerUserId());
        return OAuthLoginOutcome.loggedIn(info, user.getId(), ticket);
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd backend && .\mvnw.cmd test -Dtest=OAuthAuthServiceTest`
Expected: PASS — tất cả test trong class pass.

- [ ] **Step 6: Commit**

```powershell
cd backend
git add src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java src/main/java/vn/ShuttleHub/backend/auth/service/OAuthLoginOutcome.java src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java
git commit -m "feat(auth): Facebook có email thì tạo user ngay, không ép hoàn thiện hồ sơ"
```

---

## Task 2: Nhánh Facebook không có email — verify SĐT bằng OTP

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthPhoneVerifyRequest.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`
- Delete: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/FacebookCompleteRequest.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/service/OAuthAuthServiceTest.java`

**Interfaces:**
- Consumes: `OAuthTicketService.peek(ticket) -> OAuthTicket` (có `getProviderUserId()`, `getFullName()`), `OAuthTicketService.attachUser(ticket, userId)`, `OtpService.verifyOtp(phone, otp)`, `UserRepository.existsByPhoneNumber/save`
- Produces:
  - `OAuthAuthService.verifyPhoneAndCreateUser(String ticket, String phone, String otp) -> String` (trả `userId`)
  - `OAuthAuthService.updateProfile(...)` — **thuộc Task 4**, không làm ở task này
  - `POST /api/auth/oauth/phone/verify` (Public) → body `{ ticket, phone, otp }` → response `ApiResponse<Map<String,String>>` với key `userId`

- [ ] **Step 1: Viết test thất bại — verify SĐT happy path**

Thêm vào `OAuthAuthServiceTest.java`:

```java
@Test
@DisplayName("Verify SĐT (FB không email): OTP hợp lệ → tạo user + email tạm + link + gắn user vào ticket")
void verifyPhoneAndCreateUser_happyPath() {
    OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
            .provider("facebook").providerUserId("fb-1").fullName("Nam")
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

    String userId = service.verifyPhoneAndCreateUser("pending-1", "84912345678", "123456");

    assertEquals("u-fb", userId);
    verify(otpService).verifyOtp("84912345678", "123456");

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepo).save(captor.capture());
    assertEquals("84912345678", captor.getValue().getPhoneNumber());
    // Email tạm — user tự đổi ở trang cá nhân
    assertEquals("fb_fb_1@facebook.local", captor.getValue().getEmail());
    assertEquals("Nam", captor.getValue().getFullName());

    ArgumentCaptor<OAuthAccount> linkCaptor = ArgumentCaptor.forClass(OAuthAccount.class);
    verify(oauthAccountRepo).save(linkCaptor.capture());
    assertEquals("facebook", linkCaptor.getValue().getProvider());
    assertEquals("fb-1", linkCaptor.getValue().getProviderUserId());

    verify(ticketService).attachUser("pending-1", "u-fb");
}
```

- [ ] **Step 2: Viết test thất bại — SĐT đã đăng ký → 409**

```java
@Test
@DisplayName("Verify SĐT: SĐT đã đăng ký → ném lỗi 409, KHÔNG tạo user")
void verifyPhoneAndCreateUser_existingPhone_throws() {
    OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
            .provider("facebook").providerUserId("fb-1")
            .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
            .createdAt(LocalDateTime.now()).build();
    when(ticketService.peek("pending-1")).thenReturn(pending);
    when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(true);

    assertThrows(EmailAlreadyExistsException.class,
            () -> service.verifyPhoneAndCreateUser("pending-1", "84912345678", "123456"));

    verify(userRepo, never()).save(any());
    verify(ticketService, never()).attachUser(anyString(), anyString());
}
```

- [ ] **Step 3: Viết test thất bại — OTP sai → ném lỗi, không tạo user**

```java
@Test
@DisplayName("Verify SĐT: OTP sai → ném lỗi, KHÔNG tạo user")
void verifyPhoneAndCreateUser_wrongOtp_throws() {
    OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
            .provider("facebook").providerUserId("fb-1")
            .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
            .createdAt(LocalDateTime.now()).build();
    when(ticketService.peek("pending-1")).thenReturn(pending);
    doThrow(new vn.ShuttleHub.backend.auth.exception.OtpInvalidException("Mã OTP sai."))
            .when(otpService).verifyOtp(anyString(), anyString());

    assertThrows(vn.ShuttleHub.backend.auth.exception.OtpInvalidException.class,
            () -> service.verifyPhoneAndCreateUser("pending-1", "84912345678", "000000"));

    verify(userRepo, never()).save(any());
    verify(ticketService, never()).attachUser(anyString(), anyString());
}
```

- [ ] **Step 4: Chạy test để xác nhận FAIL**

Run: `cd backend && .\mvnw.cmd test -Dtest=OAuthAuthServiceTest`
Expected: FAIL — lỗi compile `cannot find symbol: method verifyPhoneAndCreateUser`.

- [ ] **Step 5: Tạo DTO `OAuthPhoneVerifyRequest`**

Tạo `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthPhoneVerifyRequest.java`:

```java
package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import vn.ShuttleHub.backend.common.PhoneNumbers;

/**
 * Yêu cầu xác minh SĐT khi Facebook KHÔNG chia sẻ email.
 *
 * ⚠️ Vì sao SĐT + OTP thay vì email tự khai?
 *   Nếu bắt user tự nhập email → kẻ xấu khai email người khác để chiếm
 *   chỗ tài khoản đó trước khi chủ sở hữu thật đăng ký.
 *   SĐT + OTP SMS là bằng chứng sở hữu thật, và `users.phone_number`
 *   UNIQUE → không ai chiếm chỗ được.
 */
public record OAuthPhoneVerifyRequest(
        @NotBlank(message = "Ticket không được để trống")
        String ticket,

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
    public OAuthPhoneVerifyRequest {
        phone = PhoneNumbers.normalize(phone);
    }
}
```

- [ ] **Step 6: Implement `verifyPhoneAndCreateUser()` trong `OAuthAuthService`**

Thêm vào `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OAuthAuthService.java`:

```java
    /**
     * Xác minh SĐT bằng OTP rồi tạo tài khoản — dùng cho nhánh Facebook
     * không trả email.
     *
     * ⚠️ providerUserId lấy từ ticket (server-side), KHÔNG lấy từ client —
     * nếu lấy từ client thì attacker có thể gắn tài khoản Facebook của
     * mình vào bất kỳ providerUserId nào.
     *
     * @param ticket ticket đang chờ (userId = null)
     * @return userId vừa tạo
     */
    @Transactional
    public String verifyPhoneAndCreateUser(String ticket, String phone, String otp) {
        OAuthTicket pending = ticketService.peek(ticket);

        // Verify SĐT — tái dùng luồng OTP sẵn có nên FB cũng chịu rate-limit
        // SMS (10 lần/giờ/IP + 3 lần đăng ký/SĐT/24h) → chống đốt tiền SMS.
        otpService.verifyOtp(phone, otp);

        // SĐT UNIQUE → nếu đã có user thì chặn, không cho chiếm chỗ.
        if (userRepo.existsByPhoneNumber(phone)) {
            throw new EmailAlreadyExistsException("Số điện thoại này đã được đăng ký.");
        }

        String tempEmail = buildTempEmail(pending.getProviderUserId());

        User user = createUser(tempEmail, pending.getFullName());
        user.setPhoneNumber(phone);
        user = userRepo.save(user);

        oauthAccountRepo.save(OAuthAccount.builder()
                .userId(user.getId())
                .provider(pending.getProvider())
                .providerUserId(pending.getProviderUserId())
                .emailAtRegistration(tempEmail)
                .createdAt(LocalDateTime.now())
                .build());

        ticketService.attachUser(ticket, user.getId());
        return user.getId();
    }
```

Thêm import `vn.ShuttleHub.backend.entity.OAuthTicket`.

- [ ] **Step 7: Đổi endpoint trong `OAuthController`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`:

Đổi import `import vn.ShuttleHub.backend.auth.dto.FacebookCompleteRequest;` → `import vn.ShuttleHub.backend.auth.dto.OAuthPhoneVerifyRequest;`

Thay method `facebookComplete(...)` bằng:

```java
    /**
     * Xác minh SĐT bằng OTP rồi tạo tài khoản — dùng khi Facebook không
     * chia sẻ email.
     */
    @PostMapping("/phone/verify")
    public ResponseEntity<ApiResponse<Map<String, String>>> phoneVerify(
            @Valid @RequestBody OAuthPhoneVerifyRequest req) {
        String userId = oauthAuthService.verifyPhoneAndCreateUser(
                req.ticket(), req.phone(), req.otp());
        return ResponseEntity.ok(
                ApiResponse.success("Xác minh thành công.", Map.of("userId", userId)));
    }
```

- [ ] **Step 8: Xoá `FacebookCompleteRequest`**

Xoá file `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/FacebookCompleteRequest.java`.

Chạy `cd backend && .\mvnw.cmd -o -q compile` để chắc chắn không còn tham chiếu nào tới class này.

- [ ] **Step 9: Chạy test để xác nhận PASS**

Run: `cd backend && .\mvnw.cmd test -Dtest=OAuthAuthServiceTest`
Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
cd backend
git add -A src/main/java/vn/ShuttleHub/backend/auth src/test/java/vn/ShuttleHub/backend/auth
git commit -m "feat(auth): verify SĐT bằng OTP cho nhánh Facebook không trả email"
```

---

## Task 3: Endpoint cập nhật hồ sơ `PUT /api/auth/profile` + sửa `UserDto.phone` → `phoneNumber`

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/ProfileUpdateRequest.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/ProfileService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/UserDto.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/AuthController.java`
- Test: `backend/src/test/java/vn/ShuttleHub/backend/auth/service/ProfileServiceTest.java` (tạo mới)

**Interfaces:**
- Consumes: `OtpService.verifyOtp(phone, otp)`, `UserRepository.findById/existsByEmail/existsByPhoneNumber/save`
- Produces:
  - `ProfileService.updateProfile(String userId, ProfileUpdateRequest req) -> UserDto`
  - `PUT /api/auth/profile` (cần JWT) → body `{ email?, phone?, otp? }` → response `ApiResponse<UserDto>`
  - `UserDto` đổi tên field `phone` → `phoneNumber`

> ⚠️ Vì sao tách `ProfileService` riêng thay vì thêm vào `AuthService`?
> `AuthService` có constructor 8 dependency (userRepo, refreshTokenRepo, otpService,
> jwtService, passwordEncoder, registrationAttemptService, loginRateLimiter, maxRegistrations).
> Thêm logic cập nhật hồ sơ vào đó sẽ khiến class vừa xử lý đăng nhập vừa xử lý hồ sơ,
> và test phải mock 7 dependency không liên quan. `ProfileService` chỉ có 2 dependency
> (userRepo, otpService) → test gọn, đúng nguyên tắc "class có một trách nhiệm".

- [ ] **Step 1: Viết test thất bại — đổi email + SĐT + OTP**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/service/ProfileServiceTest.java`:

```java
package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.ShuttleHub.backend.auth.dto.ProfileUpdateRequest;
import vn.ShuttleHub.backend.auth.exception.BadRequestException;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test cập nhật hồ sơ — endpoint PUT /api/auth/profile.
 */
@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserRepository userRepo;

    @Mock
    private OtpService otpService;

    private ProfileService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new ProfileService(userRepo, otpService);
    }

    /** User Facebook mới tạo: email tạm, chưa có SĐT. */
    private User userWithoutPhone() {
        return User.builder().id("u-1").email("fb_1@facebook.local")
                .username("fb_1").password("h").role(Role.CUSTOMER)
                .isActive(true).build();
    }

    /** User Google: đã có email thật + SĐT đã verify. */
    private User userWithPhone() {
        return User.builder().id("u-2").email("real@x.com")
                .username("realuser").password("h").role(Role.CUSTOMER)
                .phoneNumber("84900000000").isActive(true).build();
    }

    @Test
    @DisplayName("Đổi email + SĐT (kèm OTP) → cập nhật user, verify OTP được gọi")
    void updateProfile_emailAndPhone_succeeds() {
        User u = userWithoutPhone();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));
        when(userRepo.existsByEmail("real@x.com")).thenReturn(false);
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(false);
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.updateProfile("u-1",
                new ProfileUpdateRequest("real@x.com", "84912345678", "123456"));

        assertEquals("real@x.com", dto.email());
        assertEquals("84912345678", dto.phoneNumber());
        verify(otpService).verifyOtp("84912345678", "123456");
    }

    @Test
    @DisplayName("Đổi email khi CHƯA có SĐT mà không kèm OTP → 400, KHÔNG đổi email")
    void updateProfile_emailWithoutPhoneRejected() {
        User u = userWithoutPhone();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));

        assertThrows(BadRequestException.class,
                () -> service.updateProfile("u-1",
                        new ProfileUpdateRequest("real@x.com", null, null)));

        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("Email đã tồn tại → 409, KHÔNG đổi")
    void updateProfile_duplicateEmail_throws() {
        User u = userWithPhone();
        when(userRepo.findById("u-2")).thenReturn(Optional.of(u));
        when(userRepo.existsByEmail("taken@x.com")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class,
                () -> service.updateProfile("u-2",
                        new ProfileUpdateRequest("taken@x.com", null, null)));

        verify(userRepo, never()).save(any());
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend && .\mvnw.cmd test -Dtest=ProfileServiceTest`
Expected: FAIL — lỗi compile `cannot find symbol: class ProfileUpdateRequest` và `class ProfileService`.

- [ ] **Step 3: Tạo DTO `ProfileUpdateRequest`**

Tạo `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/ProfileUpdateRequest.java`:

```java
package vn.ShuttleHub.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import vn.ShuttleHub.backend.common.PhoneNumbers;

import java.util.Locale;

/**
 * Yêu cầu cập nhật hồ sơ — endpoint PUT /api/auth/profile.
 *
 * ⚠️ Mọi trường đều TUỲ CHỌN — user chỉ gửi những gì muốn đổi.
 *   • `phone` có giá trị → BẮT BUỘC kèm `otp` hợp lệ (chứng minh sở hữu SĐT).
 *   • `email` là email tạm `@facebook.local` → cũng bắt buộc `phone` + `otp`
 *     trong cùng request, nếu không user có thể chiếm email người khác.
 */
public record ProfileUpdateRequest(
        @Email(message = "Email chưa đúng định dạng")
        String email,

        @Pattern(regexp = "^84[0-9]{9}$", message = "Số điện thoại chưa hợp lệ")
        String phone,

        @Pattern(regexp = "^[0-9]{6}$", message = "Mã OTP phải là 6 chữ số")
        String otp
) {
    /**
     * Chuẩn hoá TRƯỚC khi validate — cùng pattern với RegisterRequest.
     */
    public ProfileUpdateRequest {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        phone = PhoneNumbers.normalize(phone);
    }
}
```

- [ ] **Step 4: Sửa `UserDto` — `phone` → `phoneNumber`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/UserDto.java` đổi field `phone` → `phoneNumber`:

```java
public record UserDto(
    String id,
    String username,
    String email,
    String fullName,
    String phoneNumber,
    String role,
    LocalDateTime createdAt
) {}
```

- [ ] **Step 5: Implement `ProfileService`**

> ℹ️ `AuthService.toUserDto()` **không cần sửa** — nó đã truyền `user.getPhoneNumber()`
> vào ô `phone` sẵn. Chỉ tên field trong `UserDto` đổi, không đổi vị trí.

Trước tiên tạo exception 400 mới. Tạo `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/BadRequestException.java`:

```java
package vn.ShuttleHub.backend.auth.exception;

/**
 * Lỗi nghiệp vụ 400 — request đúng format nhưng thiếu/thừa thông tin.
 *
 * ⚠️ Vì sao không dùng {@link InvalidCredentialsException}?
 *   Exception đó map về 401 (sai credentials). Lỗi "thiếu OTP khi đổi hồ sơ"
 *   không phải lỗi xác thực — user ĐÃ đăng nhập rồi, chỉ là request thiếu
 *   thông tin → phải là 400.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
```

Thêm handler vào `backend/src/main/java/vn/ShuttleHub/backend/auth/exception/GlobalExceptionHandler.java` (đặt ngay sau `handleConstraint`):

```java
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(400, ex.getMessage()));
    }
```

Tạo `backend/src/main/java/vn/ShuttleHub/backend/auth/service/ProfileService.java`:

```java
package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.dto.ProfileUpdateRequest;
import vn.ShuttleHub.backend.auth.dto.UserDto;
import vn.ShuttleHub.backend.auth.exception.BadRequestException;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.time.LocalDateTime;

/**
 * Cập nhật hồ sơ (email / SĐT) cho user hiện tại.
 *
 * ⚠️ Vì sao tách khỏi {@link AuthService}?
 *   AuthService lo đăng nhập / đăng ký / refresh token. Cập nhật hồ sơ là
 *   trách nhiệm khác → tách riêng để class gọn và test không phải mock
 *   7 dependency không liên quan.
 */
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepo;
    private final OtpService otpService;

    /**
     * Cập nhật hồ sơ cho user hiện tại.
     *
     * ⚠️ Quy tắc bảo mật:
     *   • Đổi SĐT → BẮT BUỘC có OTP hợp lệ cho đúng SĐT đó (chứng minh sở hữu).
     *   • Đổi email khi user CHƯA có SĐT → BẮT BUỘC kèm SĐT + OTP hợp lệ
     *     trong cùng request. Nếu không, kẻ xấu có thể chiếm email người
     *     khác chỉ bằng cách gọi 1 API.
     *   • Email/SĐT đã tồn tại → 409.
     */
    @Transactional
    public UserDto updateProfile(String userId, ProfileUpdateRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BadRequestException("User không tồn tại."));

        String email = req.email();
        String phone = req.phone();
        String otp = req.otp();

        if (email == null && phone == null) {
            throw new BadRequestException("Không có thông tin nào để cập nhật.");
        }

        boolean hasPhone = user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank();
        boolean phoneChanged = phone != null && !phone.equals(user.getPhoneNumber());
        boolean emailChanged = email != null && !email.equals(user.getEmail());

        // Đổi SĐT → bắt buộc OTP.
        if (phoneChanged) {
            if (otp == null || otp.isBlank()) {
                throw new BadRequestException("Vui lòng xác minh số điện thoại bằng mã OTP.");
            }
            otpService.verifyOtp(phone, otp);
            if (userRepo.existsByPhoneNumber(phone)) {
                throw new EmailAlreadyExistsException("Số điện thoại này đã được đăng ký.");
            }
        }

        // Đổi email mà user chưa có SĐT → bắt buộc kèm SĐT + OTP.
        if (emailChanged) {
            if (!hasPhone && !phoneChanged) {
                throw new BadRequestException(
                        "Vui lòng xác minh số điện thoại trước khi đổi email.");
            }
            if (userRepo.existsByEmail(email)) {
                throw new EmailAlreadyExistsException("Email này đã được sử dụng.");
            }
        }

        if (phoneChanged) {
            user.setPhoneNumber(phone);
        }
        if (emailChanged) {
            user.setEmail(email);
        }
        user.setUpdatedAt(LocalDateTime.now());
        user = userRepo.save(user);

        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }
}
```

> ⚠️ Lưu ý implementer: `EmailAlreadyExistsException` cho case SĐT trùng là tạm dùng
> lại exception có sẵn (message tiếng Việt đúng, status 409). Nếu muốn tách riêng
> thì tạo `PhoneAlreadyExistsException` cùng pattern — nhưng **phải** đảm bảo
> `GlobalExceptionHandler` map nó về 409.

- [ ] **Step 6: Thêm endpoint `PUT /profile` vào `AuthController`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/AuthController.java`:

Thêm field (class dùng `@RequiredArgsConstructor` → chỉ cần khai báo `final`):

```java
    private final ProfileService profileService;
```

Thêm method sau `me(...)`:

```java
    /**
     * Cập nhật hồ sơ (email / SĐT) cho user hiện tại.
     * PUT /api/auth/profile
     * Body: { "email"?, "phone"?, "otp"? }
     */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ProfileUpdateRequest req) {
        UserDto res = profileService.updateProfile(userId, req);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công.", res));
    }
```

`AuthController` đã có `import vn.ShuttleHub.backend.auth.dto.*;` nên `ProfileUpdateRequest` được import tự động. Cần thêm import `vn.ShuttleHub.backend.auth.service.ProfileService;`.

- [ ] **Step 7: Chạy test để xác nhận PASS**

Run: `cd backend && .\mvnw.cmd test -Dtest=ProfileServiceTest`
Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
cd backend
git add src/main/java/vn/ShuttleHub/backend/auth src/test/java/vn/ShuttleHub/backend/auth
git commit -m "feat(auth): endpoint PUT /api/auth/profile để cập nhật email và SĐT"
```

---

## Task 4: Cập nhật test backend còn lại + endpoint `/phone/verify` trong SecurityConfig

**Files:**
- Modify: `backend/src/test/java/vn/ShuttleHub/backend/auth/controller/OAuthControllerIntegrationTest.java`
- Modify: `backend/src/test/java/vn/ShuttleHub/backend/config/OAuthSuccessHandlerTest.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`

**Interfaces:**
- Consumes: `OAuthTicketService.peek`, `OAuthTicket` entity
- Produces:
  - `OAuthTicketStatus.NEEDS_PHONE` (thay `NEEDS_PROFILE`)
  - `GET /api/auth/oauth/ticket/{ticket}` trả `status` = `"READY"` | `"NEEDS_PHONE"`

- [ ] **Step 1: Sửa `OAuthTicketStatus`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/OAuthTicketStatus.java`:

```java
public record OAuthTicketStatus(
        String status,      // "READY" | "NEEDS_PHONE"
        String provider,
        String fullName
) {
    public static final String READY = "READY";
    public static final String NEEDS_PHONE = "NEEDS_PHONE";
}
```

- [ ] **Step 2: Sửa `OAuthController.ticketStatus()` dùng hằng số**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/OAuthController.java`, thay:

```java
        String status = t.getUserId() != null
                ? OAuthTicketStatus.READY
                : OAuthTicketStatus.NEEDS_PROFILE;
```

bằng:

```java
        String status = t.getUserId() != null
                ? OAuthTicketStatus.READY
                : OAuthTicketStatus.NEEDS_PHONE;
```

- [ ] **Step 3: Sửa `OAuthSuccessHandlerTest`**

Trong `backend/src/test/java/vn/ShuttleHub/backend/config/OAuthSuccessHandlerTest.java`:

Đổi test `success_needsProfile_redirectsToFacebookPage` thành:

```java
    @Test
    @DisplayName("Facebook chưa có email → redirect về /oauth/facebook để verify SĐT")
    void success_needsPhone_redirectsToFacebookPage() throws Exception {
        OAuthUserInfo info = new OAuthUserInfo("facebook", "fb-1", null, false, "A");
        when(extractor.extract(any(), anyString())).thenReturn(info);
        when(oauthAuthService.handleCallback(info))
                .thenReturn(OAuthLoginOutcome.needsPhone(info, "pending-abc"));

        handler().onAuthenticationSuccess(request, response, authWithRegistrationId("facebook"));

        verify(response).sendRedirect("http://localhost:5173/oauth/facebook?ticket=pending-abc");
    }
```

Thêm import `static org.mockito.ArgumentMatchers.anyString;` nếu chưa có (file đã có sẵn).

- [ ] **Step 4: Sửa `OAuthControllerIntegrationTest`**

Trong `backend/src/test/java/vn/ShuttleHub/backend/auth/controller/OAuthControllerIntegrationTest.java`:

(a) Đổi test `exchange_pendingTicket_blocked` — đổi tên + đổi kỳ vọng:

```java
    @Test
    @DisplayName("Ticket NEEDS_PHONE (chưa có user) → GET status trả NEEDS_PHONE, exchange bị chặn")
    void exchange_pendingTicket_blocked() throws Exception {
        String ticket = "it-test-pending-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(null).provider("facebook")
                .providerUserId("fb-" + ticket).fullName("Nguyen Van B")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        mockMvc.perform(get("/api/auth/oauth/ticket/" + ticket))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("NEEDS_PHONE"))
                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van B"));

        mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON).content(ticketPayload(ticket)))
                .andExpect(status().isUnauthorized());
    }
```

(b) Xoá 3 test Facebook cũ (`facebookComplete_wrongOtp_unauthorized`,
`facebookComplete_duplicateEmail_conflict`, `facebookComplete_happyPath_upgradesTicket`)
và thay bằng 2 test mới cho endpoint `/phone/verify`:

```java
    @Test
    @DisplayName("Verify SĐT: OTP sai → 401 trước, KHÔNG tạo user")
    void phoneVerify_wrongOtp_unauthorized() throws Exception {
        String ticket = "it-test-fb-otp-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(null).provider("facebook")
                .providerUserId("fb-" + ticket).fullName("A")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        String phone = "849" + Math.abs(System.nanoTime() % 100000000L);
        mockMvc.perform(post("/api/auth/oauth/phone/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "ticket", ticket,
                                "phone", phone,
                                "otp", "000000"))))
                .andExpect(status().isUnauthorized());

        assertTrue(userRepo.findByPhoneNumber(phone).isEmpty());
    }
```

```java
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("Verify SĐT: hợp lệ → tạo user + email tạm + link oauth_account + ticket thành READY")
    void phoneVerify_happyPath_upgradesTicket() throws Exception {
        String ticket = "it-test-fb-ok-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(null).provider("facebook")
                .providerUserId("fb-ok-" + ticket).fullName("Nguyen Van C")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        String phone = "848" + Math.abs(System.nanoTime() % 100000000L);
        otpRepo.save(OtpCode.builder()
                .phone(phone)
                .codeHash(passwordEncoder.encode("123456"))
                .used(false)
                .expiresAt(LocalDateTime.now().plusSeconds(300))
                .attemptCount(0)
                .createdAt(LocalDateTime.now())
                .build());

        mockMvc.perform(post("/api/auth/oauth/phone/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "ticket", ticket,
                                "phone", phone,
                                "otp", "123456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").isNotEmpty());

        // User đã tạo với SĐT chuẩn hoá + email tạm
        User created = userRepo.findByPhoneNumber(phone).orElseThrow();
        assertEquals(phone, created.getPhoneNumber());
        assertTrue(created.getEmail().endsWith("@facebook.local"));

        // oauth_account đã link đúng provider + providerUserId
        var link = accountRepo.findByProviderAndProviderUserId("facebook", "fb-ok-" + ticket);
        assertTrue(link.isPresent());
        assertEquals(created.getId(), link.get().getUserId());

        // Ticket đã READY → đổi được JWT
        mockMvc.perform(get("/api/auth/oauth/ticket/" + ticket))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"));

        mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON).content(ticketPayload(ticket)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value(created.getEmail()));
    }
```

> ⚠️ Implementer cần thêm method `findByPhoneNumber` vào `UserRepository` (đã import sẵn
> `Optional`). Dùng: `Optional<User> findByPhoneNumber(String phoneNumber);`

> ⚠️ Implementer cần thêm import `assertEquals` (đã có sẵn) và kiểm tra
> `userRepo.findByPhoneNumber` tồn tại trước khi chạy test.

- [ ] **Step 5: Chạy toàn bộ test backend**

Run: `cd backend && .\mvnw.cmd test`
Expected: PASS — không test nào fail, không lỗi compile.

- [ ] **Step 6: Build backend**

Run: `cd backend && .\mvnw.cmd -o -q package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 7: Commit**

```powershell
cd backend
git add src/main/java/vn/ShuttleHub/backend/auth src/test/java/vn/ShuttleHub/backend/auth src/test/java/vn/ShuttleHub/backend/config src/main/java/vn/ShuttleHub/backend/repository/UserRepository.java
git commit -m "test(auth): cập nhật test OAuth cho luồng NEEDS_PHONE và verify SĐT"
```

---

## Task 5: Frontend — API client + types + AuthContext

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `api.put<T>(path, body)` từ `src/api/client.ts`
- Produces:
  - `User.phoneNumber` (thay `phone`)
  - `OAuthTicketStatus.status: 'READY' | 'NEEDS_PHONE'`
  - `ProfileUpdatePayload { email?: string; phone?: string; otp?: string }`
  - `authApi.oauthPhoneVerify(payload) -> Promise<{ userId: string }>`
  - `authApi.updateProfile(payload) -> Promise<User>`
  - `useAuth().updateProfile(payload) -> Promise<User>`

- [ ] **Step 1: Sửa `frontend/src/api/types.ts`**

Đổi field `phoneNumber` → giữ nguyên (đã đúng), sửa `OAuthTicketStatus`:

```ts
/** Trạng thái ticket sau OAuth callback */
export interface OAuthTicketStatus {
  status: 'READY' | 'NEEDS_PHONE';
  provider: string;
  fullName: string | null;
}

/** Payload cập nhật hồ sơ (email / SĐT / OTP) */
export interface ProfileUpdatePayload {
  email?: string;
  phone?: string;
  otp?: string;
}
```

> ⚠️ `User` type hiện đã có `phoneNumber: string | null` — giữ nguyên, KHÔNG đổi
> (backend đã được sửa cho khớp ở Task 3).

- [ ] **Step 2: Sửa `frontend/src/api/auth.ts`**

Đổi interface `FacebookCompletePayload`:

```ts
/** Payload xác minh SĐT cho nhánh Facebook không trả email */
export interface OAuthPhoneVerifyPayload {
  ticket: string;
  phone: string;
  otp: string;
}
```

Thay method `oauthFacebookComplete` bằng:

```ts
  /** Xác minh SĐT bằng OTP (Facebook không chia sẻ email) */
  oauthPhoneVerify: (payload: OAuthPhoneVerifyPayload) =>
    api.post<{ userId: string }>(
      '/api/auth/oauth/phone/verify',
      payload,
      { anonymous: true },
    ),

  /** Cập nhật hồ sơ (email / SĐT) — cần JWT */
  updateProfile: (payload: ProfileUpdatePayload) =>
    api.put<User>('/api/auth/profile', payload),
```

Thêm import type: `import type { AuthResponse, OAuthProviders, OAuthTicketStatus, ProfileUpdatePayload, User } from './types';`

- [ ] **Step 3: Sửa `frontend/src/context/AuthContext.tsx`**

Thêm vào interface `AuthContextValue`:

```tsx
  /** Cập nhật hồ sơ (email / SĐT) — cập nhật lại user trong state + localStorage */
  updateProfile: (payload: ProfileUpdatePayload) => Promise<User>;
```

Thêm import: `import type { ProfileUpdatePayload, User } from '../api/types';` (thay import `User` cũ).

Thêm implementation (ngay sau `refreshUser`):

```tsx
  const updateProfile = useCallback(async (payload: ProfileUpdatePayload) => {
    const updated = await authApi.updateProfile(payload);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updated));
    setUser(updated);
    return updated;
  }, []);
```

Thêm vào `value` useMemo:

```tsx
      updateProfile,
```

và thêm `updateProfile` vào mảng dependency của useMemo.

- [ ] **Step 4: Type-check frontend**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: lỗi chỉ ở `FacebookCompletePage.tsx` (dùng `oauthFacebookComplete` đã xoá) — Task 6 sẽ sửa. Nếu không có lỗi nào, tốt.

> ⚠️ Nếu `tsc` fail vì `FacebookCompletePage.tsx` dùng method đã xoá → đó là **kỳ vọng**,
> Task 6 xử lý. Không sửa file đó ở task này.

- [ ] **Step 5: Commit**

```powershell
cd frontend
git add src/api/types.ts src/api/auth.ts src/context/AuthContext.tsx
git commit -m "feat(frontend): API client cập nhật hồ sơ + đổi luồng verify SĐT"
```

---

## Task 6: Frontend — trang xác minh SĐT (thay trang hoàn thiện hồ sơ)

**Files:**
- Create: `frontend/src/pages/FacebookPhoneVerifyPage.tsx`
- Create: `frontend/src/pages/FacebookPhoneVerifyPage.css`
- Delete: `frontend/src/pages/FacebookCompletePage.tsx`
- Delete: `frontend/src/pages/FacebookCompletePage.css`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `useAuth().loginWithTicket(ticket)`, `authApi.sendOtp(phone)`, `authApi.oauthPhoneVerify(payload)`, `OtpInput`, `isValidPhone`
- Produces: route `/oauth/facebook` → `FacebookPhoneVerifyPage`

- [ ] **Step 1: Tạo `FacebookPhoneVerifyPage.css`**

Tạo `frontend/src/pages/FacebookPhoneVerifyPage.css` — lấy nội dung từ `FacebookCompletePage.css` hiện có (đọc file trước khi xoá), đổi tên class `fb-complete` → `fb-phone`, bỏ style liên quan tới ô email nếu có, giữ nguyên phần card/header/form/input/otp/alert/submit.

- [ ] **Step 2: Tạo `FacebookPhoneVerifyPage.tsx`**

Tạo `frontend/src/pages/FacebookPhoneVerifyPage.tsx`:

```tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { OtpInput } from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/types';
import { isValidPhone } from '../utils/phone';
import './FacebookPhoneVerifyPage.css';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type Errors = Partial<{ phone: string; otp: string; form: string }>;

/**
 * FacebookPhoneVerifyPage — xác minh SĐT bằng OTP cho nhánh Facebook
 * KHÔNG chia sẻ email.
 *
 * ⚠️ Vì sao SĐT thay vì bắt nhập email?
 *   Nếu bắt user tự khai email → kẻ xấu khai email người khác để chiếm
 *   chỗ tài khoản đó trước khi chủ sở hữu thật đăng ký. SĐT + OTP SMS là
 *   bằng chứng sở hữu thật, và SĐT là UNIQUE trong DB → không ai chiếm
 *   chỗ được.
 */
export function FacebookPhoneVerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTicket } = useAuth();

  const ticket = params.get('ticket') ?? '';

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const resendTimer = useRef<number | null>(null);

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

  // Không có ticket → không thể làm gì, đưa về trang đăng nhập
  useEffect(() => {
    if (!ticket) {
      navigate('/dang-nhap', { replace: true });
    }
  }, [ticket, navigate]);

  const handleSendOtp = async () => {
    if (!isValidPhone(phone)) {
      setErrors((e) => ({ ...e, phone: 'Số điện thoại chưa hợp lệ (VD: 0912345678).' }));
      return;
    }
    setOtpSending(true);
    setErrors({});
    try {
      const res = await authApi.sendOtp(phone);
      setOtpSent(true);
      setResendIn(RESEND_SECONDS);
      if (res.otp) setDevOtp(res.otp);
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        form: e instanceof ApiError ? e.message : 'Không gửi được mã xác nhận.',
      }));
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!isValidPhone(phone)) {
      next.phone = 'Số điện thoại chưa hợp lệ (VD: 0912345678).';
    }
    if (otp.length !== OTP_LENGTH) {
      next.otp = 'Vui lòng nhập đủ mã xác nhận.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.oauthPhoneVerify({ ticket, phone, otp });
      // Ticket đã READY → đổi lấy token
      await loginWithTicket(ticket);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form:
          err instanceof ApiError
            ? err.message
            : 'Không xác minh được số điện thoại. Vui lòng thử lại.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="fb-phone">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="fb-phone__card" padding={0}>
          <div className="fb-phone__body">
            <header className="fb-phone__head">
              <div className="fb-phone__logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path
                    fill="#1877F2"
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
              </div>
              <Heading level={1} className="fb-phone__title">
                Xác minh số điện thoại
              </Heading>
              <Text type="supporting" className="fb-phone__sub">
                Tài khoản Facebook của bạn chưa chia sẻ email. Hãy xác minh số điện thoại
                để chúng tôi tạo tài khoản cho bạn. Mã xác nhận sẽ được gửi qua tin nhắn SMS.
              </Text>
            </header>

            <form className="fb-phone__form" onSubmit={handleSubmit} noValidate>
              <div className="fb-phone__field">
                <label className="fb-phone__label" htmlFor="fb-phone">Số điện thoại</label>
                <div className="fb-phone__phone-wrap">
                  <input
                    id="fb-phone"
                    type="tel"
                    className={`fb-phone__input ${errors.phone ? 'fb-phone__input--error' : ''}`}
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <button
                    type="button"
                    className="fb-phone__send-otp"
                    onClick={handleSendOtp}
                    disabled={otpSending || (otpSent && resendIn > 0)}
                  >
                    {otpSending
                      ? 'Đang gửi…'
                      : otpSent
                        ? (resendIn > 0 ? `Gửi lại (${resendIn}s)` : 'Gửi lại')
                        : 'Gửi mã'}
                  </button>
                </div>
                {errors.phone && (
                  <span className="fb-phone__err">{errors.phone}</span>
                )}
              </div>

              {otpSent && (
                <div className="fb-phone__field">
                  <label className="fb-phone__label">Mã xác nhận</label>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={OTP_LENGTH}
                    autoFocus
                    error={errors.otp}
                  />
                  {devOtp && (
                    <div className="fb-phone__dev">
                      <span className="fb-phone__dev-label">Mã OTP (dev):</span>
                      <button
                        type="button"
                        className="fb-phone__dev-code"
                        onClick={() => setOtp(devOtp)}
                      >
                        {devOtp}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errors.form && (
                <div className="fb-phone__alert" role="alert">{errors.form}</div>
              )}

              <Button
                type="submit"
                label={submitting ? 'Đang xử lý…' : 'Xác nhận & tiếp tục'}
                variant="primary"
                width="100%"
                isDisabled={submitting || !otpSent}
                isLoading={submitting}
                icon={submitting ? <Loader2 size={16} className="fb-phone__spinner" /> : undefined}
                className="fb-phone__submit"
              />
            </form>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 3: Xoá trang cũ**

Xoá `frontend/src/pages/FacebookCompletePage.tsx` và `frontend/src/pages/FacebookCompletePage.css`.

- [ ] **Step 4: Sửa `frontend/src/main.tsx`**

Đổi import và route:

```tsx
import { FacebookPhoneVerifyPage } from './pages/FacebookPhoneVerifyPage';
```

Route:

```tsx
                <Route path="/oauth/facebook" element={<FacebookPhoneVerifyPage />} />
```

- [ ] **Step 5: Type-check + build frontend**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không lỗi.

Run: `cd frontend && npm run build`
Expected: build thành công.

- [ ] **Step 6: Commit**

```powershell
cd frontend
git add src/pages/FacebookPhoneVerifyPage.tsx src/pages/FacebookPhoneVerifyPage.css src/pages/FacebookCompletePage.tsx src/pages/FacebookCompletePage.css src/main.tsx
git commit -m "feat(frontend): trang xác minh SĐT thay cho trang hoàn thiện hồ sơ Facebook"
```

---

## Task 7: Frontend — trang `/tai-khoan` + menu trong Header

**Files:**
- Create: `frontend/src/pages/AccountPage.tsx`
- Create: `frontend/src/pages/AccountPage.css`
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `{ user, updateProfile }`, `authApi.sendOtp(phone)`, `OtpInput`, `isValidPhone`
- Produces: route `/tai-khoan` → `AccountPage`

- [ ] **Step 1: Tạo `AccountPage.css`**

Tạo `frontend/src/pages/AccountPage.css` — dùng lại pattern từ `FacebookCompletePage.css` (đọc file đó **trước khi xoá** ở Task 6 — hoặc đọc lại từ git: `git show HEAD:frontend/src/pages/FacebookCompletePage.css`). Các class cần: `.account`, `.account__card`, `.account__body`, `.account__head`, `.account__title`, `.account__sub`, `.account__section`, `.account__row`, `.account__row-label`, `.account__row-value`, `.account__badge`, `.account__badge--warn`, `.account__form`, `.account__field`, `.account__label`, `.account__input`, `.account__input--error`, `.account__err`, `.account__phone-wrap`, `.account__send-otp`, `.account__alert`, `.account__submit`, `.account__dev`, `.account__dev-label`, `.account__dev-code`.

Màu lấy từ `src/styles/tokens.css` (không hardcode) — đọc file tokens trước khi viết.

- [ ] **Step 2: Tạo `AccountPage.tsx`**

Tạo `frontend/src/pages/AccountPage.tsx`:

```tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { OtpInput } from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/types';
import { isValidPhone } from '../utils/phone';
import './AccountPage.css';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Email tạm do backend sinh cho user Facebook chưa chia sẻ email. */
const TEMP_EMAIL_SUFFIX = '@facebook.local';

type Errors = Partial<{ email: string; phone: string; otp: string; form: string }>;

/**
 * AccountPage — trang cá nhân: xem thông tin + cập nhật email / SĐT.
 *
 * ⚠️ KHÔNG ép hoàn thiện hồ sơ — user có thể bỏ qua và dùng app bình thường.
 *   Chỉ hiện ô trống + nút cập nhật.
 */
export function AccountPage() {
  const { user, updateProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const resendTimer = useRef<number | null>(null);

  const isTempEmail = !!user?.email.endsWith(TEMP_EMAIL_SUFFIX);

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
      setErrors((e) => ({ ...e, phone: 'Số điện thoại chưa hợp lệ (VD: 0912345678).' }));
      return;
    }
    setOtpSending(true);
    setErrors({});
    try {
      const res = await authApi.sendOtp(phone);
      setOtpSent(true);
      setResendIn(RESEND_SECONDS);
      if (res.otp) setDevOtp(res.otp);
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        form: e instanceof ApiError ? e.message : 'Không gửi được mã xác nhận.',
      }));
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
    const phoneChanged = phone.trim() !== (user?.phoneNumber ?? '');

    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Email chưa đúng định dạng.';
    }
    if (phoneChanged && !isValidPhone(phone)) {
      next.phone = 'Số điện thoại chưa hợp lệ (VD: 0912345678).';
    }
    if (phoneChanged && otp.length !== OTP_LENGTH) {
      next.otp = 'Vui lòng nhập đủ mã xác nhận.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setSaved(false);
    try {
      const payload: { email?: string; phone?: string; otp?: string } = {};
      if (emailChanged) payload.email = email.trim().toLowerCase();
      if (phoneChanged) {
        payload.phone = phone;
        payload.otp = otp;
      }
      await updateProfile(payload);
      setEmail('');
      setPhone('');
      setOtp('');
      setOtpSent(false);
      setSaved(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form:
          err instanceof ApiError
            ? err.message
            : 'Không cập nhật được thông tin. Vui lòng thử lại.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="account">
        <Text type="supporting">Vui lòng đăng nhập để xem trang cá nhân.</Text>
      </section>
    );
  }

  return (
    <section className="account">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="account__card" padding={0}>
          <div className="account__body">
            <header className="account__head">
              <div className="account__icon" aria-hidden="true">
                <ShieldCheck size={24} />
              </div>
              <Heading level={1} className="account__title">
                Trang cá nhân
              </Heading>
              <Text type="supporting" className="account__sub">
                Cập nhật thông tin liên hệ để được hỗ trợ nhanh hơn khi đặt sân.
              </Text>
            </header>

            <div className="account__section">
              <div className="account__row">
                <span className="account__row-label">Họ tên</span>
                <span className="account__row-value">{user.fullName || 'Chưa cập nhật'}</span>
              </div>
              <div className="account__row">
                <span className="account__row-label">Email</span>
                <span className="account__row-value">
                  {user.email}
                  {isTempEmail && (
                    <span className="account__badge account__badge--warn">Chưa xác minh</span>
                  )}
                </span>
              </div>
              <div className="account__row">
                <span className="account__row-label">Số điện thoại</span>
                <span className="account__row-value">
                  {user.phoneNumber || 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <form className="account__form" onSubmit={handleSubmit} noValidate>
              <Heading level={2} className="account__form-title">
                Cập nhật thông tin
              </Heading>

              <div className="account__field">
                <label className="account__label" htmlFor="acc-email">Email</label>
                <input
                  id="acc-email"
                  type="email"
                  className={`account__input ${errors.email ? 'account__input--error' : ''}`}
                  placeholder="ban@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="account__err">{errors.email}</span>
                )}
              </div>

              <div className="account__field">
                <label className="account__label" htmlFor="acc-phone">Số điện thoại</label>
                <div className="account__phone-wrap">
                  <input
                    id="acc-phone"
                    type="tel"
                    className={`account__input ${errors.phone ? 'account__input--error' : ''}`}
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <button
                    type="button"
                    className="account__send-otp"
                    onClick={handleSendOtp}
                    disabled={otpSending || (otpSent && resendIn > 0)}
                  >
                    {otpSending
                      ? 'Đang gửi…'
                      : otpSent
                        ? (resendIn > 0 ? `Gửi lại (${resendIn}s)` : 'Gửi lại')
                        : 'Gửi mã'}
                  </button>
                </div>
                {errors.phone && (
                  <span className="account__err">{errors.phone}</span>
                )}
              </div>

              {otpSent && (
                <div className="account__field">
                  <label className="account__label">Mã xác nhận</label>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={OTP_LENGTH}
                    autoFocus
                    error={errors.otp}
                  />
                  {devOtp && (
                    <div className="account__dev">
                      <span className="account__dev-label">Mã OTP (dev):</span>
                      <button
                        type="button"
                        className="account__dev-code"
                        onClick={() => setOtp(devOtp)}
                      >
                        {devOtp}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errors.form && (
                <div className="account__alert" role="alert">{errors.form}</div>
              )}

              {saved && (
                <div className="account__alert account__alert--ok" role="status">
                  Đã cập nhật thông tin thành công.
                </div>
              )}

              <Button
                type="submit"
                label={submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
                variant="primary"
                width="100%"
                isDisabled={submitting || (!email.trim() && !phone.trim())}
                isLoading={submitting}
                icon={submitting ? <Loader2 size={16} className="account__spinner" /> : undefined}
                className="account__submit"
              />
            </form>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 3: Sửa `Header.tsx` — thêm menu "Trang cá nhân"**

Trong `frontend/src/components/Header.tsx`, trong khối `hdr__user-menu`, thêm nút trước dòng "Đăng xuất":

```tsx
                    <Link
                      to="/tai-khoan"
                      className="hdr__user-item"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserIcon size={15} aria-hidden="true" />
                      <span>Trang cá nhân</span>
                    </Link>
```

- [ ] **Step 4: Sửa `main.tsx` — thêm route `/tai-khoan`**

Thêm import `import { AccountPage } from './pages/AccountPage';` và route:

```tsx
                <Route path="/tai-khoan" element={<AccountPage />} />
```

- [ ] **Step 5: Type-check + build frontend**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không lỗi.

Run: `cd frontend && npm run build`
Expected: build thành công.

- [ ] **Step 6: Commit**

```powershell
cd frontend
git add src/pages/AccountPage.tsx src/pages/AccountPage.css src/components/Header.tsx src/main.tsx
git commit -m "feat(frontend): trang cá nhân cập nhật email và SĐT, thêm menu trong Header"
```

---

## Task 8: Verify end-to-end + cập nhật README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: toàn bộ thay đổi Task 1–7
- Produces: README cập nhật đúng trạng thái thực tế

- [ ] **Step 1: Build + test backend**

Run: `cd backend && .\mvnw.cmd -o -q package -DskipTests`
Expected: BUILD SUCCESS.

Run: `cd backend && .\mvnw.cmd test`
Expected: PASS.

- [ ] **Step 2: Type-check + build frontend**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không lỗi.

Run: `cd frontend && npm run build`
Expected: build thành công.

- [ ] **Step 3: Chạy backend và test API thật**

Run: `cd backend && .\mvnw.cmd spring-boot:run` (chạy nền, đợi "Started BackendApplication").

Test provider:
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/auth/oauth/providers -Method Get | ConvertTo-Json -Depth 5
```
Expected: `data.providers` chứa `"facebook"`.

Test endpoint mới cần JWT (401 khi không token):
```powershell
try { Invoke-RestMethod -Uri http://localhost:8080/api/auth/profile -Method Put -ContentType 'application/json' -Body '{}' } catch { $_.Exception.Response.StatusCode.value__ }
```
Expected: `401` (không phải 404 — chứng minh endpoint tồn tại và được bảo vệ).

Test `PUT /api/auth/profile` với token hợp lệ:
```powershell
# đăng nhập bằng tài khoản có sẵn để lấy token, rồi gọi profile
```
Expected: `data.email` trả về, `data.phoneNumber` có key đúng (đã đổi tên từ `phone`).

- [ ] **Step 4: Commit README**

Trong `README.md`:
- Mục "🌐 API Endpoints": đổi dòng `POST | /api/auth/oauth/facebook/complete` thành `POST | /api/auth/oauth/phone/verify` (Public · Xác minh SĐT bằng OTP khi Facebook không trả email · 409 khi SĐT đã đăng ký). Thêm dòng `PUT | /api/auth/profile` (JWT · Cập nhật email / SĐT · 409 khi trùng).
- Mục "📈 Tiến trình dự án": dòng `1.18` đổi mô tả thành "Đăng nhập Facebook (Graph API) — vào thẳng app, xác minh SĐT khi thiếu email" và đánh `✅`. Thêm dòng `1.22` — "Trang cá nhân: cập nhật email + SĐT (OTP)" đánh `✅`.
- Mục cảnh báo về Facebook (khoảng dòng 90): sửa để nói rõ Facebook **có** email thì vào thẳng app; **không** có email thì bắt xác minh SĐT bằng OTP.

```powershell
git add README.md
git commit -m "docs: cập nhật README cho luồng đăng nhập Facebook mới"
```

- [ ] **Step 5: Tổng kết**

Báo cáo cho user: kết quả build/test thật, output thật, còn lại gì chưa làm.

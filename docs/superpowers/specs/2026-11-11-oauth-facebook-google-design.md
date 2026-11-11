# Đăng nhập bằng Facebook & Google (OAuth 2.0 / OIDC)

> Ngày: 2026-11-11 · Trạng thái: chờ duyệt · Độ ước lượng: trung bình (1 bảng DB mới, 1 dependency mới, ~12 file)

## 1. Mục đích & vì sao

Hiện tại user chỉ đăng nhập được bằng email + mật khẩu, mà đăng ký bắt buộc có SĐT + OTP (tốn 1 tin SMS/người, và tốn tiền SpeedSMS). Với người dùng phổ thông (đặc biệt khách đến sân bằng điện thoại), bước nhập SĐT + chờ OTP là rào cản lớn.

Thêm đăng nhập Google/Facebook giúp:
- Tỷ lệ hoàn thành đăng ký tăng (không cần SMS).
- Không cần user nhớ mật khẩu.
- Trải nghiệm quen thuộc, tỷ lệ chuyển đổi cao hơn form.

**Không phải mục tiêu:** không thay thế luồng đăng ký OTP hiện tại. Đăng nhập OTP vẫn là luồng chính cho khách Việt không dùng mạng xã hội.

## 2. Mục tiêu / phi mục tiêu / chống-mục tiêu

### Mục tiêu
1. Đăng nhập bằng Google — tài khoản được tạo tự động, không cần OTP.
2. Đăng nhập bằng Facebook — vì Facebook **không cung cấp** cờ `email_verified`, không thể tin email do FB cung cấp ⇒ phải có bước hoàn thiện hồ sơ (email + SĐT có OTP).
3. Không để lộ token của provider (Google/Facebook) cho code frontend.
4. Không để token hệ thống (JWT) nằm trong URL.
5. Cho phép gộp tài khoản Google vào tài khoản đã tồn tại (chỉ khi email đã được Google xác minh).
6. Dễ mở rộng: thêm Zalo / Apple sau này chỉ cần thêm cấu hình, không đổi kiến trúc.

### Phi mục tiêu (không làm lần này)
- Huỷ đăng ký OAuth / unlink provider.
- Đăng nhập Apple, Zalo, GitHub.
- Quản trị liên kết tài khoản trong trang "Cài đặt tài khoản".
- Cho admin/chủ sân đăng nhập bằng OAuth (chỉ CUSTOMER).

### Chống-mục tiêu (thành công mà vẫn là thất bại)
- Chiếm đoạt tài khoản người dùng qua việc dùng Facebook với email trùng của người khác.
- Token/JWT lọt vào log server, browser history, hoặc Referer header.
- Đăng ký hàng loạt account Facebook ẩu (mỗi lần 1 account mà không tốn SMS).

## 3. Ràng buộc từ code hiện có

| Ràng buộc | Nguồn | Ảnh hưởng |
|---|---|---|
| `users.email`, `users.username`, `users.password` đều `NOT NULL` | `V1__baseline_users.sql:10-16` | User OAuth không có mật khẩu → phải ghi một hash BCrypt ngẫu nhiên (không ai đăng nhập được bằng nó). `username` phải tự sinh & unique. |
| `users.phone_number` UNIQUE, có thể NULL | `V6__add_unique_phone_number.sql` | Cho phép user Google tạo tài khoản chưa có SĐT. |
| `anyRequest().authenticated()` | `SecurityConfig.java:71` | Phải `permitAll` cho `/oauth2/**`, `/login/oauth2/code/**`, `/api/auth/oauth/**`. |
| Session `STATELESS`, CSRF tắt | `SecurityConfig.java:47-48` | Không dùng được `HttpSession` để lưu trạng thái OAuth → dùng cơ chế ticket do Spring quản lý + bảng DB riêng. |
| `AuthService.buildAuthResponse()` sinh access + refresh token | `AuthService.java:262` | Tái sử dụng nguyên vẹn → OAuth user có cùng cơ chế refresh/rotation/logout. |
| `OtpService.verifyOtp(phone, code)` | `OtpService.java:116` | Tái sử dụng cho bước hoàn thiện hồ sơ Facebook (verify SĐT). |
| `LoginRateLimiter` giới hạn 10 lần/giờ/IP | `LoginRateLimiter.java` | Tái sử dụng để giới hạn endpoint `exchange` (chống đoán ticket). |
| Cổng 5173 ↔ 8080 khác origin | `application.properties:92` | `redirect_uri` phải trỏ về **backend** (8080), không phải frontend. Frontend chỉ nhận redirect cuối cùng. |

## 4. Các hướng đã cân nhắc

| Hướng | Cách làm | Đánh giá |
|---|---|---|
| **A. Redirect qua backend** ✅ **đã chọn** | `spring-boot-starter-oauth2-client`. FE → `/oauth2/authorization/{provider}` → provider → callback backend → backend tạo ticket → redirect FE kèm `?ticket=` → FE đổi ticket lấy JWT. | Token provider không chạm frontend. FB + Google dùng chung code. Dễ thêm provider. Token hệ thống không nằm trong URL (chỉ ticket 1 lần, TTL 60s). |
| B. Frontend SDK | Google Identity Services / Facebook JS SDK lấy token → gửi backend verify | Token provider lộ trong code browser (rủi ro XSS). Mỗi lần login backend phải gọi ra ngoài. Phải nhúng script bên thứ ba. |
| C. Tự viết OAuth2 | Tự implement authorization code + PKCE | Rất dễ sai state/PKCE/nonce. Không dùng. |

**Đã chọn hướng A.**

### 4.1. Chính sách liên kết tài khoản (đã chốt)

| Provider | Email trùng tài khoản đã có | Hành vi |
|---|---|---|
| **Google** (`email_verified = true`) | → **Gộp tự động** vào tài khoản hiện có. Tạo bản ghi `oauth_accounts` trỏ về user đó. | An toàn: Google đã chứng minh sở hữu email. |
| **Google** (email không xác minh — không xảy ra với scope `email` mặc định) | Từ chối gộp. | |
| **Facebook** | **Không bao giờ gộp tự động.** Facebook không trả `email_verified` → không thể chứng minh sở hữu email. Nếu email đã tồn tại → báo lỗi *"Email này đã được dùng, hãy đăng nhập bằng mật khẩu"*. | Chặn chiếm đoạt tài khoản. |

> **Bất biến bảo mật:** mọi thao tác gộp tài khoản chỉ được phép khi provider xác nhận được `email_verified=true`. Provider nào không cung cấp cờ này (Facebook) **không bao giờ** được gộp tự động.

## 5. Kiến trúc & luồng

### 5.1. Google (không cần OTP)

```
User bấm "Đăng nhập bằng Google"
  → FE: window.location = {API_URL}/oauth2/authorization/google
  → Google authorize (redirect, state tự sinh/kiểm tra bởi Spring)
  → Google redirect → GET {API_URL}/login/oauth2/code/google
  → Backend OAuth2AuthorizedClient có token + userinfo
  → OAuthSuccessHandler:
      1. đọc sub, email, email_verified, name
      2. tìm oauth_accounts (provider='google', provider_user_id=sub)
         ├─ có  → lấy user → bước 5
         └─ không → tìm users theo email
              ├─ có & email_verified → gộp, tạo oauth_accounts
              └─ không → tạo user mới + oauth_accounts
      3. tạo ticket (TTL 60s, user_id, single-use)
      4. redirect → {FE}/oauth/callback?ticket=XXX
  → FE gọi POST {API_URL}/api/auth/oauth/exchange {ticket}
  → trả AuthResponse (access + refresh + user) → FE lưu token, navigate "/"
```

### 5.2. Facebook (bắt buộc hoàn thiện hồ sơ)

Vì không tin được email của Facebook nên **không tạo account trước**. Luồng 2 bước:

```
User bấm "Đăng nhập bằng Facebook"
  → ... đến callback như trên
  → OAuthSuccessHandler: KHÔNG tìm thấy oauth_accounts
      → tạo ticket DẠNG CHỜ (user_id = NULL, provider, provider_user_id, full_name)
      → redirect → {FE}/oauth/facebook?ticket=XXX
  → FE: GET /api/auth/oauth/ticket/{ticket}  → { status: "needs_profile", fullName }
  → FE hiện form: Họ tên (prefill) · Email · SĐT (+ nút "Gửi mã" dùng lại luồng OTP sẵn có)
  → FE: POST /api/auth/oauth/facebook/complete { ticket, email, phone, otp }
      → backend verify OTP(SĐT) → kiểm tra email/SĐT trùng → tạo user + oauth_accounts
      → nâng ticket thành ticket đăng nhập (user_id = user.id)
  → FE: POST /api/auth/oauth/exchange { ticket } → JWT → navigate "/"
```

Nếu user Facebook **đã** từng hoàn thiện hồ sơ (tức `oauth_accounts` đã có bản ghi) → đi thẳng như Google, không hỏi lại.

### 5.3. Ticket dùng-một-lần

Vì sao không đưa thẳng JWT vào URL:

- URL nằm trong browser history, log access của nginx/APM, và header `Referer` khi user bấm link ra ngoài.
- Ticket thì vô hại khi lộ: **chỉ dùng được 1 lần**, **hết hạn sau 60 giây**, và **không chứa thông tin định danh** (chỉ là UUID random 32 byte base64url).

| Thuộc tính | Giá trị |
|---|---|
| Cấu sinh | `SecureRandom` 32 byte → base64url (43 ký tự) |
| TTL | 60 giây |
| Sử dụng | 1 lần → đánh dấu `used = true` |
| Lưu trữ | bảng `oauth_tickets` (không dùng Redis — dự án chưa có Redis, và 1 lần/60s không cần) |
| Rate limit | `exchange` dùng chung `LoginRateLimiter` (10 lần/giờ/IP) |

## 6. Thay đổi database

### `V7__create_oauth_accounts.sql`

```sql
CREATE TABLE oauth_accounts (
    id                  VARCHAR(255) PRIMARY KEY,
    user_id             VARCHAR(255) NOT NULL REFERENCES users(id),
    provider            VARCHAR(20)  NOT NULL,
    provider_user_id    VARCHAR(255) NOT NULL,
    email_at_registration VARCHAR(100),
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT oauth_accounts_provider_uid_unique UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
```

- UNIQUE `(provider, provider_user_id)` chặn việc 1 provider-user bị gắn vào 2 account khác nhau (race condition khi 2 tab đăng nhập đồng thời).
- `email_at_registration` lưu lại email tại thời điểm liên kết, để đối chiếu khi user đổi email.

### `V8__create_oauth_tickets.sql`

```sql
CREATE TABLE oauth_tickets (
    ticket         VARCHAR(64) PRIMARY KEY,
    user_id        VARCHAR(255) REFERENCES users(id),
    provider       VARCHAR(20)  NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    full_name      VARCHAR(100),
    expires_at     TIMESTAMP    NOT NULL,
    used           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_oauth_tickets_expires_at ON oauth_tickets(expires_at);
```

- `user_id` NULL = ticket đang chờ user hoàn thiện hồ sơ (Facebook).
- Job `@Scheduled` (cùng lịch 03:00 với `AuthCleanupService`) xoá ticket quá 7 ngày để bảng không phình vô hạn.

### Thay đổi entity `User`

Không đổi schema `users`. Chỉ cần `password` cho user OAuth = hash BCrypt của chuỗi random 32 byte (không ai biết) → chặn đăng nhập bằng mật khẩu cho tài khoản OAuth.

## 7. Thay đổi backend

### Dependency
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

### File mới

| File | Vai trò |
|---|---|
| `entity/OAuthAccount.java` | JPA entity cho `oauth_accounts`. |
| `entity/OAuthTicket.java` | JPA entity cho `oauth_tickets`. |
| `repository/OAuthAccountRepository.java` | `findByProviderAndProviderUserId`, `existsBy...`. |
| `repository/OAuthTicketRepository.java` | `findByTicket`, `deleteByExpiresAtBefore`. |
| `auth/oauth/OAuthUserInfo.java` | record chuẩn hoá thông tin từ provider: `provider, providerUserId, email, emailVerified, fullName`. |
| `auth/oauth/OAuthUserInfoExtractor.java` | Đọc claim từ `OidcUser`/`OAuth2User` → `OAuthUserInfo`. Xử lý riêng Google (`email_verified`) và Facebook (`id` → `provider_user_id`, email không tin). |
| `auth/oauth/OAuthTicketService.java` | Sinh / đọi / hủy ticket. |
| `auth/service/OAuthAuthService.java` | Nghiệp vụ: tìm-tạo-gộp user, xử lý hồ sơ Facebook. |
| `auth/controller/OAuthController.java` | `GET /api/auth/oauth/providers`, `GET /api/auth/oauth/ticket/{t}`, `POST /api/auth/oauth/exchange`, `POST /api/auth/oauth/facebook/complete`. |
| `config/OAuthSuccessHandler.java` | Xử lý sau callback → tạo ticket → redirect FE. |
| `config/OAuthFailureHandler.java` | Lỗi → redirect FE kèm `?error=...`. |

### Sửa file

| File | Sửa gì |
|---|---|
| `config/SecurityConfig.java` | Thêm `.oauth2Login(o -> o.successHandler(...).failureHandler(...))` + `.oauth2Client()`; `permitAll` cho `/oauth2/**`, `/login/oauth2/code/**`, `/api/auth/oauth/**`. |
| `application.properties` (+ `.template`) | Khai báo 2 `registration` + `provider` (endpoint Facebook đặt tay vì Spring đã bỏ provider Facebook mặc định). |
| `service/AuthService.java` | Thêm method nội bộ để tạo user OAuth — **tái sử dụng `buildAuthResponse()`** để token đồng nhất với luồng email/mật khẩu. |

### Cấu hình provider

```properties
# ----- OAuth2 (Google / Facebook) -----
# client-id / client-secret lấy từ Google Cloud Console và Meta for Developers.
# Để trống → provider bị tắt (API /oauth/providers không trả về provider đó,
# frontend ẩn nút tương ứng).
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID:}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET:}
spring.security.oauth2.client.registration.google.scope=openid,email,profile
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}

spring.security.oauth2.client.registration.facebook.client-id=${FACEBOOK_CLIENT_ID:}
spring.security.oauth2.client.registration.facebook.client-secret=${FACEBOOK_CLIENT_SECRET:}
spring.security.oauth2.client.registration.facebook.scope=email,public_profile
spring.security.oauth2.client.registration.facebook.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}
```

**Không cần khai báo endpoint thủ công cho Google và Facebook.** Cả hai đều là *common provider* của Spring Security (`CommonOAuth2Provider.GOOGLE` / `.FACEBOOK`) — Spring tự điền authorize-uri, token-uri, user-info-uri, user-name-attribute. Xác minh bằng Spring Security 7.1 API docs: `CommonOAuth2Provider` vẫn còn đủ `FACEBOOK, GITHUB, GOOGLE, OKTA, X`.

⚠️ **Hai điểm phải override thủ công cho Facebook:**

1. **Version Graph API.** Mặc định của Spring dùng `v2.8` (rất cũ). Bắt buộc override sang version hiện hành:

```properties
# Graph API version — cập nhật mỗi năm (Meta tăng version 1 lần/năm).
# Bảng hỗ trợ: https://developers.facebook.com/docs/graph-api/changelog/versions/
app.oauth.facebook.graph-version=v27.0
spring.security.oauth2.client.provider.facebook.authorize-uri=https://www.facebook.com/v27.0/dialog/oauth
spring.security.oauth2.client.provider.facebook.token-uri=https://graph.facebook.com/v27.0/oauth/access_token
spring.security.oauth2.client.provider.facebook.user-info-uri=https://graph.facebook.com/v27.0/me?fields=id,name,email
spring.security.oauth2.client.provider.facebook.user-name-attribute=id
```

> Tại thời điểm viết doc: version mới nhất là **v27.0**. Các version cũ vẫn sống ~2 năm
> (v21.0 hết hạn 21/01/2027) nhưng nên dùng version mới nhất.

2. **Client authentication method.** Mặc định của Spring là `CLIENT_SECRET_POST` (secret nằm trong body). Meta chấp nhận cả hai, nhưng `CLIENT_SECRET_BASIC` an toàn hơn (secret trong header). Có thể override:

```properties
spring.security.oauth2.client.registration.facebook.client-authentication-method=client_secret_basic
```

**Về `client-id` rỗng:** Spring Boot **không** validate `client-id` lúc startup — app vẫn start bình thường, chỉ fail khi user bấm nút. Endpoint `GET /api/auth/oauth/providers` sẽ chỉ trả về provider có `client-id` khác rỗng → FE ẩn nút. (Cần test khởi động context không có env var để chắc chắn.)

### Sinh `username` cho user OAuth

`username` UNIQUE + chỉ cho phép `[a-zA-Z0-9_]` + tối đa 50 ký tự (ràng buộc của frontend hiện tại). Quy tắc:
1. Lấy local-part của email, loại ký tự không hợp lệ, cắt còn ≤ 40 ký tự.
2. Nếu rỗng → `user`.
3. Kiểm tra `existsByUsername` → nếu trùng, thêm hậu tố `_2`, `_3`… tối đa 5 lần thử, cuối cùng thêm 6 ký tự random.

## 8. Thay đổi frontend

| File | Sửa gì |
|---|---|
| `api/auth.ts` | Thêm `oauthProviders()`, `oauthTicket(ticket)`, `oauthExchange(ticket)`, `oauthFacebookComplete(payload)`. Kiểu TS đầy đủ, không `any`. |
| `context/AuthContext.tsx` | Thêm `loginWithTicket(ticket)` dùng chung hàm `persist()` sẵn có. |
| `pages/AuthPage.tsx` | Nút Google/Facebook đổi từ `<a href="#">` → `<button onClick={...}>`; disable khi provider không bật (lấy từ `GET /api/auth/oauth/providers`). |
| `pages/OAuthCallbackPage.tsx` (mới) | Đọc `?ticket=` → gọi `oauthExchange` → lưu token → `navigate('/')`. Hiện spinner + thông báo lỗi. |
| `pages/FacebookCompletePage.tsx` (mới) | Đọc `?ticket=` → gọi `oauthTicket` → nếu `needs_profile` thì hiện form họ tên/email/SĐT/OTP → `oauthFacebookComplete` → `oauthExchange` → `navigate('/')`. |
| `main.tsx` | Thêm 2 route: `/oauth/callback`, `/oauth/facebook`. |

**Lưu ý CORS:** `oauthExchange` là POST có body → cần CORS `POST` từ `http://localhost:5173` (đã có sẵn trong `SecurityConfig.corsConfigurationSource`).

**Lưu ý redirect:** `OAuthSuccessHandler` redirect tới `{FE_ORIGIN}/oauth/callback?ticket=...`. `FE_ORIGIN` lấy từ property `app.oauth.frontend-redirect-uri` (mặc định `http://localhost:5173`).

## 9. Bảo mật

| Rủi ro | Chặn bằng gì |
|---|---|
| Chiếm đoạt tài khoản qua Facebook với email trùng | Facebook không bao giờ gộp tự động; email trùng → lỗi yêu cầu đăng nhập bằng mật khẩu. Chỉ Google (`email_verified=true`) được gộp. |
| JWT lọt vào URL / log / Referer | Chỉ truyền **ticket** (1 lần, 60s, không chứa PII) qua URL. JWT chỉ đi qua body của `POST /exchange`. |
| Đoán ticket | `SecureRandom` 32 byte + `LoginRateLimiter` (10 lần/giờ/IP) + TTL 60s + đánh dấu đã dùng. |
| CSRF trên `exchange` | Endpoint không dùng cookie (token trả về body, FE tự lưu localStorage) → CSRF không áp dụng. `state` của OAuth do Spring sinh & kiểm tra, chống CSRF ở bước authorize. |
| Open redirect qua `redirect_uri` | `redirect_uri` cố định trong config, không lấy từ request. |
| Tạo hàng loạt account Facebook ẩu | Mỗi account FB mới **đều tốn 1 tin SMS** (verify SĐT) → dính giới hạn `registration_attempts` (3 lần/SĐT/24h) + `SmsRateLimiter` (10 lần/giờ/IP) sẵn có. Không cần thêm cơ chế mới. |
| Token provider lộ ra frontend | Không bao giờ gửi `access_token` của provider về FE. |
| User OAuth đăng nhập được bằng mật khẩu | `password` = hash BCrypt của chuỗi random 32 byte. |

## 10. Kiểm thử

### Unit / integration test (TDD, không cần provider thật)

| Test | Kiểm tra gì |
|---|---|
| `OAuthUserInfoExtractorTest` | Google có `email_verified` → `emailVerified=true`; Facebook → `emailVerified=false` **bất kể** provider có gửi gì. |
| `OAuthAuthServiceGoogleTest` | Google + email mới → tạo user; Google + email đã có + `email_verified=true` → **gộp**; Google + email đã có + `emailVerified=false` → **không** gộp, tạo user riêng; email trùng + Facebook → ném lỗi. |
| `OAuthTicketServiceTest` | Ticket random đủ dài; đọi 1 lần → lần 2 fail; quá 60s → fail; ticket không tồn tại → fail. |
| `OAuthAuthControllerTest` | `exchange` trả 401/400 đúng; ticket đã dùng → 400; rate-limit → 429. |
| `OAuthSuccessHandlerTest` | Redirect đúng URL + có `ticket`; provider lỗi → redirect kèm `error`. |
| `OAuthAccountRepositoryTest` | UNIQUE `(provider, provider_user_id)` chặn trùng. |

### Verify thủ công (cần credential thật)

Bắt buộc có: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET`.

1. Google: bấm nút → đăng nhập Google → về `/` đã có token → `GET /api/auth/me` trả user.
2. Google lần 2 (cùng tài khoản) → không tạo user mới (đếm `users` không tăng).
3. Google với email đã đăng ký bằng mật khẩu → gộp vào đúng user đó (không tạo user mới).
4. Facebook lần 1 → ra form hoàn thiện hồ sơ → nhập SĐT → "Gửi mã" → nhập OTP → tạo user.
5. Facebook lần 2 → vào thẳng `/` (không hỏi lại).
6. Facebook với email đã có → báo lỗi yêu cầu đăng nhập bằng mật khẩu.
7. Kiểm tra `oauth_tickets`: sau khi đổi ticket, `used = true`.
8. Kiểm tra log server không chứa JWT.

### Môi trường provider cần chuẩn bị

Xem mục **§11 — Việc cần đăng ký ở provider** (chi tiết từng bước).

## 11. Việc cần đăng ký ở provider

> **Câu trả lời cho câu hỏi "có cần đăng ký gì không": CÓ.**
> Cả 2 nhà cung cấp đều bắt buộc phải có App riêng trước khi dùng được.
> Cả hai đều **miễn phí**, không cần thẻ tín dụng, và làm trong khoảng 15-20 phút.
>
> ⚠️ **Không bắt buộc phải có để build code.** Toàn bộ code + unit test có thể chạy
> và pass mà không cần credential (dùng `MockOAuth2User` / test double).
> Credential chỉ cần cho **verify end-to-end với provider thật** ở bước cuối.

### 11.1. Google Cloud Console

| Bước | Chi tiết |
|---|---|
| 1 | Vào [console.cloud.google.com](https://console.cloud.google.com) → tạo project mới (tên tùy ý, VD `CauLongDee`) |
| 2 | Bật API: *APIs & Services* → *Library* → tìm **Google Identity / OpenID Connect** → *Enable* |
| 3 | *APIs & Services* → *OAuth consent screen* → chọn **External** → điền App name, Support email → chọn scope **3 scope**: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid` → *Save* |
| 4 | *Credentials* → *Create credentials* → **OAuth client ID** → Application type = **Web application** |
| 5 | *Authorized redirect URIs* → thêm `http://localhost:8080/login/oauth2/code/google` (và domain production sau) |
| 6 | Lấy **Client ID** + **Client Secret** → đặt vào biến môi trường `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

> **Lưu ý:** ở trạng thái *Testing*, consent screen chỉ cho phép **tài khoản Gmail của chính bạn** (test users) đăng nhập. Muốn user thật đăng nhập thì phải *Publish to production* — khi đó Google có thể yêu cầu bạn xác minh domain và mô tả ứng dụng (không cần verification website nếu app chỉ dùng scope cơ bản, nhưng Google có thể yêu cầu bổ sung).
>
> Trong lúc dev, chỉ cần thêm email của bạn vào *Test users*.

### 11.2. Meta for Developers (Facebook)

| Bước | Chi tiết |
|---|---|
| 1 | Vào [developers.facebook.com](https://developers.facebook.com) → *My Apps* → *Create App* |
| 2 | Chọn use case **Consumers** (login bằng tài khoản cá nhân) |
| 3 | Thêm sản phẩm **Facebook Login for Others** (hoặc *Facebook Login*) |
| 4 | Trong *Facebook Login* → *Settings* → *Valid OAuth Redirect URIs* → thêm `http://localhost:8080/login/oauth2/code/facebook` |
| 5 | Lấy **App ID** + **App Secret** (App Secret cần bấm *Show* → hiện mật khẩu Facebook) → đặt vào `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` |
| 6 | Trong *App Settings* → *Basic* → thêm **Privacy Policy URL** + **Terms of Service URL** + *Category* — bắt buộc để app Live |
| 7 | Bật toggle **Live** (góc trên cùng bên phải) khi sẵn sàng production |

> ⚠️ **2 giới hạn quan trọng của Meta:**
> 1. **Redirect URI bắt buộc là HTTPS** khi app ở trạng thái *Live*. `http://localhost` chỉ chạy được ở trạng thái *Development* (mặc định).
> 2. **Tên miền phải được Meta verify** (Settings → Basic → Domains). Nếu chưa verify, các user khác (ngoài test users / admin của app) sẽ **không** đăng nhập được.
>
> → Với dự án đang ở giai đoạn phát triển, chạy ở *Development* mode là đủ để test.

### 11.3. Đặt biến môi trường

```powershell
# PowerShell (session hiện tại)
$env:GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
$env:FACEBOOK_CLIENT_ID="1234567890123456"
$env:FACEBOOK_CLIENT_SECRET="abc123def456"

# Hoặc set vĩnh viễn cho user hiện tại
[Environment]::SetEnvironmentVariable("GOOGLE_CLIENT_ID","xxx","User")
```

Sau đó chạy backend từ **cửa sổ PowerShell mới** (để nhận env var) hoặc set trực tiếp trong `application-local.properties`.

> 🔒 **Không** commit `client-secret` vào git. `.properties` chính đã gitignore, nhưng file `.template` phải để placeholder.

## 12. Ảnh hưởng & rủi ro khi triển khai

| Rủi ro | Mức | Xử lý |
|---|---|---|
| `spring-boot-starter-oauth2-client` kéo thêm `spring-security-oauth2-*` | Thấp | Chỉ thêm dependency, không đụng code auth hiện tại. |
| Hai registration với `client-id` rỗng → app fail lúc start | Cao | Spring Boot **không** validate `client-id` rỗng lúc startup (chỉ fail khi user bấm nút). Nhưng để chắc, ta dùng `client-id=${GOOGLE_CLIENT_ID:}` (rỗng) và thêm endpoint `GET /api/auth/oauth/providers` chỉ trả về provider có `client-id` khác rỗng → FE ẩn nút. Kiểm tra bằng test khởi động context không có env var. |
| `username` sinh tự động trùng | Thấp | Vòng lặp tối đa 5 lần + hậu tố random. Có UNIQUE constraint ở DB chặn trường hợp cuối. |
| Đổi endpoint Facebook theo phiên bản API (`v21.0`) | Trung bình | Facebook tăng version theo năm. Đặt version ở 1 chỗ trong properties (`app.oauth.facebook.graph-version`) để dễ sửa. |
| `email_verified` từ Google là `String` hay `Boolean` | Trung bình | Claim OIDC có thể là boolean hoặc string `"true"`. Extractor phải xử lý cả hai. |

## 13. Việc còn lại cho builder

1. Thêm dependency + properties.
2. Viết entity + repository + migration V7, V8.
3. Viết `OAuthUserInfoExtractor` + test.
4. Viết `OAuthAuthService` + test.
5. Viết `OAuthTicketService` + test.
6. Viết handler + controller + test.
7. Sửa `SecurityConfig`.
8. FE: API client, AuthContext, 2 page mới, sửa AuthPage.
9. Chạy `.\mvnw.cmd -o test` + `tsc --noEmit` + `npm run build`.
10. Cập nhật `README.md` (tiến trình giai đoạn 1 + API endpoints + công nghệ).
11. Verify thủ công với credential thật (nếu user cấp).

## 14. Quyết định đã lấy (do tôi chọn, người dùng có thể đổi)

| Quyết định | Lý do |
|---|---|
| Google tạo account **không cần SĐT**; sau đó FE hiện banner "Bổ sung số điện thoại" dùng lại luồng OTP sẵn có. | Google đã chứng minh danh tính bằng email; hỏi SĐT ngay làm giảm tỷ lệ hoàn thành. SĐT vẫn được bổ sung được sau. |
| User OAuth có `role = CUSTOMER` | Admin/chủ sân không được đăng nhập bằng OAuth. |
| Email FB bị trùng → lỗi 409, không tự gộp, không gợi ý "đăng nhập bằng mật khẩu" kèm link trực tiếp | Tránh lộ việc email đã tồn tại cho kẻ dò email. |
| Lưu ticket trong DB chứ không Redis | Dự án chưa có Redis; lưu 1 ticket/60s không tạo tải. Khi scale nhiều instance thì chuyển sang Redis (đã ghi chú trong code). |
| Dùng bảng `oauth_accounts` riêng thay vì cột `provider`/`provider_user_id` trên `users` | Cho phép 1 user gắn nhiều provider, và lưu `email_at_registration` để đối chiếu. |

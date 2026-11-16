# Đăng nhập Facebook tức thì + hoàn thiện hồ sơ ở trang cá nhân

**Ngày:** 2026-11-13
**Trạng thái:** chờ duyệt

---

## 1. Vấn đề

Sau khi đăng nhập bằng Facebook, app **không** vào thẳng mà hiện trang "Hoàn thiện tài khoản"
(bắt nhập email + SĐT + OTP) — dù Facebook **đã** gửi email về cho app.

### Nguyên nhân gốc (đã xác minh bằng log backend + đọc code)

`OAuthUserInfoExtractor.java:26-28`

```java
private static final Set<String> TRUSTED_EMAIL_VERIFICATION_PROVIDERS = Set.of(OAuthUserInfo.GOOGLE);
```

Facebook không nằm trong danh sách này (Graph API không có cờ `email_verified`) nên
`emailVerified` **luôn = false**. Với `emailVerified = false`,
`OAuthAuthService.handleCallback()` rơi vào nhánh cuối (`OAuthAuthService.java:107-109`):

```java
String ticket = ticketService.issuePending(...);   // user_id = NULL
return OAuthLoginOutcome.needsProfile(info, ticket);
```

`OAuthSuccessHandler.java:62-63` → redirect `/oauth/facebook?ticket=...` → trang bắt hoàn thiện.

Bằng chứng log (`backend/target/run-default.log`, 2026-11-13 20:51):

```
select ... from oauth_accounts where provider=? and provider_user_id=?  → 0 dòng
select ... from users where email=?                                     → có dòng (Facebook ĐÃ trả email)
insert into oauth_tickets (... user_id ...)                             → user_id = NULL
```

### Phân biệt quan trọng

Facebook **không** có `email_verified` → không được tự động **gộp** vào tài khoản đã có
(rủi ro chiếm đoạt tài khoản). Nhưng **tạo tài khoản mới** bằng email đó thì **an toàn** —
không xung đột với ai. Đây là điểm mấu chốt của thay đổi này.

---

## 2. Quyết định (user đã chọn)

| Tình huống | Xử lý |
|---|---|
| Facebook **có** email | Tạo user ngay (`phone_number = null`) → cấp token → vào thẳng app |
| Facebook **không** có email | Bắt nhập **SĐT + OTP** → tạo user (email để trống, thêm sau ở trang cá nhân) |
| Email Facebook **trùng** tài khoản đã có | **Chặn 409** — "Email này đã được dùng, hãy đăng nhập bằng mật khẩu" |
| Hồ sơ thiếu (chưa có SĐT / email tạm) | Trang cá nhân hiện ô trống + nút cập nhật — **không ép** |

### Vì sao SĐT + OTP an toàn hơn email khi Facebook không trả email

Nếu bắt user tự khai email → kẻ xấu khai email của người khác để **chiếm chỗ** tài khoản đó
trước khi chủ sở hữu thật đăng ký (chủ sở hữu thật sẽ báo "email đã dùng").

SĐT thì an toàn hơn vì:
- **SMS OTP là bằng chứng sở hữu thật** — không thể khai SĐT của người khác mà vẫn nhận OTP.
- `users.phone_number` có ràng buộc **UNIQUE** → không ai chiếm chỗ được.
- Sẵn có rate-limit: 3 lần đăng ký/SĐT/24h + 10 lần/giờ/IP → chống đốt tiền SMS.

---

## 3. Mục tiêu / phi mục tiêu

**Mục tiêu**
1. Đăng nhập Facebook (có email) → cấp token ngay, vào thẳng app.
2. Facebook không có email → xác minh SĐT bằng OTP rồi vào app (email bổ sung sau).
3. Thông tin thiếu hiện ở trang cá nhân, không ép.

**Phi mục tiêu**
- Không đổi tường bảo mật gộp tài khoản (Facebook không bao giờ tự gộp vào tài khoản có sẵn).
- Không làm lại trang đăng ký / luồng OTP hiện có.
- Chưa đụng tới nghiệp vụ đặt sân.

---

## 4. Hướng tiếp cận đã cân nhắc

| | Cách | Đánh đổi | Kết quả |
|---|---|---|---|
| A | Đăng nhập ngay + trang cá nhân **ép** hoàn thiện khi vào | Phải làm trang mới + logic "chưa hoàn thiện" | ❌ user chọn B |
| **B** | **Đăng nhập ngay + trang cá nhân hiện ô trống + nút cập nhật (không ép)** | Ít ràng buộc hơn; user có thể đặt sân khi chưa có SĐT | ✅ **chọn** |

Trong hướng B, khi Facebook không có email, 3 phương án bảo mật:

| | Cách | Đánh đổi | Kết quả |
|---|---|---|---|
| | Chỉ email | Nhanh nhưng kẻ xấu chiếm chỗ được | ❌ |
| | Email + SĐT + OTP | An toàn nhất nhưng 3 bước | ❌ |
| **Chọn** | **SĐT + OTP, email để trống** | An toàn, 1 bước, email thêm sau | ✅ |

---

## 5. Thiết kế

### 5.1 Backend

#### 5.1.1 `OAuthAuthService.handleCallback()` — tách 2 nhánh Facebook

```
1. Đã có oauth_account (provider, provider_user_id) → dùng lại user đó → LOGGED_IN
2. Chưa có oauth_account:
   a. email CÓ (Facebook trả về):
      - email đã tồn tại trong users → ném EmailAlreadyExistsException (409)   ← CHẶN
      - ngược lại → tạo user mới (email = email FB, phoneNumber = null),
                    link oauth_account → LOGGED_IN
   b. email KHÔNG CÓ:
      → sinh ticket CHỜ (user_id = NULL) → trả NEEDS_PHONE
        (user phải xác minh SĐT bằng OTP trước khi ta tạo tài khoản)
```

> ⚠️ `email_verified` giờ **chỉ còn dùng cho Google** (gộp tài khoản đã có). Facebook
> không gộp, không cần cờ này nữa.

#### 5.1.2 Xác minh SĐT tạo user (nếu Facebook không có email)

`POST /api/auth/oauth/phone/verify` — **Public** (chưa có user, chưa có JWT).

Body: `{ "ticket": "...", "phone": "84912345678", "otp": "123456" }`

Quy tắc:
1. `providerUserId` lấy từ **ticket** (server-side), KHÔNG lấy từ client — nếu lấy từ client
   thì attacker có thể gắn tài khoản Facebook của mình vào `providerUserId` bất kỳ.
2. `otpService.verifyOtp(phone, otp)` — tái dùng luồng OTP sẵn có → FB cũng chịu rate-limit SMS.
3. Nếu `users.phone_number` đã có SĐT này → **chặn 409** "Số điện thoại này đã được đăng ký."
4. Tạo user:
   - `email` = `fb_<providerUserId>@facebook.local` (email tạm — user sẽ tự đổi ở trang cá nhân)
   - `phoneNumber` = SĐT đã verify
   - `fullName` = tên Facebook (nếu có)
   - mật khẩu = hash BCrypt của chuỗi random 32 byte (không ai đăng nhập được bằng mật khẩu)
5. Link `oauth_account` → `ticketService.attachUser(ticket, userId)` → ticket thành READY.
6. FE đổi ticket lấy JWT → vào app.

#### 5.1.3 `PUT /api/auth/profile` — cập nhật hồ sơ (mới) — **cần JWT**

Body: `{ "email"?: string, "phone"?: string, "otp"?: string }`

Quy tắc validate:

| Trường | Quy tắc |
|---|---|
| `phone` | Định dạng VN hợp lệ (E.164) · chưa tồn tại trong `users` |
| `otp` | Bắt buộc **khi có `phone`** → `otpService.verifyOtp(phone, otp)` |
| `email` | Đúng định dạng · chưa tồn tại trong `users` |
| `email` khi user **chưa có SĐT** | Bắt buộc phải kèm `phone` + `otp` hợp lệ trong **cùng request** → chứng minh sở hữu trước khi chiếm email |
| `email` khi user **đã có SĐT** (đã OTP-verify rồi) | Chỉ cần email hợp lệ + chưa tồn tại |

Trả về `UserDto` mới → FE cập nhật `AuthContext`.

#### 5.1.4 Trạng thái ticket

| Trạng thái | Ý nghĩa |
|---|---|
| `READY` | Đổi thẳng lấy JWT |
| `NEEDS_PHONE` | Facebook không có email → phải xác minh SĐT trước (ticket `user_id = NULL`) |

Đổi tên `NEEDS_PROFILE` → `NEEDS_PHONE` cho đúng nghĩa.

`GET /api/auth/oauth/ticket/{ticket}` giữ nguyên (trả `READY` | `NEEDS_PHONE`).

#### 5.1.5 Sửa lệch tên field `phone` / `phoneNumber`

Backend `UserDto` trả `phone`, frontend khai báo `phoneNumber` → đổi backend thành `phoneNumber`
(đồng bộ với entity `User.phoneNumber`).

#### 5.1.6 Các phần bỏ đi

| Bỏ | Lý do |
|---|---|
| `POST /api/auth/oauth/facebook/complete` (email + SĐT + OTP) | Thay bằng `/oauth/phone/verify` (chỉ SĐT + OTP) |
| `OAuthAuthService.completeFacebookProfile()` | Thay bằng `verifyPhoneAndCreateUser()` |
| `FacebookCompleteRequest` DTO | Không dùng nữa |
| `authApi.oauthFacebookComplete()` | Xoá |

Giữ lại: `OAuthTicketService.issuePending()` + `attachUser()` (dùng cho nhánh NEEDS_PHONE),
`OAuthLoginOutcome.NEEDS_PHONE`.

#### 5.1.7 Schema

**Không cần migration.** `users.email` NOT NULL UNIQUE → email tạm
`fb_<providerUserId>@facebook.local` unique (providerUserId là duy nhất).
`users.phone_number` đã nullable + UNIQUE.

### 5.2 Frontend

#### 5.2.1 Đổi `FacebookCompletePage` → `FacebookPhoneVerifyPage`

Route `/oauth/facebook` giữ nguyên (đổi tên component + file).

Nội dung mới:
- Tiêu đề: **"Xác minh số điện thoại"**
- Giải thích: "Tài khoản Facebook của bạn chưa chia sẻ email. Hãy xác minh số điện thoại
  để chúng tôi tạo tài khoản cho bạn."
- Input SĐT → nút "Gửi mã xác nhận" → `OtpInput` → nút "Xác nhận & tiếp tục".
- Xoá ô email khỏi form này.

Sau khi verify thành công → `loginWithTicket(ticket)` → vào app.

#### 5.2.2 Trang mới `/tai-khoan` (`AccountPage.tsx` + `.css`)

Nội dung:
- Khối "Thông tin tài khoản": họ tên, email (badge "Chưa xác minh" nếu là email tạm
  `@facebook.local`), số điện thoại (hiện "Chưa cập nhật" nếu null).
- Khối "Cập nhật thông tin": input email, input SĐT, nút "Gửi mã xác nhận", ô OTP
  (dùng lại `OtpInput`), nút "Lưu thay đổi".
- Không ép: nút "Lưu" chỉ disable khi form rỗng.
- Nhận biết email tạm: `user.email.endsWith('@facebook.local')`.

Dùng lại: `Card`, `Heading`, `Text`, `Button` từ `@astryxdesign/core`; `OtpInput`; `isValidPhone`.

#### 5.2.3 `Header` — thêm mục "Trang cá nhân" vào dropdown user

`<Link to="/tai-khoan">` trong menu user, trên dòng "Đăng xuất".

#### 5.2.4 `AuthContext` — thêm `updateProfile(payload)`

Gọi `PUT /api/auth/profile`, cập nhật `localStorage` + state `user`.

#### 5.2.5 Sửa type `User.phone` → `phoneNumber` trong `frontend/src/api/types.ts`

---

## 6. Các file thay đổi

**Backend**
- `auth/service/OAuthAuthService.java` — nhánh Facebook tạo user ngay; `verifyPhoneAndCreateUser()`; `updateProfile()`
- `auth/dto/UserDto.java` — `phone` → `phoneNumber`
- `auth/dto/ProfileUpdateRequest.java` — **mới**
- `auth/dto/OAuthPhoneVerifyRequest.java` — **mới** (thay `FacebookCompleteRequest`)
- `auth/controller/AuthController.java` — thêm `PUT /profile`
- `auth/controller/OAuthController.java` — `/facebook/complete` → `/phone/verify`
- `auth/service/OAuthLoginOutcome.java` — `NEEDS_PROFILE` → `NEEDS_PHONE`
- `auth/dto/OAuthTicketStatus.java` — `NEEDS_PROFILE` → `NEEDS_PHONE`
- `auth/dto/FacebookCompleteRequest.java` — xoá

**Frontend**
- `pages/FacebookPhoneVerifyPage.tsx` + `.css` — **đổi từ `FacebookCompletePage`**
- `pages/FacebookCompletePage.tsx` + `.css` — xoá
- `pages/AccountPage.tsx` + `.css` — **mới**
- `main.tsx` — thay route
- `components/Header.tsx` — thêm menu "Trang cá nhân"
- `context/AuthContext.tsx` — thêm `updateProfile`
- `api/auth.ts` — `oauthFacebookComplete` → `oauthPhoneVerify`; thêm `updateProfile`
- `api/types.ts` — sửa `phoneNumber`; `OAuthTicketStatus.status`

**Test backend** (cập nhật cho khớp hành vi mới)
- `auth/service/OAuthAuthServiceTest.java`
- `config/OAuthSuccessHandlerTest.java`

---

## 7. Tiêu chí nghiệm thu

1. Đăng nhập Facebook (lần đầu, **có** email) → vào thẳng app, không thấy trang "Hoàn thiện tài khoản".
2. Đăng nhập Facebook (lần đầu, email **đã có** trong hệ thống) → báo lỗi 409 tiếng Việt.
3. Đăng nhập Facebook (lần sau) → vào thẳng app, dùng lại user cũ.
4. Đăng nhập Facebook (**không** có email) → hiện trang "Xác minh số điện thoại" → nhập SĐT + OTP → vào app.
5. Trường hợp 4 mà SĐT đã đăng ký → báo 409, không tạo user.
6. Vào `/tai-khoan` → đổi email (khi chưa có SĐT thì bắt buộc SĐT + OTP) → lưu được.
7. `mvnw package` BUILD SUCCESS, test backend pass.
8. `tsc --noEmit` không lỗi, `npm run build` thành công.

---

## 8. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| User đặt sân khi chưa có SĐT (case Facebook có email) | Chấp nhận (hướng B). SĐT dùng cho check-in/nhắc nhở — thêm ở giai đoạn vận hành |
| Email tạm lọt vào danh sách gửi mail | Chưa có chức năng gửi mail; sẽ chặn khi thêm |
| Kẻ xấu chiếm email qua đổi email | Bắt buộc OTP SĐT trước khi đổi email khi chưa có SĐT; khi đã có SĐT đã verify thì email thay bằng email khác chưa tồn tại |
| Kẻ xấu khai SĐT người khác ở nhánh NEEDS_PHONE | SĐT phải verify OTP → không khai được SĐT không thuộc về mình; SĐT UNIQUE → không chiếm chỗ |

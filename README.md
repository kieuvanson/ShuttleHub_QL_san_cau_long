# Cầu Lông dee

Ứng dụng quản lý sân cầu lông — khách tìm sân trống, xem giá theo khung giờ, đặt sân và thanh toán.

## 🚀 Công nghệ sử dụng

**Backend**
- Spring Boot **4.1.1** · Java **25**
- Spring Security + JWT (access token 15 phút, refresh token 7 ngày, có rotation)
- **OAuth2 Client** — đăng nhập Google (OIDC) & Facebook (Graph API v27.0)
- Spring Data JPA · Hibernate · **Flyway** (migration)
- PostgreSQL · Lombok · Validation
- SpeedSMS (gửi OTP qua SMS) — provider `speedsms` (thật) hoặc `mock` (dev)

**Frontend**
- **Vite** · **React 19** · **TypeScript**
- React Router · framer-motion · lucide-react
- **Vitest** + `@testing-library/react` / `@testing-library/jest-dom` (test cho feed + hàm thuần)
- **Astryx design system** — `@astryxdesign/core` (174 component, React 19) · `@astryxdesign/theme-neutral` (theme nền tảng) · `@astryxdesign/cli` (docs / component / theme build)
- Theme riêng `caulongdee` extends từ Neutral tại `src/themes/caulongdee/`
- CSS tokens (`src/styles/tokens.css`) + CSS cascade layers (`src/styles/layers.css`)

---

## 📦 Cài đặt

1. Clone repository:
```bash
git clone https://github.com/sonki236/CauLongDee.git
```

2. Cấu hình database:
```bash
# Copy file template ra file thật
cd backend/src/main/resources
cp application.properties.template application.properties

# Sửa password + JWT secret trong application.properties
# spring.datasource.password=YOUR_PASSWORD
# app.jwt.secret=RANDOM_256_BIT_STRING
```

3. Chạy backend (:8080):
```bash
cd backend
.\mvnw.cmd spring-boot:run
```

4. Chạy frontend (:5173):
```bash
cd frontend
npm install
npm run dev
```

5. Flyway sẽ tự động chạy migration lần đầu:
   `V1__baseline_users.sql` → `V2__create_otp_codes.sql` → `V3__create_refresh_tokens.sql`
   → `V4__normalize_phone_numbers.sql` → `V5__create_registration_attempts.sql`
   → `V6__add_unique_phone_number.sql` → `V7__create_oauth_accounts.sql`
   → `V8__create_oauth_tickets.sql`

6. (Tùy chọn) Dùng SMS giả lập khi phát triển — không tốn tiền tin nhắn:
```bash
cd backend/src/main/resources
cp application-local.properties.template application-local.properties
# rồi chạy: .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```
> Profile `local` đặt `app.sms.provider=mock` → mã OTP in ra log server
> (và hiện trên màn hình). **Production phải dùng `app.sms.provider=speedsms`**
> + biến môi trường `SPEEDSMS_ACCESS_TOKEN`.

6. (Tùy chọn) Bật đăng nhập Google / Facebook — cấu hình credential qua biến môi trường:
```bash
# Google Cloud Console → Credentials → OAuth 2.0 Client (Web)
#   Authorized redirect URI: http://localhost:8080/login/oauth2/code/google
export GOOGLE_CLIENT_ID=...
export GOOGLE_CLIENT_SECRET=...

# Meta for Developers → Facebook Login → Settings → Valid OAuth Redirect URIs
#   http://localhost:8080/login/oauth2/code/facebook
export FACEBOOK_CLIENT_ID=...
export FACEBOOK_CLIENT_SECRET=...

# Nơi backend redirect về sau khi đăng nhập thành công
export OAUTH_FRONTEND_REDIRECT_URI=http://localhost:5173
```
> ⚠️ Nếu **không** cấu hình credential → app vẫn khởi động bình thường, nút
> Google/Facebook tự ẩn khỏi trang đăng nhập (backend trả danh sách provider
> rỗng qua `GET /api/auth/oauth/providers`).
>
> ⚠️ Với **Facebook**: Meta chỉ cấp `email` khi user đã cấp quyền `email`.
> Nếu **có** email → app tạo tài khoản và đăng nhập vào thẳng, không hỏi
> thêm gì. Nếu **không có** email → app bắt user **xác minh số điện thoại
> bằng mã OTP** rồi mới tạo tài khoản (email tạm `@facebook.local`); user
> tự đổi sang email thật ở trang `/tai-khoan`.

---

## 📁 Cấu trúc dự án

```
QL_san_cau_long/
├── backend/
│   └── src/main/
│       ├── java/vn/ShuttleHub/backend/
│       │   ├── auth/            # controller · dto · exception · service · sms · oauth
│       │   ├── common/          # PhoneNumbers — chuẩn hoá SĐT E.164
│       │   ├── config/          # SecurityConfig · OAuth2ClientConfig · handlers
│       │   ├── entity/          # JPA entities
│       │   ├── repository/      # Spring Data JPA
│       │   └── security/        # JWT filter, entry point, access denied
│       └── resources/
│           ├── application.properties
│           └── db/migration/    # Flyway V{n}__{name}.sql
└── frontend/
    └── src/
        ├── api/                 # client.ts · auth.ts · types.ts
        ├── components/          # UI dùng chung
        ├── context/             # AuthContext.tsx
        ├── pages/               # Home · AuthPage · CourtDiscovery
        │                        # OAuthCallbackPage · FacebookPhoneVerifyPage · AccountPage
        ├── styles/              # tokens.css
        └── utils/               # phone.ts — chuẩn hoá SĐT (khớp backend)
```

---

## 🌐 API Endpoints

Tất cả response có shape `{ code, message, data }`.

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/send-otp` | Public | Gửi mã OTP về SĐT (chuẩn hoá E.164) · 429 khi vượt rate-limit |
| POST | `/api/auth/register` | Public | Đăng ký tài khoản (cần OTP) · 429 khi vượt giới hạn đăng ký/SĐT/ngày |
| POST | `/api/auth/login` | Public | Đăng nhập email + mật khẩu · 429 khi vượt rate-limit brute force |
| POST | `/api/auth/refresh` | Public | Cấp access token mới (rotation) |
| GET | `/api/auth/me` | Bearer | Thông tin user hiện tại |
| POST | `/api/auth/logout` | Bearer | Vô hiệu hoá toàn bộ refresh token |
| PUT | `/api/auth/profile` | Bearer | Cập nhật email / SĐT · đổi SĐT cần OTP · 409 khi trùng |

**OAuth2 (Google / Facebook)**

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/oauth2/authorization/{provider}` | Public | Bắt đầu luồng OAuth (redirect tới Google/Facebook) |
| GET | `/login/oauth2/code/{provider}` | Public | Callback từ provider (Spring Security xử lý) |
| GET | `/api/auth/oauth/providers` | Public | Danh sách provider đang bật (có client-id hợp lệ) |
| GET | `/api/auth/oauth/ticket/{ticket}` | Public | Trạng thái ticket: `READY` hoặc `NEEDS_PHONE` |
| POST | `/api/auth/oauth/exchange` | Public | Đổi ticket (1 lần, TTL 60s) lấy access + refresh token |
| POST | `/api/auth/oauth/phone/verify` | Public | Xác minh SĐT bằng OTP (Facebook không trả email) · 409 khi SĐT đã đăng ký |

> ⚠️ **JWT không bao giờ đi trong URL.** Sau khi provider redirect về, backend
> sinh một *ticket* dùng-một-lần (32 byte random, hết hạn 60 giây, không chứa
> PII) và chuyển hướng về `frontend/oauth/callback?ticket=...`. Frontend đổi
> ticket lấy token qua POST → token nằm trong body JSON, không nằm trong
> browser history / log server / header `Referer`.
>
> Ticket **chờ** (nhánh Facebook không trả email) có TTL riêng = 300s
> (`app.oauth.ticket-pending-ttl-seconds`) — vì user phải nhận SMS + gõ OTP,
> nếu chỉ 60s thì dễ hết hạn giữa chừng và phải đăng nhập Facebook lại.
>
> **Quy tắc gộp tài khoản:** chỉ provider có `email_verified=true` (Google) mới
> được tự động gộp vào tài khoản đã tồn tại. Facebook không có cờ này → nếu
> email trùng sẽ trả `409`, nếu email **mới** thì tạo tài khoản ngay và vào
> thẳng app (không ép hoàn thiện hồ sơ). Tài khoản OAuth có mật khẩu = hash
> BCrypt của chuỗi random 32 byte → không ai đăng nhập được bằng mật khẩu.
>
> ⚠️ **Facebook không chia sẻ email** (user chưa cấp quyền `email`) → app
> **không** bắt user tự khai email (tránh chiếm email người khác), mà bắt
> **xác minh SĐT bằng OTP**. Tài khoản được tạo với email tạm
> `fb_<providerUserId>_<hash>@facebook.local`; user tự đổi sang email thật ở
> trang `/tai-khoan` (đổi email cũng cần SĐT + OTP nếu chưa có SĐT).

> Endpoint mới ngoài `/api/auth/**` đều phải có JWT — không dùng `permitAll`.
>
> **Feed cộng đồng (giai đoạn 1):** chưa có endpoint — toàn bộ dữ liệu bài viết
> nằm trong state của frontend (`src/data/demoPosts.ts`) và mọi tương tác chạy
> client-side. Xem hạng mục 3.11 trong mục Tiến trình.
>
> **Mã lỗi auth:** `400` sai định dạng · `401` sai thông tin / token hết hạn / user bị khoá · `409` email/tên/SĐT trùng · `429` vượt rate-limit · `503` lỗi dịch vụ SMS.

---

## 📈 Tiến trình dự án

> **Quy ước:** mỗi khi hoàn thành một chức năng, AI **phải cập nhật lại mục này** trong `README.md` (xem luật trong `AGENTS.md` §10).
> Tick ✅ = đã xong và đã verify · 🚧 = đang làm · ⬜ = chưa bắt đầu.

### Giai đoạn 0 — Nền tảng

| # | Hạng mục | Trạng thái |
|---|----------|-----------|
| 0.1 | Khởi tạo Spring Boot 4.1.1 + Maven + kết nối PostgreSQL | ✅ |
| 0.2 | Flyway migration — bảng `users` | ✅ |
| 0.3 | Entity `User` + enum `Role` (ADMIN / EMPLOYEE / CUSTOMER) | ✅ |
| 0.4 | Vite + React 19 + TypeScript, router, design tokens | ✅ |

### Giai đoạn 1 — Xác thực (Auth)

| # | Hạng mục | Trạng thái |
|---|----------|-----------|
| 1.1 | Gửi OTP qua SpeedSMS + rate limiting | ✅ |
| 1.2 | Đăng ký tài khoản (verify OTP, soft delete) | ✅ |
| 1.3 | Đăng nhập email + password, JWT access/refresh token | ✅ |
| 1.4 | Refresh token rotation + phát hiện token reuse (revoke all) | ✅ |
| 1.5 | `GET /api/auth/me` + `POST /api/auth/logout` | ✅ |
| 1.6 | Trang đăng nhập / đăng ký (UI, tab, ô nhập OTP) | ✅ |
| 1.7 | Header hiển thị menu user đã đăng nhập | ✅ |
| 1.8 | Quên mật khẩu / đặt lại mật khẩu bằng OTP | ⬜ |
| 1.9 | Chuẩn hoá SĐT về E.164 (`PhoneNumbers`) + migration V4 | ✅ |
| 1.10 | `SmsSender` + 2 provider (`mock` / `speedsms`) chọn bằng config | ✅ |
| 1.11 | Rate-limit gửi OTP theo IP (10 lần/giờ) | ✅ |
| 1.12 | Giới hạn đăng ký 3 lần/SĐT/24h (bảng `registration_attempts`) | ✅ |
| 1.13 | Rate-limit đăng nhập theo IP (10 lần/giờ) — chống brute force | ✅ |
| 1.14 | UNIQUE constraint `users.phone_number` (chống race condition) | ✅ |
| 1.15 | JWT filter chặn user bị khoá (`isActive=false`) dùng token cũ | ✅ |
| 1.16 | Job `@Scheduled` dọn refresh token hết hạn (03:00 hằng ngày) | ✅ |
| 1.17 | Đăng nhập Google (OIDC) — ticket 1 lần, không lộ JWT trong URL | ✅ |
| 1.18 | Đăng nhập Facebook (Graph API) — có email thì vào thẳng app, không có email thì verify SĐT bằng OTP | ✅ |
| 1.19 | Tự động gộp tài khoản chỉ khi `email_verified=true` (Google) | ✅ |
| 1.20 | Bảng `oauth_accounts` + `oauth_tickets` (migration V7, V8) | ✅ |
| 1.21 | Nút social tự ẩn khi chưa cấu hình credential | ✅ |
| 1.22 | Trang cá nhân `/tai-khoan` — cập nhật email + SĐT (OTP) | ✅ |
| 1.23 | Ticket chờ (verify SĐT) TTL riêng 300s — không hết hạn giữa lúc chờ SMS | ✅ |

### Giai đoạn 2 — Quản lý sân (Chủ sân)

| # | Hạng mục | Trạng thái |
|---|----------|-----------|
| 2.1 | Quản lý cụm sân & sân (CRUD) | ⬜ |
| 2.2 | Đặt giá theo khung giờ (theo ngày trong tuần / giờ cao điểm) | ⬜ |
| 2.3 | Quản lý nhân viên | ⬜ |
| 2.4 | Dashboard doanh thu | ⬜ |

### Giai đoạn 3 — Tìm & đặt sân (Khách)

| # | Hạng mục | Trạng thái |
|---|----------|-----------|
| 3.1 | Trang tìm sân `/tim-san` + banner slideshow + tìm sân nhanh | ✅ |
| 3.2 | Tìm sân theo khu vực / giá / khung giờ, lọc theo ngang | ✅ |
| 3.3 | Bản đồ & danh sách sân nổi bật | ✅ |
| 3.4 | API tìm sân trống theo thời gian thực | ⬜ |
| 3.5 | Tạo booking + khóa slot chống đặt trùng | ⬜ |
| 3.6 | Trang "Sân của tôi" (lịch đặt sân) | ⬜ |
| 3.7 | Thanh toán (chờ chốt cổng: VNPay / MoMo / tiền mặt) | ⬜ |
| 3.8 | Redesign giao diện theo **Astryx design system** (theme Cầu Lông dee) | ✅ |
| 3.9 | **Feed cộng đồng ở trang chủ** — 2 cột (feed 700px + sidebar 320px), dải khoảnh khắc, 4 tab lọc (Tất cả / Tuyển người đánh / Xét kèo / Cảm nghĩ), 4 loại bài (xét kèo · tuyển người đánh · cảm nghĩ · sân cầu lông) | ✅ |
| 3.10 | Tương tác feed client-side (giai đoạn 1, dữ liệu demo): thích/bỏ thích, lọc theo loại, đăng bài mới (modal + radio loại + giới hạn 500 ký tự), chia sẻ deep-link `/?post=<id>` (copy clipboard + tự cuộn), toast báo tính năng chưa làm / yêu cầu đăng nhập | ✅ |
| 3.11 | Backend cho feed (bài viết, bình luận, theo dõi, ảnh khoảnh khắc) | ⬜ |
| 3.12 | **Tách trang chủ / trang tìm sân** — trang chủ `/` chỉ còn bảng tin cộng đồng; landing marketing (hero, sân nổi bật, bảng giá, thành phố, FAQ) chuyển sang `/tim-san`; link anchor trong header/footer cuộn đúng tới section | ✅ |

### Giai đoạn 4 — Vận hành (Nhân viên)

| # | Hạng mục | Trạng thái |
|---|----------|-----------|
| 4.1 | Check-in khách tại quầy (quét mã booking) | ⬜ |
| 4.2 | Xác nhận thanh toán tại sân | ⬜ |

---

## 📜 Quy trình phát triển

Dự án này dùng **Superpowers** plugin + file hướng dẫn AI:

| File | Nội dung |
|------|----------|
| `AGENTS.md` | Quy trình + convention + luật cập nhật README |
| `.cursor/rules/superpowers-workflow.mdc` | Luồng skill (brainstorming → plan → code → verify) |
| `.cursor/rules/backend-conventions.mdc` | Convention Spring Boot |
| `.cursor/rules/frontend-conventions.mdc` | Convention React + TypeScript |

**Tóm tắt:** tính năng mới → brainstorm → design doc (`docs/superpowers/specs/`) → user duyệt → plan → code → verify → **cập nhật README**.

---

## 👤 Author

- **GitHub**: [@sonki236](https://github.com/sonki236)

## 📝 License

This project is for educational purposes.

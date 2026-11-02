# Cầu Lông dee

Ứng dụng quản lý sân cầu lông — khách tìm sân trống, xem giá theo khung giờ, đặt sân và thanh toán.

## 🚀 Công nghệ sử dụng

**Backend**
- Spring Boot **4.1.1** · Java **25**
- Spring Security + JWT (access token 15 phút, refresh token 7 ngày, có rotation)
- Spring Data JPA · Hibernate · **Flyway** (migration)
- PostgreSQL · Lombok · Validation
- SpeedSMS (gửi OTP qua SMS)

**Frontend**
- **Vite** · **React 19** · **TypeScript**
- React Router · framer-motion · lucide-react
- CSS tokens (`src/styles/tokens.css`)

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

---

## 📁 Cấu trúc dự án

```
QL_san_cau_long/
├── backend/
│   └── src/main/
│       ├── java/vn/ShuttleHub/backend/
│       │   ├── auth/            # controller · dto · exception · service
│       │   ├── config/          # SecurityConfig
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
        └── styles/              # tokens.css
```

---

## 🌐 API Endpoints

Tất cả response có shape `{ code, message, data }`.

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/send-otp` | Public | Gửi mã OTP về SĐT |
| POST | `/api/auth/register` | Public | Đăng ký tài khoản (cần OTP) |
| POST | `/api/auth/login` | Public | Đăng nhập email + mật khẩu |
| POST | `/api/auth/refresh` | Public | Cấp access token mới (rotation) |
| GET | `/api/auth/me` | Bearer | Thông tin user hiện tại |
| POST | `/api/auth/logout` | Bearer | Vô hiệu hoá toàn bộ refresh token |

> Endpoint mới ngoài `/api/auth/**` đều phải có JWT — không dùng `permitAll`.

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
| 3.1 | Trang chủ + banner + tìm sân nhanh | ✅ |
| 3.2 | Tìm sân theo khu vực / giá / khung giờ, lọc theo ngang | ✅ |
| 3.3 | Bản đồ & danh sách sân nổi bật | ✅ |
| 3.4 | API tìm sân trống theo thời gian thực | ⬜ |
| 3.5 | Tạo booking + khóa slot chống đặt trùng | ⬜ |
| 3.6 | Trang "Sân của tôi" (lịch đặt sân) | ⬜ |
| 3.7 | Thanh toán (chờ chốt cổng: VNPay / MoMo / tiền mặt) | ⬜ |

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

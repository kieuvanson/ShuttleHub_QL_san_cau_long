# AGENTS.md — Cầu Lông dee

> File này hướng dẫn AI (Cursor / Claude Code / Copilot…) làm việc đúng quy trình trong dự án này.
> Đọc file này **trước khi** trả lời bất kỳ yêu cầu nào của người dùng.

---

## 1. Dự án là gì

Nền tảng quản lý sân cầu lông: khách tìm sân trống → xem giá & khung giờ → đặt sân → thanh toán.
Ba nhóm vai trò trên cùng một sản phẩm web:

| Vai trò | Nhu cầu chính |
|---|---|
| **Khách** (CUSTOMER) | Tìm sân trống, đặt sân nhanh vài phút, thường dùng mobile |
| **Nhân viên** (EMPLOYEE) | Check-in khách tại quầy, vận hành hằng ngày, không xem tài chính đầy đủ |
| **Chủ sân** (ADMIN) | Quản lý sân, đặt giá theo khung giờ, duyệt booking, xem doanh thu |

**Stack:**

- Backend: Spring Boot **4.1.1**, Java 25, PostgreSQL, Maven, Flyway, Spring Security + JWT, Lombok
- Frontend: Vite, React **19**, TypeScript, React Router, framer-motion, lucide-react
- Package gốc backend: `vn.ShuttleHub.backend`

**Cách chạy:**

```powershell
# Backend (:8080)
cd backend
.\mvnw.cmd spring-boot:run

# Frontend (:5173)
cd frontend
npm run dev
```

**Ngôn ngữ:** Trả lời và comment bằng **tiếng Việt**. Tên biến/hàm/class viết tiếng Anh.
Không đưa Kotlin vào dự án này.

---

## 2. Nguyên tắc số 1 — Kiểm tra skill trước khi hành động

Dự án này dùng **Superpowers** plugin. Nếu có **bất kỳ 1% khả năng** một skill áp dụng cho việc đang làm → **phải invoke skill đó trước**, trước cả khi trả lời, trước khi đọc code, trước khi hỏi câu hỏi.

| Yêu cầu | Skill bắt buộc |
|---|---|
| "Làm/tạo/thêm X", tính năng mới, đổi hành vi | `brainstorming` |
| "Sửa lỗi", "không chạy", "lỗi khi…" | `systematic-debugging` |
| Viết code mới, thêm test | `test-driven-development` |
| Cần kế hoạch chi tiết trước khi code | `writing-plans` |
| Đã có plan, bắt đầu thực thi | `executing-plans` |
| Review code trước khi merge | `requesting-code-review` |
| Nhận feedback rồi sửa | `receiving-code-review` |
| Trước khi báo "đã xong" | `verification-before-completion` |
| 2+ task độc lập | `dispatching-parallel-agents` |
| Cần branch riêng để thử | `using-git-worktrees` |

Cách invoke: đọc `~/.cursor/plugins/local/superpowers/skills/<tên>/SKILL.md` rồi làm theo đúng checklist.
Nói rõ trong chat: `Using [tên skill] để [mục đích]`.

---

## 3. Brainstorming — không được bỏ qua

Mọi việc sáng tạo (tính năng mới, thêm API, đổi UI, đổi luồng nghiệp vụ):

1. **Đọc code hiện tại trước** — không hỏi lại thứ project đã trả lời được.
2. **Hỏi 1 câu mở mỗi lượt**, cụ thể cho dự án này. Không kèm menu ví dụ.
3. **Trình bày 2–3 cách làm** trong một tin nhắn riêng, nêu đánh đổi, **đề xuất 1 cách**, hỏi user chọn.
4. **Viết design doc**: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
5. **Chờ user duyệt design doc.**

> 🚧 **HARD GATE:** Chưa viết code sản phẩm, scaffolding, cài dependency, hay gọi skill implement cho tới khi user duyệt design doc.
> Đọc và khám phá thì được. Sau khi duyệt → chuyển sang `writing-plans`, **không** skill khác.

Ngoại lệ: user nói rõ *"làm luôn, không cần hỏi"* → bỏ gate.

---

## 4. Debugging — không đoán mò

1. **Tái hiện được** trước (lệnh/API cụ thể + output thật).
2. **Tìm nguyên nhân gốc** — đọc code, đọc log, không phải đoán.
3. Sửa **nguyên nhân gốc**, không sửa triệu chứng.
4. **Verify** bằng cách chạy thật (build + test + request thật).
5. Nhiều giả thuyết → tách từng cái, loại trừ.

Không sửa code mà không verify được. Nếu verify không được → **nói rõ** và xin phép chạy.

---

## 5. Convention Backend (Spring Boot)

### Package
```
vn.ShuttleHub.backend
├── auth/       controller, dto, exception, service
├── config/     SecurityConfig
├── entity/     JPA entity
├── repository/ Spring Data JPA
└── security/   JwtAuthenticationFilter, entry point, access denied
```

### Entity
- Lombok: `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`
- `@Id @GeneratedValue(strategy = GenerationType.UUID)` → `String id`
- `@Enumerated(EnumType.STRING)` — không dùng ORDINAL
- Không đặt `@Size`/`@NotBlank` trên entity (chỉ ở DTO); `length` đặt trong `@Column`
- Soft delete qua cột `isActive`; `createdAt` có `updatable = false`

### DTO — record + validation
```java
public record LoginRequest(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email chưa đúng định dạng")
    String email
) {
    // Chuẩn hoá TRƯỚC khi validate — compact constructor chạy lúc Jackson deserialize
    public LoginRequest {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
```

### Migration Flyway
- `backend/src/main/resources/db/migration/V{n}__{snake_case}.sql`
- **Không sửa migration đã chạy** → tạo file version mới
- `ddl-auto=validate` → thiếu bảng = thiếu migration

### Security
| Điểm | Quy tắc |
|---|---|
| Access token | 15 phút, header `Authorization: Bearer` |
| Refresh token | 7 ngày, lưu **SHA-256 hash** trong `refresh_tokens` |
| Rotation | Mỗi lần refresh → revoke token cũ, cấp token mới |
| Replay | Dùng lại token đã revoke → revoke toàn bộ session + trả 401 |
| Transaction | `@Transactional(noRollbackFor = InvalidCredentialsException.class)` khi cần giữ lệnh revoke |
| Endpoint | Ngoài `/api/auth/**` → `authenticated()`, không `permitAll` |
| Lỗi 500 | Không trả `ex.getMessage()` (lộ SQL/path). Chỉ `log.error` |

### Transaction
`readOnly = true` **chỉ khi** thật sự không ghi DB. `login()` ghi refresh token → **không** được `readOnly`.

### Exception
- Exception riêng trong `auth/exception/`, message tiếng Việt
- Handler trong `GlobalExceptionHandler` (`@RestControllerAdvice`)
- Status: 400 validation · 401 auth · 409 conflict · 429 rate limit · 503 SMS · 500 chung

### Comment
Tiếng Việt, giải thích **tại sao** chứ không **cái gì**.

---

## 6. Convention Frontend (React 19 + TS)

### Type
- **Không dùng `any`** — tạo type cho mọi payload API
- Union type cho trạng thái: `type LoadState = 'idle' | 'loading' | 'success' | 'error'`

### API client
`src/api/client.ts` là **cửa duy nhất** để gọi API.
```ts
const res = await api.get<Court[]>('/courts')       // ✅
const res = await fetch('/api/courts')               // ❌
```
| Tuỳ chọn | Ý nghĩa |
|---|---|
| mặc định | Gắn Bearer token + tự refresh khi 401 |
| `{ anonymous: true }` | Endpoint public |
| `{ signal }` | Hủy request khi unmount |

Backend trả `{ code, message, data }` → `client.ts` tự bóc `data`, ném `ApiError` khi `code !== 200`.

### Auth state
```tsx
const { isAuthenticated, user, logout } = useAuth()   // ✅
const token = localStorage.getItem('accessToken')     // ❌
```
Dùng `useAuth()` từ `src/context/AuthContext.tsx`, không tự đọc/ghi token ở component.

### Component
- Functional component + hook, không class
- CSS **cùng file**: `Component.tsx` + `Component.css`
- Màu lấy từ `src/styles/tokens.css`, không hardcode
- Icon `lucide-react` · Animation `framer-motion` · Text tiếng Việt có dấu

---

## 7. Verify trước khi báo "xong"

**Không báo "đã xong" nếu chưa chạy thật.** Dùng `verification-before-completion`.

```powershell
# Backend
cd backend
.\mvnw.cmd -o -q package -DskipTests   # BUILD SUCCESS
.\mvnw.cmd spring-boot:run              # "Started BackendApplication"

# Frontend
cd frontend
.\node_modules\.bin\tsc --noEmit   # không lỗi
npm run build                       # build thành công
```

Test API thật bằng `curl.exe` / `Invoke-RestMethod` — **in ra response thật**, không tự nhận là OK.

Không verify được (vd: cần browser thật) → nói thẳng:
*"Phần này tôi chưa verify được vì cần \<browser / môi trường X\>. Bạn chạy thử giúp nhé."*

---

## 8. Git

- Không commit `application.properties`, `.env` (đã gitignore)
- Commit message mô tả **việc đã làm**, không viết "fix bug"
- Không tự `git push` trừ khi user yêu cầu

---

## 9. Phong cách phản hồi

1. **Đang dùng skill nào** (nếu có)
2. **Tìm ra gì** trong code (kèm file + dòng)
3. **Đã sửa/viết gì**
4. **Đã verify bằng cách nào** — kèm output thật
5. **Còn lại gì / cần user quyết định**

Không dump code dài trong chat — file đã trên đĩa, chỉ trích dẫn đoạn quan trọng.

---

## 10. Cập nhật README sau khi hoàn thành chức năng

**Bắt buộc:** mỗi khi một chức năng được hoàn thành và đã verify, phải cập nhật lại mục **"📈 Tiến trình dự án"** trong `README.md` ở gốc repo.

Cách làm:

1. Tìm hạng mục tương ứng trong bảng tiến trình của `README.md`.
2. Đổi trạng thái:
   - `⬜` → `✅` khi đã xong **và đã verify**
   - `⬜` → `🚧` khi đang làm dở
3. Nếu hạng mục đó **không có sẵn** trong bảng → thêm hàng mới vào đúng giai đoạn phù hợp.
4. Cập nhật luôn mục **"🌐 API Endpoints"** nếu chức năng có thêm/sửa endpoint (method, path, auth, mô tả).
5. Cập nhật mục **"🚀 Công nghệ sử dụng"** nếu thêm dependency mới (ví dụ thêm cổng thanh toán, thư viện mới).
6. Không sửa mục "Cài đặt" trừ khi lệnh chạy thay đổi.

> ⚠️ Chỉ đánh dấu `✅` khi đã **verify thật** (build pass + test API thật / build frontend pass).
> Không đánh dấu `✅` cho code chưa chạy được.

Bảng tiến trình chia theo 5 giai đoạn — giữ nguyên cấu trúc này khi thêm hạng mục mới:

| Giai đoạn | Nội dung |
|---|---|
| 0 — Nền tảng | Khởi tạo, kết nối DB, entity, scaffold frontend |
| 1 — Xác thực | Auth, OTP, JWT, trang đăng nhập |
| 2 — Quản lý sân (Chủ sân) | CRUD sân, khung giá, nhân viên, dashboard doanh thu |
| 3 — Tìm & đặt sân (Khách) | Tìm sân, đặt sân, thanh toán, sân của tôi |
| 4 — Vận hành (Nhân viên) | Check-in, xác nhận thanh toán |

---

## 11. Người dùng đang học Spring Boot

Người dùng mới học Java/Spring Boot và muốn học qua dự án này. Khi có thể, **giải thích kèm**:

- **Cú pháp** đang dùng (record, annotation, generic, stream API…)
- **Luồng xử lý** request: `Client → Controller → Service → Repository → DB → Response`
- **Lý do** chọn cách đó, và các cách khác đã cân nhắc rồi bị loại

Lưu ý bảo mật: giải thích để học, **không** làm lộ secret trong `application.properties` (mật khẩu DB, JWT secret, token SpeedSMS).

# Design — Hiển thị avatar & tên người dùng sau đăng nhập Facebook

- Ngày: 2026-11-16
- Trạng thái: chờ duyệt
- Phạm vi: avatar + tên rút gọn ở **header** và **ô viết bài đầu feed**

---

## 1. Ý định & lý do

Sau khi đăng nhập bằng Facebook, người dùng muốn thấy **ảnh đại diện thật** (avatar Facebook) và **tên của họ** ở hai chỗ dễ thấy nhất:

1. **Header** (`frontend/src/components/Header.tsx`) — nút bấm tài khoản, góc trên phải.
2. **Ô viết bài đầu feed** (`frontend/src/components/feed/FeedComposer.tsx`) — avatar tròn bên trái ô "Bạn muốn xét kèo hay tuyển người đánh cùng?".

Facebook trả về tên đầy đủ (ví dụ `"Kieu Van Son"`). Yêu cầu là hiển thị **tên rút gọn** (`"Son"`) ở hai chỗ này, nhưng **giữ nguyên tên đầy đủ** ở trang cá nhân.

---

## 2. Mục tiêu / không mục tiêu

### Mục tiêu
- G1. Avatar Facebook hiển thị đúng ở header và ô viết bài đầu feed.
- G2. Tên hiển thị ở 2 chỗ đó là **tên rút gọn** (tên cuối) — `"Kieu Van Son"` → `"Son"`.
- G3. Tên đầy đủ vẫn được lưu trong DB và hiện ở trang cá nhân (`/tai-khoan`).
- G4. Tài khoản đăng ký qua **cả 2 nhánh Facebook** đều có avatar:
  - nhánh (a) Facebook chia sẻ email → tạo user ngay;
  - nhánh (b) Facebook không chia sẻ email → xác minh SĐT rồi mới tạo user.
- G5. Ảnh lỗi / URL hết hạn / user không dùng OAuth → **không vỡ layout**, hiện chữ cái đầu.
- G6. Không phá vỡ luồng hiện t��i: user đăng ký bằng email/mật khẩu vẫn hoạt động y hệt.

### Không mục tiêu (anti-goals)
- A1. **Không** đổi avatar theo thời gian thực (user đổi ảnh trên Facebook → app không tự đổi). Chỉ cập nhật khi đăng nhập lại.
- A2. **Không** cho user upload ảnh đại diện riêng.
- A3. **Không** hiển thị avatar cho các bài đăng trong feed (dữ liệu demo chưa có avatar tác giả) — để giai đoạn sau khi có backend bài đăng thật.
- A4. **Không** thêm endpoint proxy ảnh qua backend.
- A5. **Không** tải ảnh về server / không thêm storage.

---

## 3. Ràng buộc kỹ thuật

| # | Ràng buộc | Nguồn |
|---|---|---|
| C1 | `ddl-auto=validate` → **mọi** thay đổi schema phải có file migration Flyway mới | `AGENTS.md` §5, `application.properties` |
| C2 | Không sửa file migration đã chạy | `AGENTS.md` §5 |
| C3 | `Avatar` của Astryx hỗ trợ `src`, `name`, `fallbackSrc`, `alt`, `size` → **không cần viết component mới** | `node_modules/@astryxdesign/core/src/Avatar/Avatar.tsx` |
| C4 | `Avatar` tự hiện chữ cái đầu khi `src` lỗi → **fallback miễn phí** | `Avatar.tsx` dòng ~334 |
| C5 | Frontend gọi API qua `src/api/client.ts`, type đầy đủ, không `any` | `AGENTS.md` §6 |
| C6 | Comment tiếng Việt giải thích **tại sao** | `AGENTS.md` §5 |
| C7 | `UserDto` được dựng ở **2 nơi** (`AuthService.toUserDto`, `ProfileService`) → thêm field phải sửa cả 2 | grep `new UserDto(` |

---

## 4. Các cách làm đã cân nhắc

### 4.1 Cách lưu avatar

| | A. Lưu URL vào DB | B. Dựng URL động | C. Tải ảnh về server |
|---|---|---|---|
| Mô tả | Thêm cột `users.avatar_url`, lưu `picture.data.url` lúc đăng nhập Facebook | Dựng `https://graph.facebook.com/{providerUserId}/picture?type=large` lúc trả DTO | Tải ảnh về `backend/uploads/`, lưu path nội bộ |
| Ưu | Nhanh, ít code, ảnh không phụ thuộc Facebook lúc render | Không cần migration, không bao giờ hết hạn | Ảnh không hết hạn, nhanh |
| Nhược | URL Facebook có thời hạn → ảnh hỏng (đã có fallback) | Thêm endpoint proxy → tải server; endpoint `picture` có thể cần access token → phải verify bằng token thật | Cần storage + xử lý file, scope lớn hơn nhu cầu |
| **Chọn** | ✅ **A — user đã chốt** | ❌ | ❌ |

→ **Chọn A.** Lỗi "URL hết hạn" được chấp nhận có chủ đích: `Avatar` của Astryx tự fallback về chữ cái đầu, layout không vỡ. Đăng nhập Facebook lần sau → URL mới → tự khỏi.

### 4.2 Cách rút gọn tên

| | (i) Rút gọn khi hiển thị | (ii) Rút gọn từ gốc |
|---|---|---|
| Mô tả | DB giữ `"Kieu Van Son"`; header + composer hiện `"Son"` | DB lưu `"Son"` ngay khi đăng nhập |
| Ưu | Giữ dữ liệu gốc; trang cá nhân hiện đầy đủ | Mọi nơi nhất quán |
| Nhược | Cần hàm rút gọn ở FE | Mất tên đầy đủ vĩnh viễn |
| **Chọn** | ✅ **i — user đã chốt** | ❌ |

---

## 5. Thiết kế chi tiết

### 5.1 Backend — lấy ảnh từ Facebook

**`OAuth2ClientConfig.buildFacebook()`** — thêm field vào Graph API call:

```
/me?fields=id,name,email,picture.type(large)
```

Scope `public_profile` đã có sẵn (`public_profile` là scope chứa ảnh profile).

**`OAuthUserInfo`** — thêm 1 trường:

```java
public record OAuthUserInfo(
    String provider,
    String providerUserId,
    String email,
    boolean emailVerified,
    String fullName,
    String avatarUrl   // ← mới
)
```

**`OAuthUserInfoExtractor`** — đọc `claims.get("picture")`, đi xuống `data.url`:

```
picture → { data → { url } }
```

Facebook trả `picture` dạng object lồng nhau. Cần đọc an toàn (null-safe, không ép kiểu cứng). Nếu không có → `null`.

### 5.2 Backend — lưu avatar

**Entity `User`** — thêm field:

```java
@Column(name = "avatar_url", length = 500)
private String avatarUrl;
```

**Migration `V9__add_avatar_url.sql`**:

```sql
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
```

**Entity `OAuthTicket`** — thêm field `avatar_url` (cùng lý do: nhánh (b) phải mang avatar qua ticket):

```java
@Column(name = "avatar_url", length = 500)
private String avatarUrl;
```

**Migration `V9__add_avatar_url.sql`** — thêm cả 2 bảng trong **1 file** (1 thay đổi schema = 1 file):

```sql
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE oauth_tickets ADD COLUMN avatar_url VARCHAR(500);
```

**`OAuthTicketService`** — `issuePending()` mang thêm `avatarUrl`; `issueForUser()` không cần (user đã có sẵn trong DB).

### 5.3 Backend — cập nhật avatar theo 2 nhánh Facebook

**Nhánh (a) — Facebook chia sẻ email** (`OAuthAuthService.handleCallback()`):

Cả 3 chỗ trả `OAuthLoginOutcome.loggedIn()` đều cần cập nhật avatar nếu có:

1. Đã liên kết trước đây (dòng ~84) → **cập nhật avatar** (user đổi ảnh trên Facebook → đăng nhập lại → ảnh mới).
2. Gộp vào user có sẵn qua Google (dòng ~110) → **cập nhật avatar**.
3. Tạo user mới (dòng ~121) → `createUser(email, fullName, avatarUrl)` → lưu luôn.

**Nhánh (b) — Facebook không chia sẻ email** (`verifyPhoneAndCreateUser()`):

- `createUser(tempEmail, pending.getFullName(), pending.getAvatarUrl())`.
- `OAuthTicketService.attachUser()` không cần sửa (avatar đã nằm trong ticket từ lúc `issuePending`).

**`createUser()`** — thêm tham số `avatarUrl`.

### 5.4 Backend — trả avatar cho frontend

**`UserDto`** — thêm field `avatarUrl`:

```java
public record UserDto(
    String id, String username, String email, String fullName,
    String phoneNumber, String role, LocalDateTime createdAt,
    String avatarUrl   // ← mới (đặt cuối để không phá vỡ thứ tự hiện tại)
) {}
```

**Sửa 2 chỗ dựng `UserDto`**: `AuthService.toUserDto()` + `ProfileService` (C7).

**`OAuthTicketStatus`** — thêm `avatarUrl` (để FE có thể hiện avatar ở màn xác minh SĐT nếu muốn; không bắt buộc nhưng rẻ).

### 5.5 Frontend — type & API

**`frontend/src/api/types.ts`**:

```ts
export interface User {
  // ... các field hiện có
  avatarUrl: string | null;
}
```

**`OAuthTicketStatus`** — thêm `avatarUrl: string | null`.

### 5.6 Frontend — rút gọn tên

**File mới `frontend/src/utils/displayName.ts`**:

```ts
/**
 * Rút gọn "Kieu Van Son" → "Son".
 * - Tách theo dấu cách, lấy TỪ CUỐI (tên gọi ở VN).
 * - 1 từ → giữ nguyên.
 * - Rỗng/null → trả null (component tự fallback).
 */
export function shortDisplayName(fullName: string | null | undefined): string | null
```

**Quy tắc**: tách theo khoảng trắng, lấy phần tử cuối. Bỏ qua case 1 từ (giữ nguyên) và case rỗng.

### 5.7 Frontend — component dùng chung

**File mới `frontend/src/components/UserAvatar.tsx`** — wrapper mỏng quanh `Avatar` của Astryx:

```tsx
type UserAvatarProps = {
  user: { fullName?: string | null; avatarUrl?: string | null } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};
```

- `src = user.avatarUrl ?? undefined` → không có URL thì `Avatar` hiện chữ cái đầu (C4).
- `name = shortDisplayName(user.fullName) ?? user.username ?? 'Khách'` → dùng tên rút gọn làm `name` để chữ cái đầu fallback là **"S"** thay vì "K".
- `alt` = tên rút gọn (mặc định của `Avatar` là `name`).

### 5.8 Frontend — dùng vào 2 chỗ

**Header** (`Header.tsx:44-53`) — thay `<UserIcon size={16} />` bằng `<UserAvatar user={user} size="sm" />`, và `<span>{user.fullName || user.username}</span>` bằng `<span>{shortDisplayName(user.fullName) || user.username}</span>`.

Menu thả xuống (`.hdr__user-info`, dòng ~64-66) — hiện tên **đầy đủ** (giữ nguyên `user.fullName`), vì menu là chỗ người dùng kiểm tra thông tin. Chỉ thêm avatar nhỏ bên cạnh.

**Ô viết bài** (`FeedComposer.tsx:29`) — thay `<Avatar name="Khách" size="md" />` bằng `<UserAvatar user={user} size="md" />`.

→ `FeedComposer` cần nhận `user` qua props (hiện chưa có). `Feed.tsx` đã có `user` từ `useAuth()` → truyền xuống.

**`FeedComposerModal`** — `authorName` hiện lấy `user?.fullName` (tên đầy đủ). Tên tác giả trên bài đăng nên là tên đầy đủ → **giữ nguyên**.

### 5.9 Frontend — xử lý ảnh lỗi

`Avatar` của Astryx đã tự fallback khi `src` lỗi (C4) → **không cần** `onError` thủ công. Nhưng thêm `fallbackSrc` không có ý nghĩa (không có ảnh dự phòng) → bỏ qua.

---

## 6. Những gì còn lại cho người implement

### Backend
1. Migration `V9__add_avatar_url.sql` — 2 lệnh `ALTER TABLE` (users + oauth_tickets).
2. `User.avatarUrl`, `OAuthTicket.avatarUrl`.
3. `OAuthUserInfo.avatarUrl` + đọc `picture.data.url` trong `OAuthUserInfoExtractor`.
4. `OAuth2ClientConfig`: thêm `picture.type(large)` vào `userInfoUri`.
5. `OAuthTicketService.issuePending()` mang `avatarUrl`.
6. `OAuthAuthService`: `createUser()` nhận `avatarUrl`; cập nhật avatar ở 2 nhánh (đã liên kết / gộp user có sẵn); nhánh SĐT dùng `pending.getAvatarUrl()`.
7. `UserDto.avatarUrl` + sửa 2 chỗ dựng DTO.
8. `OAuthTicketStatus.avatarUrl` (tuỳ chọn).

### Frontend
9. `types.ts`: `User.avatarUrl`, `OAuthTicketStatus.avatarUrl`.
10. `utils/displayName.ts` — hàm rút gọn tên.
11. `components/UserAvatar.tsx` — component dùng chung.
12. `Header.tsx` — dùng `UserAvatar` + tên rút gọn.
13. `FeedComposer.tsx` — nhận prop `user`, dùng `UserAvatar`.
14. `Feed.tsx` — truyền `user` xuống `FeedComposer`.

### Test (theo `test-driven-development`)
- Backend: `OAuthUserInfoExtractorTest` — đọc đúng `picture.data.url`, null-safe khi thiếu.
- Backend: `OAuthAuthServiceTest` — avatar được lưu khi tạo user (cả 2 nhánh).
- Frontend: `displayName.test.ts` — các case tên.
- Frontend: `UserAvatar.test.tsx` — có `src` thì truyền `src`; không có thì không truyền.
- Frontend: `Header.test.tsx` — hiện tên rút gọn.

### Verify
- `mvnw -o -q package -DskipTests` → BUILD SUCCESS
- `mvnw -o test` → tất cả pass
- `npm run test` → tất cả pass
- `npx tsc --noEmit` → exit 0
- `npm run build` → thành công
- **Test API thật**: đăng nhập Facebook thật (cần browser) → xác nhận `GET /api/auth/me` trả `avatarUrl` khác null. *Phần này cần browser thật — nếu không verify được thì phải nói rõ.*
- Đăng nhập Facebook lần 2 → `avatarUrl` được cập nhật.

---

## 7. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| URL ảnh Facebook hết hạn → ảnh hỏng | `Avatar` fallback về chữ cái đầu (C4). Đăng nhập lại → URL mới. |
| Facebook đổi tên người dùng → app không tự cập nhật `full_name` | Chấp nhận (A1). Đăng nhập lại sẽ cập nhật. |
| User đăng nhập bằng email/mật khẩu (không OAuth) → `avatarUrl = null` | `UserAvatar` không truyền `src` → hiện chữ cái đầu. |
| Tên Facebook có hậu tố lạ ("Kieu Van Son Jr.") → rút gọn ra "Jr." | Chấp nhận. Có thể chỉnh sau. |
| Graph API đổi format `picture` | Đọc null-safe, không có `picture` → `null`, không crash. |

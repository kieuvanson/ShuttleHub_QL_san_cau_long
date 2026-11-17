# Design — Trang cá nhân phong cách Facebook (`/tai-khoan`)

- Ngày: 2026-11-17
- Trạng thái: chờ duyệt
- Phạm vi: **frontend 100%**, dữ liệu demo, không đụng backend

---

## 1. Ý định & lý do

Trang `/tai-khoan` hiện tại chỉ là một form đổi email/SĐT — người dùng không có
"trang của tôi" để xem lại những gì mình đã làm trên Cầu Lông dee.

Yêu cầu: làm trang cá nhân **giống Facebook**, gồm 4 nhóm nội dung:

1. **Avatar + ảnh bìa** — định danh người dùng.
2. **Bài đã đăng** — các bài viết *của chính* người dùng đó.
3. **Kèo đang đặt** — lịch đặt sân / xét kèo / tuyển người đánh mà user đang tham gia.
4. **Khoảnh khắc** — ảnh ghi lại lúc đánh cầu lông.

Facebook làm được vì người dùng ở đó thấy "mình đã sống gì ở nơi này".
Cầu Lông dee cũng nên cho cảm giác đó: không chỉ là bảng "đặt sân", mà là
trang của một người chơi cầu lông.

---

## 2. Mục tiêu / không mục tiêu

### Mục tiêu
- G1. Một trang `/tai-khoan` duy nhất, có ảnh bìa + avatar đè góc (đúng kiểu Facebook).
- G2. Dải 4 tab: **Bài viết · Kèo đã đặt · Khoảnh khắc · Cài đặt**.
- G3. Tab "Bài viết" hiển thị bài của *chính user*, tái dùng `FeedPostCard` (đồng nhất feed).
- G4. Tab "Kèo đã đặt" hiển thị lịch đặt sân / kèo xét / kèo tuyển người, có trạng thái.
- G5. Tab "Khoảnh khắc" hiển thị dạng vòng tròn story (giống Facebook), bấm vào xem lớn.
- G6. Tab "Cài đặt" giữ nguyên chức năng cũ (đổi email/SĐT + OTP), chuyển sang dạng card 2 cột.
- G7. Nút "Chỉnh sửa hồ sơ" ở header → nhảy thẳng tab Cài đặt.
- G8. Chọn ảnh đại diện / ảnh bìa → **xem trước tại chỗ**, không lưu (chưa có backend upload).
- G9. Không phá vỡ luồng hiện tại: feed trang chủ, đăng nhập, header không đổi hành vi.

### Không mục tiêu (anti-goals)
- A1. **Không** tạo bảng DB, entity, migration, endpoint backend. Giai đoạn này là UI + dữ liệu demo.
- A2. **Không** upload ảnh thật lên server. Chỉ `URL.createObjectURL` xem trước trong phiên.
- A3. **Không** cho xem trang cá nhân của người khác (chưa có `/nguoi-dung/:id`).
- A4. **Không** sửa feed trang chủ. Feed vẫn dùng `demoPosts.ts` y nguyên.
- A5. **Không** thêm routing mới. Vẫn là `/tai-khoan`, tab dùng state + query param `?tab=`.

---

## 3. Ràng buộc kỹ thuật

| # | Ràng buộc | Nguồn |
|---|---|---|
| C1 | Ảnh chỉ có 9 file trong `public/img/` (`court-01..04`, `city-*`) → tái dùng, không thêm ảnh mới | `frontend/public/img/` |
| C2 | `Avatar` của Astryx nhận `size` là số px (`16..180`) → avatar lớn 128px dùng `size={128}` | `Avatar.tsx` dòng 100-108 |
| C3 | `TabList` của Astryx **không** dùng `role="tab"` mà render `<button data-tab-value>` + `aria-current` → test bám theo hành vi thật | `FeedTabs.test.tsx` dòng 6-9 |
| C4 | `FeedPostCard` nhận `post.authorName` → với bài của tôi, tác giả là chính user → truyền `user.fullName` | `FeedPostCard.tsx` |
| C5 | `Dialog` của Astryx + `Layout`/`LayoutContent` là cách mở ảnh lớn đã dùng ở `FeedStories` → tái dùng pattern | `FeedStories.tsx` dòng 55-87 |
| C6 | CSS phải nằm cùng file component (`X.tsx` + `X.css`), trong `@layer app` | `AGENTS.md` §6, `AccountPage.css` |
| C7 | `Card` của Astryx áp padding bằng StyleX → padding phải đặt ở wrapper div, không set trực tiếp | `AccountPage.css` dòng 27-31 |
| C8 | Không dùng `any`; mọi payload có type | `AGENTS.md` §6 |
| C9 | Comment tiếng Việt giải thích **tại sao** | `AGENTS.md` §5 |
| C10 | `useAuth()` là nguồn duy nhất cho thông tin user — không đọc `localStorage` trong component | `AGENTS.md` §6 |

---

## 4. Các cách làm đã cân nhắc

### 4.1 Cấu trúc trang

| | A. 1 trang + tab ngang | B. Tách 2 route | C. Facebook desktop 2 cột |
|---|---|---|---|
| Mô tả | `/tai-khoan`, tab đổi nội dung dưới | `/tai-khoan` + `/tai-khoan/cap-nhat` | Cột trái hồ sơ, cột phải feed |
| Ưu | Đúng ý "giống Facebook"; gom đủ 4 nhóm nội dung | URL sạch, form riêng | Đẹp, quét nhanh |
| Nhược | 1 URL dài, phải cuộn | Lệch Facebook, phải di chuyển form cũ | Không chỗ cho "kèo" + "cài đặt" → nhét sidebar |

**Chọn A** (user chọn) — vì giữ được cả 4 nhóm nội dung trong một chỗ, đúng tinh thần
"trang cá nhân Facebook" mà user mô tả.

### 4.2 Nguồn dữ liệu

| | A. Demo tĩnh trong file | B. Dữ liệu thật từ backend |
|---|---|---|
| Ưu | Có ngay trang hoàn chỉnh; khi có API chỉ thay nguồn | Đúng bản chất |
| Nhược | Giả | Cần bảng `posts`/`bookings`/`moments` + API + chuyển feed |

**Chọn A** (user chọn "demo trước đi"). Bảng backend cho feed vẫn là hạng mục ⬜ ở README.

### 4.3 Upload ảnh

| | A. Xem trước tại chỗ | B. Chỉ toast "giai đoạn sau" | C. Upload thật |
|---|---|---|---|
| Ưu | Có cảm giác "đã làm được" | Rất ít code | Đúng bản chất |

**Chọn A** (user chọn): `URL.createObjectURL(file)` → set vào state → hiển thị ngay
ở avatar/ảnh bìa. Không gửi đi đâu. Khi bấm lưu → toast "sẽ lưu ở giai đoạn sau".

> **Quyết định của builder (giai đoạn demo):** ảnh đã chọn được giữ trong state của
> `AccountPage` (state nâng lên trang, dùng chung cho cả `ProfileHeader` và
> `ProfileSettings`) → đổi ảnh xong thấy ở **cả 2 nơi** ngay, kể cả khi chuyển tab.
> Tải lại trang → mất ảnh preview (quay về `user.avatarUrl` từ server).
> URL cũ được `revokeObjectURL` khi bị thay thế hoặc khi unmount.

### 4.4 Khoảnh khắc

| | A. Vòng tròn story (chọn) | B. Lưới ảnh + Lightbox | C. Mở tab mới |
|---|---|---|---|
| Ưu | Giống Facebook nhất | Rõ nội dung hơn | Đơn giản |

**Chọn A** (user chọn). Vòng tròn có viền gradient + badge số ảnh, bấm vào mở `Dialog`
xem ảnh lớn kèm ghi chú + nút trước/sau.

---

## 5. Thiết kế chi tiết

### 5.1 Hình khối trang (từ trên xuống)

```
┌──────────────────────────────────────────────┐
│  ẢNH BÌA  (cao 240px, ảnh sân)               │  ← nút "Đổi ảnh bìa" góc phải
│                                              │
│      ┌────────┐                              │
│      │ AVATAR │  (128px, đè lên mép dưới)    │  ← nút camera nhỏ trên avatar
│      └────────┘  Kieu Văn Sơn                 │
│                  @kieu.van.son                │
│                  [Badge: Khách] [Badge: Vĩnh...]│
│                  📍 Quận 3 · 📅 Tham gia từ 2025│
│         [✎ Chỉnh sửa hồ sơ]  [⚙ Cài đặt]     │
├──────────────────────────────────────────────┤
│  [ Bài viết ] [ Kèo đã đặt ] [ Khoảnh khắc ] │
│  [ Cài đặt ]                                  │  ← dải tab ngang, dạng Facebook
├──────────────────────────────────────────────┤
│  Nội dung tab đang chọn                       │
└──────────────────────────────────────────────┘
```

- Container max-width `1080px`, giữa trang, nền `--surface-1`.
- Ảnh bìa: `div` cao cố định `240px` (desktop) / `160px` (≤720px), `<img object-fit: cover>` bên trong.
  Không dùng `AspectRatio` — `AspectRatio` đặt child vào `position:absolute` nên nút
  "Đổi ảnh bìa" phải nằm ngoài nó (wrapper `position:relative`).
- Avatar 128px (`<UserAvatar size="xl">`), bo tròn, viền trắng 4px, đè lên mép dưới
  ảnh bìa (`margin-top: -64px`). Ở mobile: 96px (`size={96}` — `Avatar` của Astryx
  chấp nhận size dạng số), `margin-top: -48px`.
- Tên: `Heading level={1}` (tên **đầy đủ** — khác header dùng tên rút gọn).
- Username: `@{user.username}`.
- Badge vai trò: map `user.role` → `CUSTOMER`→"Khách", `ADMIN`→"Chủ sân", `EMPLOYEE`→"Nhân viên".
- Badge trình độ cầu lông: dữ liệu demo (`"Trình độ B"`), nằm ở file demo → giai đoạn sau
  sẽ lấy từ hồ sơ thật.
- Thống kê nhỏ: số bài đã đăng, số kèo, số khoảnh khắc (tính từ dữ liệu demo).

### 5.2 Dải tab

Dùng `TabList` của Astryx (giống `FeedTabs`), 4 tab:
`posts` · `bookings` · `moments` · `settings`.

- Dải tab dùng `role="tablist"` + `panelId` → pattern tabs WAI-ARIA (`role="tab"` +
  `aria-selected`), đúng ngữ nghĩa vì có 4 panel thật. Mỗi panel có `id` khớp
  `panelId` và `role="tabpanel"`.
- Thanh lọc loại bài bên trong tab "Bài viết" dùng pattern navigation (mirror `FeedTabs`).

- Giá trị tab lưu trong `useSearchParams` (`?tab=posts`) → F5 không mất tab, có thể
  chia sẻ link. Mặc định `posts`.
- Nút "Chỉnh sửa hồ sơ" → `setSearchParams({tab: 'settings'})` + cuộn lên đầu.
- Nút "Cài đặt" ở header → tab `settings`.

### 5.3 Tab "Bài viết"

- Dùng lại `FeedPostCard` **nguyên vẹn** (cùng style với feed trang chủ → nhất quán).
- Nguồn: `DEMO_MY_POSTS` (file demo mới), 6 bài của chính user.
- Tác giả hiển thị = `user.fullName` (không phải tên hardcode trong data).
- Thanh bộ lọc nhỏ theo loại bài (tất cả / xét kèo / tuyển người / cảm nghĩ) — dùng
  lại `filterPosts` của `feedUtils.ts`.
- Trạng thái like: local state, giống `Feed.tsx`.
- Nút "Đăng bài mới" → mở lại `FeedComposerModal` (đã có sẵn) → bài mới chèn lên đầu.

### 5.4 Tab "Kèo đã đặt"

3 loại kèo, dùng `Badge` của Astryx để phân biệt màu:

| Loại | Badge | Ví dụ |
|---|---|---|
| `booking` | `Đã đặt sân` (variant `blue`) | Sân Cầu Lông Quận 1 · 19:00–20:00 |
| `challenge` | `Xét kèo` (variant `purple`) | Kèo đôi 21h tối thứ 7 · chờ đối thủ |
| `recruit` | `Tuyển người đánh` (variant `orange`) | Cần 1 bạn nữ đánh đôi · đã đủ 2/3 |

- Mỗi kèo là một `Card`: tiêu đề (sân / giờ), dòng thông tin (thời gian, khu vực, giá),
  badge trạng thái, và hành động phụ ("Hủy kèo" / "Xem sân" → toast "giai đoạn sau").
- Sắp xếp theo thời gian tăng dần; kèo đã qua hiển thị mờ + badge `Đã hoàn thành`.
- Dữ liệu: `DEMO_MY_BOOKINGS` — 6 kèo, cả 3 loại, trạng thái `upcoming` / `done`.

### 5.5 Tab "Khoảnh khắc"

- Dải vòng tròn giống `FeedStories`: ảnh tròn 72px, viền gradient 3px, tên bên dưới.
- Ô đầu tiên là "Thêm khoảnh khắc" (icon `Plus` trong nét tròn) → mở file picker →
  xem trước tại chỗ (preview-only, giống avatar).
- Bấm vào 1 khoảnh khắc → `Dialog` xem ảnh lớn, kèm:
  - tiêu đề = ghi chú khoảnh khắc,
  - dòng "Thời gian · Sân",
  - nút ‹ › chuyển ảnh trước/sau (Facebook-like),
  - nút "Thêm khoảnh khắc" để up thêm (preview-only).
- Dữ liệu: `DEMO_MY_MOMENTS` — 5 khoảnh khắc, ảnh tái dùng từ `public/img/`.

### 5.6 Tab "Cài đặt"

Tái sử dụng **nguyên vẹn** form của `AccountPage` hiện tại (đổi email / SĐT + OTP +
mã OTP dev), chuyển bố cục:

- Cột trái: thông tin hiện tại (họ tên, email, SĐT, username, badge "Chưa xác minh"
  nếu email tạm `@facebook.local`) → chính là `account__section` cũ.
- Cột phải: form cập nhật.
- Grid 2 cột ở ≥900px, 1 cột ở mobile.
- Thêm mục **"Ảnh hồ sơ"**: 2 nút "Đổi ảnh đại diện" / "Đổi ảnh bìa" → preview-only.
- Thêm mục **"Bảo mật"**: dòng "Mật khẩu" + nút "Đặt lại mật khẩu" → toast (giai đoạn sau).

### 5.7 Ranh giới dữ liệu demo

File mới: `frontend/src/data/demoProfile.ts`

```ts
export type ProfileBookingType = 'booking' | 'challenge' | 'recruit';
export type ProfileBookingStatus = 'upcoming' | 'done';

export type ProfileBooking = {
  id: string;
  type: ProfileBookingType;
  title: string;       // "Sân Cầu Lông Quận 1"
  timeLabel: string;   // "19:00 – 20:00 · Thứ 7, 22/11"
  area: string;        // "Quận 1"
  priceLabel: string;  // "80.000đ/giờ"
  status: ProfileBookingStatus;
  note?: string;       // "Cần thêm 1 bạn nữ đánh đôi"
};

export type ProfileMoment = {
  id: string;
  image: string;
  caption: string;
  timeLabel: string;
  place: string;
};

export const DEMO_MY_POSTS: FeedPost[];        // 6 bài
export const DEMO_MY_BOOKINGS: ProfileBooking[]; // 6 kèo
export const DEMO_MY_MOMENTS: ProfileMoment[];   // 5 khoảnh khắc
export const DEMO_SKILL_LEVEL = 'Trình độ B';
```

Không sửa `demoPosts.ts` (feed trang chủ dùng riêng).

### 5.7b Quyết định của builder (chốt sau khi đối chiếu code thật)

| # | Vấn đề | Quyết định |
|---|---|---|
| D1 | `UserAvatar` chỉ có size `sm/md/lg` (24/36/48) → không render được avatar 128px | `Avatar` của Astryx **đã có** size `'xl'` = 128px (`Avatar.tsx` dòng 129). Chỉ cần **thêm `'xl'`** vào union size của `UserAvatar` — không cần nhận size dạng số. Thêm prop `srcOverride?: string \| null` cho ảnh preview. Thay đổi **bổ sung** → `Header`/`FeedComposer` không đổi hành vi. Tên truyền vào `Avatar` vẫn là `shortDisplayName(...)` → chữ cái fallback khớp header ("S" chứ không phải "KS") |
| D2 | `TabList` hỗ trợ cả pattern navigation (`<nav>` + `aria-current`) lẫn pattern tabs (`role="tablist"` + `aria-selected` + `panelId`) | Dải 4 tab của profile dùng **`role="tablist"` + `panelId`** — đây là 4 panel thật, ngữ nghĩa tabs đúng hơn. Thanh lọc loại bài trong tab "Bài viết" dùng **pattern navigation** (mirror `FeedTabs`). Test bám theo từng pattern: tab profile → `role="tab"` + `aria-selected`; thanh lọc → `data-tab-value` + `aria-current` |
| D3 | `AspectRatio ratio={1080/240}` mâu thuẫn với R3 (mobile 160px); `AspectRatio` đặt child `position:absolute` → nút "Đổi ảnh bìa" không được nằm trong nó | **Không dùng `AspectRatio`**: dùng `div` cao cố định (`240px` desktop, `160px` ở ≤720px) + `<img object-fit: cover>`. Nút "Đổi ảnh bìa" nằm trong wrapper `position:relative`, là sibling của `<img>` |
| D4 | Ảnh khoảnh khắc mới có vào danh sách không | **Có** — thêm vào state session của `ProfileMoments` (mất khi F5). Số vòng tròn tăng, nút ‹ › duyệt được cả ảnh mới. `revokeObjectURL` cho ảnh moment nằm trong `ProfileMoments` (khi bị xoá khỏi list hoặc unmount) |
| D5 | Chưa đăng nhập: hiện tại **không** có link đăng nhập; `isLoading` bị bỏ qua → trang nháy "Vui lòng đăng nhập" khi F5 | Thêm nút **"Đăng nhập"** → `/dang-nhap` (dùng `AppLink`). Chờ `isLoading === false` mới render → không nháy. `AuthContext` đã có `isLoading` sẵn |
| D6 | `FeedPostCard` render `<Avatar name={post.authorName}>` không có `src` → bài của tôi hiện chữ cái, không khớp ảnh ở header | **Mở rộng `FeedPostCard`**: thêm prop tuỳ chọn `authorAvatarSrc?: string \| null`. Mặc định `undefined` → feed trang chủ **không đổi** (A4 vẫn giữ). Tab "Bài viết" truyền `authorAvatarSrc` = avatar hiện tại của user |
| D7 | Nút "Chia sẻ" ở tab "Bài viết" copy link `/?post=<id>` → mở trang chủ không thấy bài (bài nằm ở `DEMO_MY_POSTS`) | Copy `${origin}/tai-khoan?tab=posts` → mở đúng trang profile, đúng tab. Link bài demo chưa có deep-link → chấp nhận mở tab chứ không mở đúng bài |


### 5.8 Component mới & file cần tạo/sửa

| File | Việc |
|---|---|
| `frontend/src/data/demoProfile.ts` | **Mới** — types + dữ liệu demo |
| `frontend/src/pages/AccountPage.tsx` | **Sửa** — thành trang profile đầy đủ |
| `frontend/src/pages/AccountPage.css` | **Sửa** — thêm style profile, giữ style form cũ |
| `frontend/src/pages/AccountPage.test.tsx` | **Mới** — test trang profile |
| `frontend/src/components/profile/ProfileHeader.tsx` | **Mới** — ảnh bìa + avatar + tên + badge + nút |
| `frontend/src/components/profile/ProfileHeader.css` | **Mới** |
| `frontend/src/components/profile/ProfileTabs.tsx` | **Mới** — dải 4 tab |
| `frontend/src/components/profile/ProfilePosts.tsx` | **Mới** — tab bài viết |
| `frontend/src/components/profile/ProfileBookings.tsx` | **Mới** — tab kèo đã đặt |
| `frontend/src/components/profile/ProfileMoments.tsx` | **Mới** — tab khoảnh khắc |
| `frontend/src/components/profile/ProfileSettings.tsx` | **Mới** — tab cài đặt (bê form cũ sang) |
| `frontend/src/components/profile/profile.css` | **Mới** — style dùng chung cho các component profile |
| `frontend/src/components/profile/*.test.tsx` | **Mới** — test từng component |
| `frontend/src/components/UserAvatar.tsx` | **Sửa** — thêm size `'xl'` + `srcOverride` (D1) |
| `frontend/src/components/feed/FeedPostCard.tsx` | **Sửa** — thêm prop `authorAvatarSrc` tuỳ chọn (D6) |

Tái dùng nguyên xi: `FeedPostCard`, `FeedComposerModal`, `UserAvatar`, `OtpInput`,
`feedUtils.filterPosts`, `demoPosts.POST_CATEGORY_LABEL`.

---

## 6. Trạng thái chưa đăng nhập

- `AuthContext` có `isLoading` → chờ `isLoading === false` mới render, tránh **nháy**
  "Vui lòng đăng nhập" khi F5 (lúc đó `user` còn `null` trong lúc gọi `/me`).
- Sau khi load xong mà không có `user` → card "Vui lòng đăng nhập để xem trang cá nhân"
  + nút **"Đăng nhập"** → `/dang-nhap` (dùng `AppLink`).
- Không render profile rỗng.

---

## 7. Rủi ro & cách xử lý

| # | Rủi ro | Xử lý |
|---|---|---|
| R1 | `FeedPostCard` cố định `post.authorName` → bài của tôi tên sai | Tạo bản sao data với `authorName` = tên user khi map, không sửa `FeedPostCard` |
| R2 | `URL.createObjectURL` rò rỉ memory | `URL.revokeObjectURL` khi ảnh bị thay thế / unmount. State ảnh preview nâng lên `AccountPage` (không nằm trong component con) → một nơi duy nhất để revoke |
| R3 | Ảnh bìn đè lên avatar → vỡ layout ở mobile | Dùng `div` cao cố định (240px / 160px ở ≤720px), avatar 128px → 96px, `margin-top` tương ứng -64px → -48px. Test responsive ở 375px |
| R4 | `TabList` Astryx không có `role="tab"` → test sai | Dải tab profile dùng `role="tablist"` → `role="tab"` + `aria-selected`; thanh lọc bài dùng pattern nav → `data-tab-value` + `aria-current` (như `FeedTabs.test.tsx`) |
| R5 | `Card` của Astryx áp padding bằng StyleX → padding bị mất | Đặt padding ở wrapper div (như `account__body` cũ) |
| R6 | Form cũ rất dài, chuyển sang tab làm trang quá dài | Cột trái cố định thông tin, cột phải form → giảm chiều cao |

---

## 8. Tiêu chí nghiệm thu

- [ ] `/tai-khoan` hiện ảnh bìa, avatar 128px đè góc, tên đầy đủ, username, badge vai trò.
- [ ] Có 4 tab: Bài viết · Kèo đã đặt · Khoảnh khắc · Cài đặt (role="tab", aria-selected đúng).
- [ ] Tab Bài viết: dùng `FeedPostCard` (có avatar thật của user), lọc theo loại, đăng bài mới được.
- [ ] Tab Kèo đã đặt: 3 loại badge khác màu, có kèo sắp tới & đã hoàn thành.
- [ ] Tab Khoảnh khắc: vòng tròn story, bấm mở ảnh lớn, có nút trước/sau, thêm khoảnh khắc mới vào list.
- [ ] Tab Cài đặt: đổi email/SĐT + OTP vẫn hoạt động như cũ (không hồi quy).
- [ ] Chọn ảnh đại diện / ảnh bìa → xem trước tại chỗ ngay (ở cả header lẫn tab Cài đặt).
- [ ] `?tab=` giữ được sau F5.
- [ ] Chưa đăng nhập → hiện nút "Đăng nhập"; không nháy trạng thái chưa đăng nhập khi F5.
- [ ] `tsc --noEmit` sạch, `npm run build` pass, test frontend pass.
- [ ] Responsive ở 375px không tràn ngang.
- [ ] README cập nhật hạng mục mới.

---

## 9. Ngoài phạm vi (giai đoạn sau)

- Backend thật: bảng `posts` / `bookings` / `moments`, endpoint `/api/users/me/*`.
- Upload avatar + ảnh bìa thật (S3 / local storage).
- Trang cá nhân người khác `/nguoi-dung/:username`.
- Bình luận, theo dõi, chỉnh sửa/xoá bài của chính mình.
- Trình độ cầu lông lưu thật trong hồ sơ (hiện là dữ liệu demo).

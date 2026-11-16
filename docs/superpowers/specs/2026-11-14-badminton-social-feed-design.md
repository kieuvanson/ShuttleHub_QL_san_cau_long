# Design — Trang chủ dạng mạng xã hội cộng đồng cầu lông

- **Ngày:** 2026-11-14
- **Người duyệt:** Chủ dự án
- **Trạng thái:** Chờ duyệt (đã qua builder check + 3 quyết định của chủ dự án)
- **Phạm vi:** Frontend (`frontend/`), giai đoạn 1 — UI + dữ liệu demo

---

## 1. Ý tưởng và lý do

Trang chủ hiện tại (`frontend/src/pages/Home.tsx`) là landing page tĩnh: Hero → Sân nổi bật → Bảng giá → Thành phố → FAQ. Nó giới thiệu dịch vụ nhưng **không có nơi để người dùng nói chuyện với nhau**.

Yêu cầu từ chủ dự án: biến trang chủ thành một trang cộng đồng theo tinh thần Facebook, nơi người dùng có thể:

1. **Xét kèo** — đăng bài khoe kết quả đánh, rủ đối thủ đánh thử.
2. **Tuyển người đánh** — đăng bài tìm người đánh cùng.
3. **Cảm nghĩ** — đăng status, suy nghĩ cá nhân về cầu lông.

Ràng buộc do chủ dự án nêu rõ: *"gần giống Facebook nhưng không được giống hết, phải mang phong cách riêng"*, và *"màu sắc giống Facebook cũng được, nhưng phải dễ nhìn và dễ dùng để người dùng tương tác"*.

**Lý do thiết kế:** mạng xã hội có giá trị khi người dùng thấy người khác đang hoạt động. Một trang chủ toàn marketing khiến sản phẩm trông như một dịch vụ đặt sân, không phải nơi dành cho cộng đồng. Vì vậy trang chủ cần **nội dung do người dùng tạo ra** làm chủ đạo, còn các mục tìm sân chuyển sang sidebar để vẫn phục vụ nhu cầu đặt sân.

---

## 2. Mục tiêu / không mục tiêu / chống mục tiêu

### Mục tiêu (giai đoạn 1)

- Giao diện feed 2 cột: cột feed 700px + sidebar phải 320px.
- 4 loại bài viết với nhãn màu riêng: Xét kèo · Tuyển người đánh · Cảm nghĩ · Sân cầu lông.
- Tương tác cơ bản chạy được ở client: like toggle, lọc theo loại, đăng bài mới (state cục bộ), chia sẻ (copy link), stories.
- Header dùng lại **đúng logo và wordmark** của app hiện tại.
- Icon lấy từ **lucide-react** — thư viện đã cài sẵn trong `package.json`, đang dùng ở `AccountPage.tsx`, `OAuthCallbackPage.tsx`.
- Responsive: 2 cột → 1 cột ở 1100px; mobile ở 600px.

### Không mục tiêu (giai đoạn 1)

- Backend, DB, migration, API thật cho feed.
- Bình luận, trả lời bình luận, thông báo, kết bạn.
- Upload ảnh/video thật (chỉ hiển thị ảnh từ `/img` có sẵn).
- Phân quyền, chặn/xóa bài, báo cáo vi phạm.
- Chat nhắn tin.

### Chống mục tiêu (nếu xảy ra là thất bại)

- Trông y hệt Facebook đến mức người dùng tưởng đang ở mạng xã hội khác — mất tính đặc trưng "Cầu Lông dee".
- Feed nhiều màu sắc rối mắt, hoặc dùng emoji làm icon chính.
- Bố cục dày đặc, không có khoảng thở, khó quét bằng mắt.

---

## 3. Ràng buộc

| Ràng buộc | Nguồn | Ảnh hưởng thiết kế |
|---|---|---|
| Icon từ thư viện React | Chủ dự án yêu cầu | `lucide-react` — không thêm dependency mới |
| Logo giống các trang khác | Chủ dự án yêu cầu | Tái dùng `logo_page.svg` + wordmark Bricolage trong `Header.tsx` |
| Màu giống Facebook được | Chủ dự án cho phép | Xanh `#1877F2`, nền `#F0F2F5`, card trắng |
| Bố cục phải khác Facebook | Chủ dự án yêu cầu | 2 cột lệch (không rail trái), nhãn bài tiếng Việt có màu riêng |
| Convention frontend | `.cursor/rules/frontend-conventions.mdc` | TS không `any`, CSS cùng file component, màu từ tokens, gọi API qua `api/client.ts` |
| Không `any` | Convention | Mọi payload bài viết có type riêng |

---

## 4. Các hướng đã cân nhắc

Trong lúc trao đổi, 3 hướng bố cục được đưa ra để chọn:

### Hướng A — Feed 2 cột lệch (ĐÃ CHỌN)

Feed ở cột giữa (max 700px), sidebar phải 320px. **Không có rail điều hướng trái** như Facebook.

- **Trade-off:** sidebar phải tự giữ vai trò "điều hướng" bằng widget tìm sân + danh sách người đang tuyển; người dùng quen Facebook có thể thấy thiếu thanh trái.
- **Chọn vì:** bỏ rail trái giúp phần feed rộng rãi, dễ đọc dài; phần "đặt sân" vẫn được phục vụ ở sidebar nên không mất chức năng.

### Hướng B — 3 cột giống hệt Facebook

Rail trái (nav) + feed + sidebar phải.

- **Trade-off:** quen thuộc nhất, nhưng bị "giống hết" — trái yêu cầu phong cách riêng; lại chiếm 240px ngang cho nav trong khi app chỉ có vài trang.
- **Không chọn vì:** vi phạm ràng buộc "không giống hết".

### Hướng C — 1 cột feed tối giản, sidebar đẩy xuống dưới

- **Trade-off:** đơn giản, dễ đọc trên mobile; nhưng mất khả năng "đặt sân ngay" và mất không gian cho widget cộng đồng — mất đúng cái "dễ tương tác" mà chủ dự án yêu cầu.
- **Không chọn vì:** sidebar là nơi gom giá trị sản phẩm (tìm sân, người đang tuyển).

### Quyết định phụ đã chốt

- **Logo:** dùng `logo_page.svg` + wordmark gradient cam, y hệt `Header.tsx` (cao 52px, header cao 76px).
- **Icon:** `lucide-react`. Lucide **không có** icon cầu lông/vợt — nên dùng icon gần nghĩa: `Zap` (xét kèo), `UserPlus` (tuyển người), `Feather` (cảm nghĩ), `MapPin` (sân), `Trophy` (đánh đôi), `Heart`, `MessageCircle`, `Share2`, `Calendar`, `Search`, `House`, `Users`, `Bell`, `Ellipsis`, `Image`, `Plus`, `Star`, `Clock`, `BadgeCheck`.
- **Dữ liệu:** `DEMO_POSTS` trong `frontend/src/data/demoPosts.ts`, đánh dấu "DEMO" rõ ràng giống `demoCourts.ts`.

---

## 5. Thiết kế chi tiết

### 5.1 Bố cục

```
┌──────────────────────────────────────────────────────────────┐
│ Header (logo app thật · search · house/users/bell · avatar)  │  sticky
├───────────────────────────────────────┬──────────────────────┤
│  Stories strip                        │  Tìm sân nhanh       │
│  ┌─────────────────────────────────┐  │  ├ Hôm nay          │
│  │ Composer: avatar + input giả    │  │  ├ Đánh đôi tối nay │
│  │ Ảnh/Video · Xét kèo · Tuyển     │  │  └ Sân yêu thích    │
│  └─────────────────────────────────┘  │                      │
│  Tabs: Tất cả · Tuyển · Xét kèo · Cảm nghĩ│ Đang tuyển người  │
│  ┌─────────────────────────────────┐  │  (4 người)          │
│  │ Post card                       │  │                      │
│  │  avatar · tên · time · ⋯        │  │  Bạn có thể quen    │
│  │  [nhãn loại bài]                │  │  (3 người)          │
│  │  nội dung · ảnh (tuỳ chọn)      │  │                      │
│  │  24 thích · 7 bình luận · 3 share│ │  Footer links        │
│  │  ─────────────────────────────  │  │                      │
│  │  ♥ Thích · 💬 Bình luận · ↗ Chia sẻ│                     │
│  └─────────────────────────────────┘  │                      │
└───────────────────────────────────────┴──────────────────────┘
   max 700px                          320px
```

- Tổng shell: `max-width: 1280px`, lưới `minmax(0,1fr) 320px`, gap 24px.
- Feed: `max-width: 700px`, căn giữa trong cột.
- Sidebar: `position: sticky; top: 84px` (dưới header 76px + 8px).
- ≤1100px: 1 cột, feed 680px, sidebar xuống dưới và cũng giới hạn 680px.
- ≤600px: card bo góc 0, full-bleed, tab nhỏ lại, search header ẩn.

### 5.2 Màu & token

Feed dùng bảng màu Facebook (quen tay) nhưng **không hardcode rải rác** — khai báo ở đầu file CSS component rồi tham chiếu:

| Biến | Giá trị | Dùng cho |
|---|---|---|
| `--fb-blue` | `#1877F2` | tab active, nút chính, like badge |
| `--fb-blue-hover` | `#166FE5` | hover nút |
| `--bg` | `#F0F2F5` | nền trang |
| `--card` | `#FFFFFF` | nền card |
| `--ink-0 / --ink-1 / --ink-2` | `#050505` / `#65676B` / `#8A8D91` | chữ |
| `--line` | `#E4E6EB` | đường kẻ |
| `--r-card` | `12px` | bo góc card (Facebook dùng 8px — mềm hơn) |
| `--r-ctl` | `8px` | bo góc control |
| `--r-pill` | `999px` | input tròn, nhãn bài |

Nhãn loại bài (4 màu riêng — điểm khác biệt so với Facebook):

| Loại | Nền | Chữ | Icon |
|---|---|---|---|
| Tuyển người đánh | `#E7F6EC` | `#1A7F37` | `UserPlus` |
| Xét kèo | `#FFF1E6` | `#C2410C` | `Zap` |
| Cảm nghĩ | `#EEF1F6` | `#475467` | `Feather` |
| Sân cầu lông | `#E8F0FE` | `#1550B3` | `MapPin` |

Lưu ý: token theme của app (`src/styles/tokens.css`) dùng emerald/teal/cam. Feed Facebook-blue là **cục bộ theo component**, không đụng theme chung — nên vẫn đạt "màu giống Facebook" mà không phá hệ màu hiện có. Trang chủ mới vì vậy có thể coi như một "surface" riêng.

### 5.3 Header

Header của feed **dùng lại đúng `Header.tsx` hiện có** (nằm trong `Layout.tsx`) — không tạo header riêng cho trang chủ. Lý do: `Layout` bọc mọi route, `Header.tsx` đang có logo + wordmark Bricolage gradient cam + nav `Tìm sân cầu lông` / `Bảng giá` / `Hỗ trợ` + menu user — đúng như mockup và đúng như yêu cầu *"logo giống các trang khác"*.

Trong mockup, header được vẽ lại để mô phỏng nhanh, nhưng khi code thật sẽ **dùng `Header.tsx` sẵn có**, không sửa file này ở giai đoạn 1. Hệ quả:

- Ô search trong header mockup **không tồn tại** ở bản thật → tìm kiếm trong feed nằm ở sidebar ("Tìm sân nhanh") và trong `SearchBar` của `Hero` (nếu giữ landing section).
- Icon `House / Users / Bell` trong mockup là minh hoạ → **không** thêm vào header thật ở giai đoạn 1 (chưa có route tương ứng).
- Link `/#bang-gia` và `/#faq` trong `Header.tsx` + `Footer.tsx` phải **còn đúng** → ảnh hưởng quyết định ở §8 câu 1.

Logo trong `Header.tsx`: `<img src="/logo_page.svg">` cao 52px, `width: auto` (viewBox 680×400 → tỷ lệ 1.7:1), wordmark gradient cam `--font-brand`.

### 5.4 Cấu trúc component

Dự án đã cài **Astryx** (`@astryxdesign/core` v0.7.13) và có theme riêng `src/themes/caulongdee/`. Code hiện tại dùng **mô hình lai**: component Astryx (`Grid`, `VStack`, `Badge`, `Button`, `Text`) làm khung + file `.css` riêng cho style đặc thù. Feed sẽ đi theo đúng mô hình đó.

```
frontend/src/
├── data/
│   └── demoPosts.ts              # DEMO_POSTS + types
├── components/
│   └── feed/
│       ├── FeedStories.tsx       # + .css
│       ├── FeedComposer.tsx      # + .css
│       ├── FeedTabs.tsx          # + .css
│       ├── FeedPostCard.tsx      # + .css
│       ├── FeedSidebar.tsx       # + .css
│       ├── FeedComposerModal.tsx # + .css
│       └── feed.css              # token + class dùng chung các component feed
└── pages/
    └── Home.tsx                  # thay nội dung landing bằng feed
```

**Quyết định của tôi — dùng Astryx cho phần khung, CSS cho phần Facebook:**

| Phần | Dùng gì |
|---|---|
| Card bài viết, card sidebar | `Card` của Astryx (`@astryxdesign/core/Card`) |
| Avatar tác giả, người trong sidebar | `Avatar` của Astryx (tự hiện initials khi không có ảnh) |
| Tabs lọc | `TabList` + `Tab` của Astryx |
| Modal đăng bài | `Dialog` của Astryx |
| Toast (chia sẻ / tính năng chưa làm) | `Toast` + `useToast` của Astryx |
| Nút | `Button` / `IconButton` của Astryx |
| Grid 2 cột, stack trong card | `Grid` / `VStack` / `HStack` của Astryx |
| Màu, bo góc, khoảng cách, typography | **token của theme** — không hardcode trong CSS |
| Layout riêng của feed (2 cột lệch, sticky sidebar, khung stories) | `feed.css` — dùng `var(--token)` |

**Về quy tắc "No `<div>`" của Astryx:** quy tắc đó áp dụng cho code *sinh từ template Astryx*. Code hiện có của dự án vẫn dùng `<div className="hero__inner">` để làm khung trong `Hero.tsx`, `FeaturedCourts.tsx`… — tức là thực tế đang theo mô hình lai. Feed sẽ theo mô hình lai: **khung = component Astryx, chi tiết bố cục = CSS file riêng.**

**Về màu Facebook:** theo quy tắc Astryx ("Palettes and custom colors go through the theme, never `:root` overrides"), bảng màu Facebook sẽ được khai báo trong `src/themes/caulongdee/caulongdeeTheme.ts` dưới `localTokens` (giống `--cl-teal` sẵn có), rồi **sinh lại** theme bằng `npm run astryx -- theme build src/themes/caulongdee/caulongdeeTheme.ts`. Các component chỉ tham chiếu `var(--fb-blue)` — không có hex rải rác trong CSS.

Token sẽ thêm vào theme:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--fb-blue` | `#1877F2` | tab active, nút chính, badge like |
| `--fb-blue-hover` | `#166FE5` | hover |
| `--fb-blue-soft` | `#E8F0FE` | nền nhãn "Sân cầu lông" |
| `--fb-green` / `--fb-green-soft` | `#1A7F37` / `#E7F6EC` | nhãn "Tuyển người đánh" |
| `--fb-orange` / `--fb-orange-soft` | `#C2410C` / `#FFF1E6` | nhãn "Xét kèo" |
| `--fb-slate` / `--fb-slate-soft` | `#475467` / `#EEF1F6` | nhãn "Cảm nghĩ" |
| `--fb-bg` | `#F0F2F5` | nền trang feed |
| `--fb-line` | `#E4E6EB` | đường kẻ |

Lưu ý: token theme chung của app vẫn là emerald/teal/cam — bảng màu Facebook chỉ dùng **cục bộ cho feed**, không phá hệ màu hiện có.

### 5.5 Kiểu dữ liệu

```ts
export type PostCategory = 'challenge' | 'recruit' | 'thought' | 'court';

export type FeedPost = {
  id: string;
  authorName: string;
  authorInitials: string;
  createdAtLabel: string;     // "2 giờ", "Hôm qua"
  category: PostCategory;
  content: string;
  image?: string;
  imageAlt?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
};

export type FeedPlayer = {
  id: string;
  name: string;
  gender: 'Nam' | 'Nữ';
  time: string;
  area: string;
};

export type FeedStory = {
  id: string;
  name: string;
  image: string;
  isAdd?: boolean;
};
```

Không `any`. Tất cả payload có type. Bỏ `authorAvatar` khỏi type vì dự án **chưa có ảnh người** — `public/img/` chỉ có 9 ảnh (4 sân + 5 thành phố). Avatar dùng initials của `Avatar` Astryx; ảnh bài viết và stories tái dùng ảnh sân/thành phố sẵn có.

### 5.6 Dữ liệu demo

- **8 bài** trong `DEMO_POSTS`, sắp xếp **mới nhất trước**, trộn đều 4 loại.
- Đánh dấu "DEMO" **chỉ bằng comment ở đầu file** — đúng cách `demoCourts.ts` đang làm, không dán badge "DEMO" lên từng bài (badge sẽ phá vỡ giao diện kiểu Facebook).
- Bài người dùng tự đăng thêm vào **đầu feed** → khớp quy tắc "mới nhất trước".

### 5.7 Tương tác (giai đoạn 1)

| Tương tác | Hành vi | Trạng thái |
|---|---|---|
| Like | Toggle, đổi màu icon xanh, ±1 like count | `useState<Set<string>>` trong `Home` |
| Tab lọc | Lọc `DEMO_POSTS` theo `category` | `useState<PostCategory \| 'all'>` |
| Đăng bài | Modal chọn loại + nhập nội dung → thêm vào đầu feed | `useState<FeedPost[]>` |
| Chia sẻ | Copy link vào clipboard + toast | `navigator.clipboard` + `useToast` |
- **Stories:** dải **khoảnh khắc** — mỗi story là một ảnh của người chơi (tái dùng ảnh sân/thành phố sẵn có ở giai đoạn 1) kèm tên. Story đầu tiên là ô "Thêm khoảnh khắc" (nút `Plus`). Click story → hiện overlay mô phỏng xem ảnh to.
| Sidebar "Tìm sân nhanh" | Link tới `/tim-san` | `AppLink` của dự án |

**Quyết định của tôi cho các chi tiết còn mơ hồ:**

- **Chia sẻ copy link nào:** giai đoạn 1 chưa có trang chi tiết bài → copy link `/?post={id}` (deep-link). Trang đọc `post` param và scroll tới bài tương ứng; nếu bài không có trong danh sách thì bỏ qua và hiện feed bình thường.
- **Nút chưa làm (Bình luận, Ảnh/Video, menu `⋯`):** bấm sẽ hiện toast "Tính năng này sẽ có ở giai đoạn sau" — không bấm im lặng (người dùng tưởng lỗi), không `disabled` (không rõ vì sao).
- **Ô tìm kiếm trong sidebar:** mang tính trang trí — bấm "Tìm sân nhanh" sẽ điều hướng `/tim-san`. Không mở rộng `/tim-san` để đọc query param (ngoài phạm vi feed).
- **Tab lọc:** có **4 tab** như mockup (Tất cả · Tuyển người đánh · Xét kèo · Cảm nghĩ). Bài loại "Sân cầu lông" vẫn hiện ở tab "Tất cả" và có nhãn màu riêng để tự nhận diện; không thêm tab thứ 5 vì sẽ làm tràn ngang trên mobile.
- **Modal đăng bài:** chọn 1 trong 4 loại → textarea (max 500 ký tự, có bộ đếm) → nút "Đăng bài" (disabled khi nội dung trắng). Ảnh chưa upload ở giai đoạn 1.
- **Khách chưa đăng nhập:** xem feed bình thường. Bấm composer hoặc nút "Đăng bài" → **toast "Hãy đăng nhập để đăng bài" kèm nút dẫn tới `/dang-nhp`** (chủ dự án đã chốt). Không tự chuyển hướng (đột ngột).

### 5.8 Bố cục trang chủ sau khi gộp

Trang chủ mới = feed (2 cột) **ở trên**, rồi tới các section landing cũ ở dưới (chủ dự án đã chốt giữ lại):

```
┌─────────────────────────────────────────────┐
│ Header (Layout hiện có — không sửa)          │
├─────────────────────────────────────────────┤
│  FEED (2 cột: 700px + 320px)                │
│   stories · composer · tabs · post cards    │
├─────────────────────────────────────────────┤
│  Hero                                        │  ← giữ nguyên, id/anchor giữ nguyên
│  FeaturedCourts                              │
│  PricingSection   (#bang-gia)                │
│  CitiesSection                                │
│  FaqSection       (#faq)                     │
├─────────────────────────────────────────────┤
│  Footer (Footer.tsx hiện có)                 │
└─────────────────────────────────────────────┘
```

`Home.tsx` chỉ cần thêm phần feed ở trên, giữ nguyên các import cũ. `Home.css` không đổi. Không đụng `Header.tsx` / `Footer.tsx` / `main.tsx`.

### 5.9 Khả năng tiếp cận

- Icon có `aria-hidden="true"`; nút có `aria-label` bằng tiếng Việt.
- Tab dùng `role="tablist"` / `aria-selected`.
- Modal: `role="dialog"`, `aria-modal`, đóng bằng `Esc`, focus vào textarea khi mở.
- Tap target ≥ 40px trên mobile.
- Focus ring dùng `--brand-2` sẵn có.

---

## 6. Ngoài phạm vi giai đoạn 1 → giai đoạn 2

Bảng lộ trình để 2 giai đoạn sau (chưa làm):

| Giai đoạn 2 | Giai đoạn 3 |
|---|---|
| Backend entity `Post`, `PostLike`, `PostComment` + migration Flyway | Upload ảnh/video thật (lưu object storage) |
| API `GET/POST /api/posts`, `POST /api/posts/{id}/like` | Thông báo realtime (WebSocket) |
| API bình luận + trả lời | Kết bạn / gợi ý bạn chơi từ dữ liệu thật |
| Đăng nhập bắt buộc khi đăng bài | Báo cáo vi phạm / chặn người dùng |
| Phân trang / lazy-load feed | Trang chi tiết bài + hashtag |

---

## 7. Cách verify

Frontend:
```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit   # không lỗi type
npm run build                      # build thành công
```

Kiểm tra tay trên trình duyệt:
- Feed render đúng 2 cột ở 1440px, 1 cột ở 1000px, mobile ở 420px.
- Click like đổi trạng thái + số đếm.
- Click từng tab lọc đúng loại bài.
- Đăng bài mới → xuất hiện đầu feed, tab "Tất cả" hiển thị nó.
- Chia sẻ → toast "Đã sao chép liên kết".
- Console không có lỗi/hydration warning.

Sau khi verify thật → cập nhật `README.md` mục "📈 Tiến trình dự án" (giai đoạn 3 — Tìm & đặt sân, hạng mục "Trang chủ dạng feed cộng đồng") và mục "🌐 API Endpoints" nếu có thay đổi endpoint (giai đoạn 1 không thêm endpoint).

---

## 8. Những gì còn để ngỏ

Builder check đã rà lại tài liệu và đặt 11 câu hỏi. 8 câu đã được tôi tự quyết (có ghi rõ ở §5.2, §5.4, §5.6, §5.7). 3 câu còn lại **chủ dự án đã quyết** (2026-11-14):

| # | Câu hỏi | Quyết định của chủ dự án |
|---|---|---|
| 1 | Giữ các section landing cũ (Hero / Bảng giá / Thành phố / FAQ) ở dưới feed, hay bỏ hẳn? | **Giữ ở dưới feed** — không sửa `Header.tsx` / `Footer.tsx`, link `/#bang-gia` và `/#faq` vẫn đúng |
| 2 | Stories là "khoảnh khắc" (ảnh) hay "bài nổi bật" (tuyển/xét kèo)? | **Khoảnh khắc** — dải ảnh từ người chơi, quen thuộc với người dùng Facebook |
| 3 | Đăng bài khi chưa đăng nhập: chuyển hướng `/dang-nhp`, hay hiện toast kèm nút? | **Toast kèm nút** — không tự chuyển hướng (đột ngột) |

Các quyết định còn lại (màu chính xác, khoảng cách, icon cụ thể, dùng Astryx hay CSS thuần, số bài demo) là **quyết định của tôi** và đã thể hiện trong mockup + §5 để chủ dự án sửa nếu không thích.

---

## 9. Tài liệu liên quan

- Mockup tĩnh: `frontend/public/mockup-feed.html`
- Script chụp ảnh: `frontend/scripts/shot-static.mjs`
- Ảnh chụp desktop: `frontend/mockup-v2-desktop.png`
- Ảnh chụp mobile: `frontend/mockup-v2-mobile.png`

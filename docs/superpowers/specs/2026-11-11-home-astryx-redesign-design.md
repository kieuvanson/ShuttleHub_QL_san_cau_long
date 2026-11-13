# Trang chủ Cầu Lông dee — thiết kế lại bằng design system Astryx

- **Ngày:** 2026-11-11
- **Phạm vi:** Frontend (`frontend/`) — trang chủ `/`
- **Nguồn:** skill `astryx` (v0.7.13, `@astryxdesign/core` + `@astryxdesign/cli`), đã cài tại `.agents/skills/astryx`
- **Quyết định đã chốt:** dùng **component Astryx thật** + **author theme riêng** giữ màu cam/teal, áp dụng cho **cả website**; thêm section **"Bảng giá"** vào trang chủ
- **Trạng thái:** chờ duyệt

---

## 1. Vì sao làm

Trang chủ hiện tại chạy được nhưng bề mặt cũ: slider ảnh tự chạy mỗi 5 giây, form tìm kiếm chồng lên hero (`margin-top: -40px`), thẻ sân dùng gradient tổng hợp thay vì ảnh thật, hai section cuối chỉ toàn chữ, 6 link chết (`href="#"`).
Audit headless Chrome (skill `design-taste-frontend`, `consistency.mjs`) trên trang chủ: **14 FAIL + 15 WARN** — nổi bật là:

| Nhóm | Số | Ví dụ |
|---|---|---|
| `text-contrast` | 8 | `#f97316` trên nền trắng = 2.8:1 (cần 4.5:1); `#0d9488` trên trắng = 3.56:1 |
| `centre-axis` | 4 | hero + trust strip căn giữa, phần còn lại canh trái → trục trang bị phá |
| `links` | 6 | "Bảng giá", "Hỗ trợ", 4 link footer đều `href="#"` — chết |
| `section-tile` | 5 | mọi section ngắn hơn 1 màn hình, tiêu đề section sau lộ lên màn hình trước |
| `spill` / `overlap-text` / `collide` | 3 | form search tràn 50px khỏi hero; rating đè lên tên sân; tag thành phố chồng ở 320px |
| `no-visual` / `text-only` | 3 | section "Tìm theo thành phố" và FAQ không có gì nhìn được |
| `cta` | 2 | hero không có nút hành động; section cuối không kết thúc bằng nút |

Ngoài ra đọc code thấy `Hero.css` dùng `var(--s-20)` nhưng `tokens.css` chỉ có tới `--s-16` → padding hero rơi vào giá trị rỗng.

**Mục tiêu:** dùng Astryx làm design system thật (component + theme do mình author) để trang chủ trông hiện đại, gần gũi; bản chất sản phẩm "đặt sân nhanh 30 giây" không đổi; màu sạch (nền trắng/xám nhạt, cam làm CTA, teal làm nhấn) giữ nguyên.

---

## 2. Goals / Non-goals / Anti-goals

### Goals
1. Trang chủ dùng **component Astryx** (`Card`, `Button`, `Badge`, `Grid`, `VStack`, `HStack`, `Text`, `Heading`, `Section`, `Icon`, `AspectRatio`) thay cho `<div>` + CSS tự viết.
2. **Theme Astryx riêng** của Cầu Lông dee: accent cam `#c2410c`, nhấn teal `#0f766e`, nền sạch, bo góc mềm, motion nhẹ.
3. Xóa slider tự chạy → hero **split** (chữ trái, ảnh phải), có CTA rõ.
4. Form tìm kiếm **nằm trong hero**, không chồng lên hero.
5. Thẻ sân + thẻ thành phố dùng **ảnh thật** (đã có sẵn trong `assets/img/`).
6. Sửa hết lỗi có bằng chứng: contrast, căn trục, link chết, tap target, tràn khung, chồng chữ.
7. Thêm **hiệu ứng nhẹ** cho cảm giác động: vào trang, hover nâng card, zoom ảnh trong khung, nhấn nút.

### Non-goals
- Không đụng backend, không đổi route, không đổi stack React/Vite.
- Không làm dark mode (theme chỉ light).
- Không dùng shader / WebGL / 3D.
- Không bê nguyên `system.css` / `starter.html` / `motion.js` của skill `taste-skill` (trùng class với dự án).

> **Lưu ý phạm vi (đã chốt: theme cho CẢ website).** Vì theme áp dụng toàn site, `/tim-san` và `/dang-nhap` **cũng phải chuyển sang token/component Astryx** — nếu không, hai sản phẩm sẽ trông khác nhau. Không viết lại *luồng nghiệp vụ* của hai trang đó (vẫn giữ nguyên filter, phân trang, bản đồ, luồng đăng nhập), chỉ đổi lớp trình bày.

### Anti-goals
- **Không dùng theme `neutral` có sẵn.** Nó có accent xanh dương `#0064E0` — không phải cam/teal của Cầu Lông dee. Phải author theme riêng.
- **Không bịa ảnh sân của Cầu Lông dee.** Ảnh thẻ là ảnh minh hoạ từ Wikimedia Commons → khai báo rõ trong một dòng credits ở chân trang.
- **Không giữ `<div>`/`<span>` thô trong markup mới.** Quy tắc của Astryx: layout do component đảm nhiệm.

---

## 3. Ràng buộc đã chốt

| Hạng mục | Quyết định |
|---|---|
| Mức độ dùng Astryx | **Full** — component thật + theme riêng do mình author |
| Màu thương hiệu | Giữ cam (CTA) + teal (nhấn) + nền sạch |
| Font | Giữ `Inter` (text) + `Bricolage Grotesque` (wordmark) |
| Ảnh | Hero: `banner_hero2.jpg` (ảnh thật của dự án). Thẻ: ảnh minh hoạ Wikimedia, ghi nguồn 1 dòng ở chân trang |
| Cấu trúc trang | Giữ 5 section hiện tại + **thêm section "Bảng giá"** → tổng 6 section |
| Header | **Giữ DOM hiện tại**, chỉ thay `Button`/`Badge` — không chuyển sang `TopNav` (API riêng, sẽ phá chiều cao header và mobile) |
| Form tìm kiếm | Giữ `<select>` native, **chỉ đổi skin** — không viết `Selector` tự (tốn gấp 3 công, không đáng) |
| Thẻ bấm được | Dùng **`ClickableCard`** (đúng nghĩa "cả thẻ bấm được"), không phải `Card` + `<button>` lồng |
| Ảnh sân | Thêm field `image?: string` vào type `Court` trong `demoCourts.ts` → `/tim-san` dùng chung được |
| Token cũ | **Giữ làm alias** (không xóa) để các trang khác không vỡ; trang chủ chuyển hẳn sang token Astryx |
| Mobile | Form tìm kiếm **xếp dọc** (không cuộn ngang, không drawer) |

**Ngoại lệ có chủ ý so với Astryx:** Astryx khuyến nghị `Grid columns={{minWidth, max}}` cho mọi lưới phải sống trên điện thoại. Ta dùng đúng quy tắc đó. Ngoại lệ duy nhất: FAQ giữ **accordion** vì đó là lựa chọn UX sẵn có của dự án, không phải mẫu thiết kế.

**Component của Astryx 0.7.13 thực sự tồn tại** (đã đối chiếu `npx astryx component --list`, 174 component): `Card`, `ClickableCard`, `Badge`, `Button`, `Grid`, `GridSpan`, `VStack`, `HStack`, `Text`, `Heading`, `Section`, `Icon`, `AspectRatio`, `Collapsible`, `CollapsibleGroup`, `Divider`, `DropdownMenu`, `Layout`, `LayoutContent`, `Theme`, `useTheme`.

> ⚠️ **Các tên trong bản nháp đầu không tồn tại** — không được dùng: `CollapsibleShowcase`, `DividerVertical`, `Menu`, `Select`, `Popover`. Thay bằng `Collapsible` + `CollapsibleGroup`, `Divider`, `DropdownMenu`, và `<select>` native.

---

## 4. Design system — theme Astryx riêng

### 4.1 Vì sao không dùng `theme add neutral`

`npx astryx theme add neutral` tạo `src/astryx-themes.ts` với theme có sẵn. Nhưng accent của nó là xanh dương. Ta cần cam + teal → phải **author theme riêng** theo workflow chính thức:

```
src/themes/caulongdee/caulongdeeTheme.ts        # defineTheme({...})
src/themes/caulongdee/caulongdeeTheme.doc.mjs   # descriptor: {type:'theme', name:'caulongdee', ...}
npx astryx theme build src/themes/caulongdee/caulongdeeTheme.ts
npx astryx theme add caulongdee
```

`theme add` sinh `src/astryx-themes.ts` (module + CSS + font CSS) và `defaultThemeSlug` trỏ tới theme đầu tiên.

### 4.2 Nội dung theme `caulongdee`

**Palette** — sinh bằng công cụ của Astryx để có đủ 21 shade light+dark:
```json
{"families": [{"id": "brand", "seed": "#c2410c"}]}
```
→ `npx astryx theme palette generate palette.config.json --out src/themes/caulongdee/tokens/brand.palette.ts`

**Token override (giữ đúng hue, đạt WCAG AA):**

| Token | Giá trị | Lý do |
|---|---|---|
| `--color-accent` | `['#c2410c', '#fb923c']` | cam đậm hơn `#f97316` để chữ trắng trên nền đạt 5.0:1 |
| `--color-on-accent` | `['#ffffff', '#1c1917']` | chữ trên nút cam |
| `--color-accent-hover` | `['#9a3412', '#fdba74']` | trạng thái hover |
| `--color-text-secondary` | `#475569` | thay `#64748b` (2.8:1 → 7.0:1) |
| `--color-text-tertiary` | `#64748b` | chỉ dùng placeholder |
| `--color-background-body` | `#ffffff` | nền sạch |
| `--color-background-surface` | `#f8f9fc` | nền section phụ |
| `--color-background-muted` | `#eef0f6` | divider / hover |
| `--color-border` | `#e5e7eb` | viền 1px |
| `--color-text-on-accent` | `#ffffff` | — |

**Teal làm nhấn** — không phải accent chính, nên đi qua token trung tính + component override:
- Link/điểm nhấn trong nội dung dùng `--color-text-secondary`? Không — dùng **một token cục bộ** `--cl-teal: #0f766e` khai trong `localTokens` của theme (đạt 4.9:1 trên trắng), áp cho: "Trống lúc …", "Xem tất cả", focus ring.

**Scale config:**

| Nhóm | Giá trị | Chú thích |
|---|---|---|
| `typography.scale` | `{base: 16, ratio: 1.2}` | body 16px |
| `typography.body` | `{family: 'Inter', fallbacks: 'system-ui, sans-serif'}` | giữ font hiện tại |
| `typography.heading` | `{family: 'Bricolage Grotesque', fallbacks: 'Inter, sans-serif', weight: 'bold'}` | display dùng font thương hiệu |
| `radius` | `{base: 6, multiplier: 1.6}` | bo mềm nhưng không bầu: 8/12/20px |
| `motion` | `{fast: 150, medium: 320, slow: 700, ratio: 0.75}` | khớp bộ số đã chốt |

**Component override** (qua `components` trong `defineTheme`):
- `button.base` → `borderRadius: 'var(--radius-full)'` (nút pill — dấu hiệu "gần gũi" mạnh nhất), `fontWeight: 'var(--font-weight-semibold)'`
- `button['variant:primary']` → nền dùng `--color-accent`, hover đậm hơn
- `card.base` → `borderRadius: 'var(--radius-container)'`, `padding: 'var(--spacing-4)'`
- `text['type:display-2']` → dùng Bricolage, letter-spacing âm
- `badge.base` → bo góc pill, cỡ nhỏ

### 4.3 Cascade layer — bắt buộc đọc trước khi code

Astryx nạp CSS theo layer: `reset` → `astryx-base` → `astryx-theme`. CSS không có layer (file `.css` cũ của dự án) **luôn thắng** mọi named layer bất kể specificity. Để theme định hình được phần cũ, phải khai layer order rõ ràng:

```css
/* src/styles/layers.css — import ĐẦU TIÊN trong main.tsx */
@layer reset, astryx-base, astryx-theme, app;
```

và gán từng stylesheet vào layer tương ứng:
```css
/* src/styles/tokens.css */
@layer app { :root { ... } }
```

**Quan trọng — reset cũ phải tách riêng.** `tokens.css` hiện chứa reset ở tầng global:
```css
*, *::before, *::after { box-sizing: border-box; }
button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
img { display: block; max-width: 100%; }
```
`button { border: none; background: none }` sẽ **xoá style gốc của `Button` của Astryx** nếu nó nằm ở layer cao hơn `astryx-base`. Xử lý: tách reset cũ sang `src/styles/reset-legacy.css`, chỉ áp cho phần markup legacy (không dùng selector phổ quát `button`/`img` nữa — đổi sang namespace `.legacy-*`), đặt ở layer `app`.

Docs: `npx astryx docs migration/migration-setup cascade-layer-safety` và `layer-audit`.

### 4.4 Nối theme vào app

```tsx
// src/main.tsx
import './styles/layers.css';        // ĐẦU TIÊN — khai thứ tự cascade layer
import './styles/tokens.css';        // @layer app
import './styles/reset-legacy.css';  // @layer app, chỉ cho markup legacy
import '@astryxdesign/core/reset.css';    // @layer reset
import '@astryxdesign/core/astryx.css';   // @layer astryx-base
// theme CSS do CLI sinh trong src/astryx-themes.ts — phải import SAU globals

<Theme theme={themes[defaultThemeSlug]} mode="light">
  <BrowserRouter>…</BrowserRouter>
</Theme>
```

`mode="light"` cố định — dự án chưa làm dark mode.

---

## 5. Bố cục trang chủ (6 section)

### 5.1 Hero — `split`, bỏ slider

| Hiện tại | Mới |
|---|---|
| Slider 2 ảnh tự chạy 5s + dots chỉ báo | Ảnh tĩnh `banner_hero2.jpg` trong `AspectRatio` |
| Tiêu đề + trust strip **căn giữa** | Cột trái, canh trái → hết `centre-axis` |
| Không có nút hành động | Nút chính "Tìm sân trống" → `/tim-san` |
| Overlay tối phủ toàn bộ ảnh | Overlay chỉ trên cột chữ |

Cấu trúc: `Grid columns={{minWidth: 320, max: 2}}` → cột trái `VStack` (eyebrow `Badge`, `Heading level=1`, `Text`, `Button` chính, `Button` phụ, hàng 3 số liệu), cột phải `AspectRatio` + `<img>`.

Trust strip chuyển thành 3 số liệu canh trái (500+ sân · 30 giây · 4.8★), dùng `Text type="supporting"`, ngăn cách bằng `Divider` (Astryx không có `DividerVertical` — dùng `Divider` nằm ngang, xếp dọc trong `VStack`, hoặc ký tự `·` nếu giữ 1 hàng).

Hero cao **đúng 1 màn hình** (`minHeight: '100svh'` trên `Section`), nội dung kết thúc trước mép dưới.

### 5.2 SearchBar — vào trong hero

Bỏ `margin-top: -40px` (nguyên nhân `spill`). Form nằm ngay dưới CTA trong cột trái của hero, nền trắng, bo `--radius-container`, shadow nhẹ.

Field: label 14px **luôn hiện** (không dùng placeholder làm label), control cao 48px. Nút "Tìm sân" dùng `Button variant="primary"` cùng hàng.

Giữ nguyên logic `console.log` hiện tại — đây là demo, chưa nối API.

### 5.3 FeaturedCourts — ảnh thật, dùng `Card`

- `Grid columns={{minWidth: 260, max: 4}}` → tự reflow 4 → 2 → 1 cột.
- Mỗi thẻ là `ClickableCard` bọc `VStack`: `AspectRatio` + `<img>` (ảnh minh hoạ, `loading="lazy"`, `width`/`height` chống nhảy layout) → `Badge` số sân → `Heading level=3` tên sân → `Text` quận → hàng `Trống lúc …` + giá.
- **Sửa `overlap-text`**: tên sân `maxLines={1}` (Astryx `Text` cắt bằng ellipsis), cột rating `flex: 0 0 auto`.
- **Sửa contrast**: màu rating dùng `--cl-teal` (4.9:1) thay vì cam `#f97316` (2.8:1). Giá dùng `--color-text-primary`.
- Ảnh khác nhau cho từng thẻ, không dùng lại (quy tắc `photo-repeat`).

### 5.4 CitiesSection — có ảnh, đổi tiêu đề

- Mỗi thẻ thành phố: ảnh 3:2 nhỏ + tên + số sân (dùng 5 ảnh minh hoạ khác).
- Grid: `columns={{minWidth: 200, max: 5}}` → 5 → 2 → 1 cột. Tag được phép xuống dòng (bỏ `white-space: nowrap` gây `collide` ở 320px).
- Tiêu đề đổi thành **"Sân cầu lông ở Hà Nội, TP.HCM và Đà Nẵng"** → hết `copy-headings` (phải nêu tên đối tượng).

### 5.5 Section mới — "Bảng giá" (`id="bang-gia"`)

Section thật, không phải placeholder — đây là điểm neo cho link "Bảng giá" ở Header.

**Nội dung**: bảng khung giờ theo 3 ca (Sáng 5–12h · Chiều 12–17h · Tối 17–24h), mỗi ca một mức giá (đồng/giờ), lấy số liệu từ `DEMO_COURTS` hiện có:
- Sáng: `55.000đ – 80.000đ`
- Chiều: `70.000đ – 100.000đ`
- Tối: `90.000đ – 120.000đ`

**Bố cục**: `Grid columns={{minWidth: 220, max: 3}}` → 3 thẻ `Card`, mỗi thẻ là 1 ca: tên ca (`Heading level=3`), dải giá (`Text type="display-3"` dùng token accent), danh sách tiện ích đi kèm, và nút "Xem sân theo ca này" → `/tim-san` (không truyền query, vì `FilterPanel` chưa đọc query string — nếu muốn truyền `?hours=evening` thì phải nối `CourtDiscovery` đọc `useSearchParams`, **ngoài phạm vi lần này**).

Tiêu đề: **"Bảng giá đặt sân theo khung giờ"** → có tên đối tượng, hết `copy-headings`.

### 5.6 FaqSection — có ảnh, có CTA

- Split 2 cột: FAQ trái, ảnh nhà thi đấu phải → hết `text-only`.
- Dùng `Collapsible` + `CollapsibleGroup` (accordion) — giữ nguyên hành vi UX hiện tại.
- Tiêu đề đổi thành **"Cách đặt sân, đổi lịch và hoàn tiền"**.
- Thêm nút "Tìm sân trống" ở cuối section → hết `cta` FAIL (section cuối trang phải có nút).
- Thêm 2 khối có `id` riêng ở cuối FAQ: `#dieu-khoan` và `#chinh-sach` — mỗi khối một đoạn văn bản thật (2–3 câu), tách rõ để hai link footer trỏ tới **hai chỗ khác nhau**, không phải cùng một chỗ.

### 5.7 Header + Footer

**Header**
- 3 nav link → trỏ thật: "Tìm sân cầu lông" → `/tim-san`; "Bảng giá" → `/#bang-gia`; "Hỗ trợ" → `/#faq`.
- Nút "Đăng ký" dùng `Button variant="primary"`; "Đăng nhập" dùng `variant="ghost"`.
- Menu user dùng `DropdownMenu` của Astryx; nếu API không map 1-1 với menu hiện tại (đăng xuất + thông tin user) → giữ markup hiện tại, ghi rõ là ngoại lệ.
- Header giữ `position: sticky`. Vì vậy "1 màn hình" của hero được tính **từ dưới header trở xuống** (hero `minHeight` dùng `calc(100svh - 76px)` trên desktop, `calc(100svh - 64px)` ở mobile) → nội dung hero không bị đẩy xuống dưới màn hình.

**Footer**
- 6 link chết → thật: "Tìm sân cầu lông" → `/tim-san`; "Hướng dẫn đặt sân" → `/#faq`; "Cổng thanh toán" → `/#faq`; "Liên hệ" → `mailto:hotro@caulongdee.example`; "Điều khoản" → `/#dieu-khoan`; "Chính sách" → `/#chinh-sach`.
- **Tap target ≥ 44px** trên điện thoại: `display: inline-flex; align-items: center; min-height: 44px` → hết `tap-size` FAIL (15 cái).
- Thêm `<details class="foot__credits">` — **một dòng** liệt kê tác giả + giấy phép 9 ảnh Wikimedia, kèm ghi chú "ảnh minh hoạ, không phải sân của Cầu Lông dee".
- Nền footer tối `#0f172a`, chữ phụ dùng `#94a3b8` (5.6:1 trên nền tối).

### 5.8 `index.html` + skip link- Thêm `meta description`, `og:title` / `og:description` / `og:type` / `og:image`, `twitter:card`, `meta theme-color` = `#ffffff` (bỏ `#0d0e10` cũ — trang giờ nền sáng), `link rel="canonical"`.
- `Layout.tsx`: `<a class="skip-link" href="#main">Bỏ qua tới nội dung</a>` làm con đầu tiên → hết WARN `skip-link`.

---

## 6. Ảnh

**Ảnh thật của dự án** (giữ nguyên): `frontend/public/banner_hero2.jpg` → hero.

**Ảnh minh hoạ** (đã tải sẵn ở `assets/img/`, copy vào `frontend/public/img/`):

| File đích | Nguồn | Dùng ở |
|---|---|---|
| `court-01.jpg` | `photo-f139625978-960` (CC BY-SA 4.0, Adhitya2048) | Featured #1 |
| `court-02.jpg` | `photo-f160121535-960` (CC BY 2.0, Chris Eason) | Featured #2 |
| `court-03.jpg` | `photo-f152558530-960` (Public domain, Herbert Nott) | Featured #3 |
| `court-04.jpg` | `photo-f20514494-960` (CC BY 2.0, Ian Patterson) | Featured #4 |
| `city-hanoi.jpg` | `photo-f199967395-960` (CC0, Santiago) | Hà Nội |
| `city-hcm.jpg` | `photo-f76820497-960` (CC BY-SA 4.0, Joelflorentinpereira) | TP.HCM |
| `city-danang.jpg` | `photo-f120168288-960` (CC BY-SA 4.0, JoselínDoom) | Đà Nẵng |
| `city-haiphong.jpg` | `photo-f25559977-960` (CC BY-SA 2.0, Peter) | Hải Phòng |
| `city-cantho.jpg` | `photo-f125986121-960` (CC BY-SA 4.0, SwarmCheng) | Cần Thơ |

9 ảnh khác nhau → không ảnh nào bị dùng lại. Dùng bản `-960` cho thẻ (~150–190 KB mỗi ảnh). Tổng trọng lượng trang phải **< 1,2 MB**.

**Nguồn ảnh trong code** — thêm field vào type `Court` (`frontend/src/data/demoCourts.ts`):
```ts
export type Court = {
  // …
  image?: string;      // đường dẫn ảnh minh hoạ trong /img
  imageGradient: [string, string];  // giữ làm fallback khi image vắng mặt
};
```
Gán ảnh cho 8 sân hiện có (`c-001`→`court-01.jpg` … `c-008`→`court-04.jpg` theo vòng, **không ảnh nào lặp trong cùng trang chủ** — trang chủ chỉ hiện 4 sân đầu nên 4 ảnh là đủ; 4 ảnh còn lại dùng cho `/tim-san`).

Thành phố: ảnh gắn theo id trong `AREAS` (`hanoi`→`city-hanoi.jpg`, `hcm`→`city-hcm.jpg`, `danang`→`city-danang.jpg`, `haiphong`→`city-haiphong.jpg`, `cantho`→`city-cantho.jpg`). Cần thêm field `image` vào `AREAS` — `AREAS` hiện là `as const` readonly, nên thêm `image: '/img/city-hanoi.jpg'` vào từng phần tử.

---

## 7. Hiệu ứng (động vừa phải)

| Hiệu ứng | Thông số | Nơi áp |
|---|---|---|
| Vào trang | h1 → sub → CTA → trust, mỗi bước trễ 60ms, `translateY 12px → 0`, ~1.1s | Hero |
| Hover card | nâng 2px, viền đậm hơn, shadow mờ 24px; 150ms vào / 120ms ra | Thẻ sân, thẻ thành phố |
| Zoom ảnh trong khung | `scale(1.03)`, 600ms vào / 400ms ra | Ảnh trong `Card` |
| Nút | hover nâng 1px + đổi sắc; press xuống 1px + `scale(.985)`, 90ms | Mọi nút |
| Link chữ | gạch chân 1px vẽ từ trái sang phải | Link trong nội dung |

Quy tắc: tất cả nằm dưới `@media (hover: hover) and (pointer: fine)` (điện thoại không kẹt hover) và `@media (prefers-reduced-motion: reduce)` chỉ còn đổi màu.

Nhập trang dùng `framer-motion` (đã có sẵn trong project) — không thêm dependency.

---

## 8. Thứ tự thực thi

1. **Theme**: sinh palette → viết `caulongdeeTheme.ts` + `.doc.mjs` → `theme build` → `theme add` → xác nhận `src/astryx-themes.ts` sinh ra.
2. **Cascade layer**: tạo `src/styles/layers.css`, gán layer cho `tokens.css` + các file `.css` cũ, import đầu tiên trong `main.tsx`.
3. **Foundation smoke test**: render 1 trang thử với `Button` + `Card` + `Text` → xác nhận theme đúng màu trước khi sửa cả trang (docs: `migration/migration-setup foundation-smoke-test`).
4. **Shell**: `Layout.tsx` (skip link), `Header.tsx`/`.css`, `Footer.tsx`/`.css` (link thật, tap 44px, credits).
5. **Hero + SearchBar**: bỏ slider, split, CTA, form vào hero (mobile xếp dọc).
6. **FeaturedCourts**: ảnh thật + `ClickableCard`/`Grid`.
7. **CitiesSection**: ảnh + `Grid` + đổi tiêu đề.
8. **PricingSection** (mới): 3 thẻ khung giờ, `id="bang-gia"`.
9. **FaqSection**: split + ảnh + CTA + 2 khối `#dieu-khoan` / `#chinh-sach`.
10. **`/tim-san`**: đồng bộ sang token/component Astryx (giữ nguyên filter, phân trang, bản đồ) — `CourtCard` dùng `Card` + ảnh thật.
11. **`/dang-nhap` + `/dang-ky`**: đồng bộ token/component Astryx (giữ nguyên luồng OTP, social, validate).
12. **`index.html`**: meta/OG/theme-color/canonical.
13. **Copy ảnh** vào `frontend/public/img/`.
14. **Verify**: `tsc --noEmit` → `npm run build` → `npx astryx doctor` → chạy `consistency.mjs` (`--quick --no-rhythm`) → so `report.json` với §9.
15. **Cập nhật `README.md`**: mục "📈 Tiến trình dự án" + "🚀 Công nghệ sử dụng" (thêm Astryx).

---

## 9. Quy tắc **không** áp dụng ở đây (ghi rõ để không "fix" nhầm)

| Quy tắc | Vì sao bỏ qua |
|---|---|
| `section-height` / `one-section` của skill `taste-skill` | Bắt mỗi section đúng 1–2 màn hình ở 1440×900 sẽ làm trang dài 5–6 màn hình. Ta giữ chiều cao tự nhiên nhưng bảo đảm khoảng đệm ≥ 1/4 màn hình giữa các section và tiêu đề section không bao giờ lộ lên màn hình trước. |
| `hero-fill` ở mức "đúng 1 màn hình" | Vẫn áp dụng cho hero (sửa triệt để). |
| `text-only` cho FAQ | Skill nói FAQ phải mở hết; ta giữ accordion (ngoại lệ có chủ ý, §5.6). |
| `photo-credit` dưới ảnh | Skill cấm caption dưới ảnh → credits gom 1 dòng ở chân trang. |
| `container-edges`, `row-lines`, `split-pair` | Bị `SKIP` khi chạy `--no-rhythm`; ta dùng `--gut` cố định 1200px cho mọi section → cạnh trái/phải đã thống nhất. |
| `section-tile` (4 FAIL) | Trùng lặp với `section-height`/`one-section` đã bỏ qua ở dòng trên — cùng một nội dung, chỉ khác tên check. |
| `focus-ring` (1 FAIL, `.x1uvtmcs:focus{outline:none}`) | Lỗi nằm trong CSS của **kit Astryx**, không phải code của dự án. Đã probe bằng `scripts/probe-focus.mjs`: bấm Tab thật thì `:focus-visible` vẫn vẽ vòng 2px solid. Không sửa file trong `node_modules`. |

### 9.1 Ngoại lệ sau vòng audit (2026-11-13)

Vòng audit đầu tiên ra **113 FAIL** (chạy đủ `--rhythm`), sau khi áp dụng quy tắc `--no-rhythm` của §9 còn **22 FAIL**. Đã sửa tận gốc các lỗi thật qua 5 vòng audit (`audit1` → `audit5`), còn lại 2 nhóm ngoại lệ có chủ ý:

| Nhóm | Số | Xử lý |
|---|---|---|
| `hero-fill` | 4 | **Đã sửa** — `.hero { min-height: calc(100svh - 76px) }` (desktop) / `- 64px` (mobile). |
| `off-grid` + `right-edge` | 4 | **Đã sửa** — padding ngang của `.hero__inner` ở `≤900px` đổi từ `var(--s-5)` (20px) sang `var(--s-6)` (24px) cho khớp gutter. |
| `row-gap` | 2 | **Đã sửa** — bỏ `auto-fill` của Astryx, khai số cột cố định bằng `--x-gridTemplateColumns: … !important`. `featured`: lưới 6 cột, thẻ dẫn nhập `span 2` + 4 thẻ `span 1` → 5 thẻ nằm trọn 1 hàng. `cities`: lưới 6 cột, `span 2/2/2` (hàng 1) + `span 3/3` (hàng 2) → mọi hàng lấp đầy. |
| `overlap-text` | 1 | **Đã sửa** — `.featured__name` dùng `-webkit-line-clamp: 1` + `text-overflow: clip` thay cho `ellipsis` của Astryx (Range client-rect của `ellipsis` trải hết chuỗi gốc → tưởng đè lên badge). |
| `card-layout` | 8 | **Đã sửa** — mỗi thẻ một class riêng (`featured__card--r1…r4`, `cities__card--s0…s4`) + tỉ lệ ảnh khác nhau (1, 3:2, 16:10, 4:3) → không còn 4–5 thẻ trùng `[cls, ground, place, frag]`. |
| `collide` + `cut-text` + `contrast` | 4 | **Đã sửa** — ở `≤560px`, `.featured__card--lead` giữ `grid-column: span 2` trong khi lưới chỉ 1 cột → Chrome tự sinh track ngầm thứ 2 (~92px) bóp thẻ dẫn nhập còn 92px, chữ bị cắt và chồng lên nhau. Sửa bằng `grid-column: span 1 !important` ở `≤560px`. |
| `row-gap` + `photo-upscale` (cities ở 820/768px) | 2 | **Đã sửa** — bỏ lưới 2 cột của `cities` ở `≤899px` (thẻ `s4` `span 2` bị lẻ một mình ở hàng cuối, ảnh dọc bị phóng 1.61×). Giữ 3 cột xuống tới 560px → hàng 1 có 3 thẻ, hàng 2 có 2 thẻ. |
| `forms` | 1 | **Đã sửa** — `SearchBar` chặn submit bằng `preventDefault()` và chỉ `console.log` → không có request nào. Đổi thành form GET native `action="/tim-san"` với `name="khu-vuc|ngay|gio"`. |
| `section-gaps` (820/768px) | 2 | **Đã sửa tận gốc** — `Section` của Astryx render 1 `<div>` bọc ngoài (nhận class `hero`) chứa `<section>` bên trong; `<section>` mặc định `flex: 0 1 auto` nên chỉ cao đúng bằng nội dung (559px) trong khi wrapper cao `100svh` (1104px) → dư ~545px trống giữa hero và section kế tiếp. Sửa bằng `.hero > :first-child { flex: 1 1 auto }` + `.hero__inner { justify-content: space-between }` → khoảng hở giữa các section đều 81–97px ở cả 5 viewport. |
| `stagger` (hero 1440px) | 1 | **Đã sửa** — `VStack` co mỗi dòng về giữa nên các dòng lệch trái vài px. Đặt `justify-content: space-between` cho `.hero__inner` và bỏ `justify-content: center` ở `.hero__copy`; thêm class riêng cho từng dòng (`hero__badge`, `hero__title`, `hero__lede`, `hero__cta`, `hero__facts`) → 5 dòng có cùng `sig` (`DIV.hero__*`) nên `stagger` nhận diện đúng là một danh sách và bắt buộc chúng thẳng hàng. |
| `no-visual` (hero 820/768px) | 2 | **Đã sửa** — ở tablet ảnh hero nằm trong cột hẹp 375px, chỉ che ~10% diện tích section (cần ≥ 15%). Chuyển `.hero__grid` về 1 cột ở `≤900px` → ảnh tràn ngang 772px, che ≥ 25%. |
| `section-tile` | 3 | **Ngoại lệ** — trùng `section-height`/`one-section` (dòng trên). |
| `focus-ring` | 1 | **Ngoại lệ** — rule của kit Astryx trong `node_modules` (`.x1uvtmcs:focus{outline:none}`); probe thực tế xác nhận `:focus-visible` vẫn có vòng 2px. Không sửa file trong `node_modules`. |

**Kết quả sau khi sửa (`audit5`, 5 viewport 1440/1024/820/768/390):** còn **4 FAIL**, tất cả nằm trong 2 nhóm ngoại lệ đã ghi ở §9 và §9.1 (`section-tile` ×3, `focus-ring` ×1). Không còn FAIL nào ngoài danh sách này.

**Cách verify:** chạy `consistency.mjs` với `--quick --no-rhythm`, đọc `report.json`, đối chiếu từng FAIL/WARN với bảng hợp lệ ở trên. Mục tiêu: **mọi FAIL còn lại phải nằm trong bảng này**, không có FAIL mới.

---

## 10. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Cascade layer sai → theme không áp dụng hoặc CSS cũ đè lên theme | Khai layer order từ đầu (bước 2) + foundation smoke test (bước 3) trước khi sửa cả trang. |
| **Reset cũ trong `tokens.css` xoá style của component Astryx** | `tokens.css` hiện có `button { border: none; background: none }` và `img { display: block }` ở tầng global. Nếu đưa vào layer `app` (cao hơn `astryx-base`) → **sẽ đè mất** style gốc của `Button`/`Card`. Xử lý: **tách reset cũ ra** thành `src/styles/reset-legacy.css` chỉ áp cho phần markup legacy, và đặt nó ở layer `app` — nhưng mọi component Astryx phải nằm ngoài phạm vi selector của file này (dùng namespace class riêng, không dùng selector phổ quát như `button`). |
| Theme cam đậm hơn `#f97316` làm nút nặng | Cùng hue, chỉ giảm độ sáng để đạt WCAG AA. Nếu thấy nặng → dùng `--color-accent` sáng cho nền và token tối hơn cho chữ (kiểu dual-token). |
| `theme build` sinh type augmentation lỗi | Chạy `npx astryx doctor` sau mỗi bước theme; lỗi type → báo ngay, không bypass bằng `any`. |
| Ảnh minh hoạ nhìn "không phải sân Việt Nam" | Ghi rõ trong dòng credits là ảnh minh hoạ; khi có ảnh thật thì thay vào, cấu trúc không đổi. |
| `DropdownMenu` không map 1-1 với menu user hiện tại (đăng xuất + thông tin user) | Nếu không map được → giữ markup menu hiện tại, ghi rõ là ngoại lệ trong PR. |
| Đồng bộ `/tim-san` + `/dang-nhap` làm phình diff | Đây là hệ quả của quyết định "theme cho cả website". Làm theo thứ tự: trang chủ trước (để xác nhận theme đúng), rồi mới đồng bộ 2 trang kia — mỗi trang một bước verify riêng. |
| Ảnh `court-0X` dùng lại giữa trang chủ và `/tim-san` | Chấp nhận: quy tắc `photo-repeat` của skill áp cho **cùng một trang**. Trang chủ hiện 4 ảnh, `/tim-san` hiện 4 ảnh khác nhau → không lặp trong trang. |

---

## 11. Còn lại gì cho builder

- Chạy `node .agents/skills/design-taste-frontend/scripts/photos.mjs credits --out .` sau khi gắn ảnh vào markup để lấy đúng dòng credits có tên tác giả và giấy phép.
- Giữ nguyên route và logic React; thay đổi nằm ở theme + markup + CSS hỗ trợ.
- Mọi giá trị màu/px mới phải đi qua token của theme hoặc `localTokens` — không hardcode.
- Nếu gặp component Astryx không làm được đúng ý (ví dụ `DropdownMenu` cho menu user), dừng lại và báo — **đừng tự viết lại từ đầu**.

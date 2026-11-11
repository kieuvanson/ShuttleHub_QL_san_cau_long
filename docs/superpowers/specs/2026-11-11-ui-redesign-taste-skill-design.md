# Cải thiện giao diện Cầu Lông dee bằng design system của taste-skill

- **Ngày:** 2026-11-11
- **Phạm vi:** Frontend (`frontend/`) — trang chủ `/`, dùng chung cho `/tim-san` và trang auth
- **Nguồn:** skill `design-taste-frontend` (tasteskill 2.5.1), đã cài tại `.agents/skills/design-taste-frontend`
- **Trạng thái:** chờ duyệt

---

## 1. Vì sao làm

Trang chủ hiện tại đã chạy được nhưng **điểm số thị giác thấp**. Chạy checker headless Chrome của skill trên trang chủ (`consistency.mjs`, 4 bề rộng 1440/1024/768/390):

**14 FAIL + 15 WARN**

| Nhóm lỗi | Số | Thí dụ cụ thể |
|---|---|---|
| `text-contrast` | 8 | `#f97316` trên nền trắng = 2.8:1 (cần 4.5:1); `#0d9488` trên trắng = 3.56:1; `#64748b` trên `#0f172a` = 3.75:1 |
| `centre-axis` | 4 | hero + trust strip căn giữa trong khi phần còn lại canh trái → trục trang bị phá |
| `links` | 6 | "Bảng giá", "Hỗ trợ", 4 link footer đều trỏ `href="#"` — chết |
| `section-tile` | 5 | mọi section ngắn hơn 1 màn hình; section kế tiếp lộ tiêu đề lên màn hình trước |
| `hero-fill` | 1 | section "Tìm sân" lộ ra ở y=677 trên màn hình 900px |
| `spill` / `overlap-text` / `collide` | 3 | form search tràn 50px khỏi hero; rating đè lên tên sân; tag thành phố chồng nhau ở 320px |
| `no-visual` / `text-only` | 3 | section "Tìm theo thành phố" không có gì nhìn được; FAQ chỉ toàn chữ |
| `cta` | 2 | hero không có nút hành động; section cuối không kết thúc bằng nút |
| `copy-headings` | 1 | "Tìm theo thành phố" / "Câu hỏi thường gặp" không nêu tên đối tượng |

Ngoài ra, đọc code phát hiện `--s-20` được dùng trong `Hero.css:58` nhưng **không tồn tại** trong `tokens.css` (thang chỉ tới `--s-16`) → padding hero rơi vào giá trị rỗng.

**Mục tiêu:** đưa 14 FAIL về 0 (trừ nhóm quy tắc không áp dụng cho trang app — xem §6), và nâng giao diện lên mức "một design system duy nhất" thay vì 18 file CSS tự viết rời rạc.

---

## 2. Goals / Non-goals / Anti-goals

### Goals
1. Một design system duy nhất trong `tokens.css`: thang spacing, thang typography, bo góc, bộ số motion — theo đúng số đo của skill.
2. Sửa hết lỗi có bằng chứng từ checker (contrast, canh trục, link chết, tap target, tràn khung, chồng chữ).
3. Thay ảnh gradient tổng hợp bằng **ảnh nhà thi đấu thật**.
4. Hero theo bố cục `split` của skill: chữ trái, ảnh phải, đúng một màn hình, có CTA.
5. Giữ nguyên hệ màu thương hiệu và font hiện tại.

### Non-goals
- Không đổi stack, không thêm dependency, không đụng backend.
- Không viết lại `/tim-san` (trang app) — chỉ dùng chung token mới.
- Không làm landing page đúng kiểu figma.com (section nào cũng đúng 1 màn hình tuyệt đối) nếu làm trang dài quá — xem §6.
- Không dùng shader / WebGL / 3D.

### Anti-goals
- **Không dùng `system.css` + `starter.html` + `motion.js` của skill.** Chúng viết cho HTML tĩnh và dùng class `.btn` / `.card` / `.link` / `.nav` trùng với class hiện có của dự án (`CourtCard` đã có `.card`) → xung đột CSS. `motion.js` là vanilla JS trên `document.querySelector`, không tương thích với render React.
- **Không bê nguyên `motion.css` của skill.** Cùng lý do trùng class. Thay vào đó viết lớp motion riêng cho dự án, **giữ nguyên bộ số** của skill (xem §4).
- **Không bịa giá, số sân, đánh giá hay ảnh riêng của Cầu Lông dee.** Ảnh dùng là ảnh stand-in từ Wikimedia Commons, ghi nguồn ở chân trang.

---

## 3. Ràng buộc đã chốt

| Hạng mục | Quyết định |
|---|---|
| Phạm vi | **B** — chỉ mượn design system, không viết lại kiến trúc |
| Màu thương hiệu | **Giữ** gradient xanh lá–teal + CTA cam |
| Font | **Giữ** Inter (text) + Bricolage Grotesque (display) |
| Ảnh | Hero dùng **ảnh thật của bạn** (`banner_hero2.jpg` — ảnh sân cầu lông, 1200×738); thẻ sân/thành phố dùng **ảnh stand-in** từ Wikimedia + ghi nguồn ở chân trang |
| Node / Chrome | v24.19.0 ✅ · Chrome ✅ (checker cần cả hai) |

**Ngoại lệ có chủ ý so với skill:** skill cấm `Inter`. Ta giữ vì đây là thương hiệu hiện hữu và nằm ngoài phạm vi việc đổi nhận diện.

---

## 4. Design system mới (chi tiết kỹ thuật)

### 4.1 `src/styles/tokens.css` — bổ sung

**Spacing** (skill: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128):
```
--s-20: 80px    --s-24: 96px    --s-32: 128px
```
(bổ sung `--s-20` cũng sửa lỗi `Hero.css` dùng token không tồn tại)

**Typography** (skill `layout-v4.md` §5):
```
--t-h1: clamp(38px, 5vw, 72px)   --t-h2: clamp(28px, 3vw, 48px)
--t-h3: 24px                     --t-lead: 20px
--t-body: 16px                   --t-small: 14px
--t-label: 13px                  --t-stat: 38px
```
Quy tắc: body ≥ 16px, label 13px/500, không dùng `text-transform: uppercase` cho label.

**Radius** — theo skill `soft`: `--r-sm: 8px`, `--r-md: 12px`, `--r-lg: 20px` (đổi từ 6/10/16).

**Motion** — nguyên số từ `motion.md`:
```
--m-in: 150ms    --m-out: 120ms    --m-press: 90ms
--m-image: 600ms --m-image-out: 400ms
--m-lift: -2px   --m-zoom: 1.03
--m-ease: cubic-bezier(.2, .8, .2, 1)
--m-ease-enter: cubic-bezier(.22, 1, .36, 1)
```

**Contrast** — sửa các token vi phạm, **giữ nguyên hue**:
| Token | Cũ | Mới | Tỷ lệ mới |
|---|---|---|---|
| `--cta-0` (nền nút) | `#f97316` | `#c2410c` | white on nó = 5.0:1 ✅ |
| `--cta-1` (hover) | `#ea580c` | `#9a3412` | |
| `--brand-2` (chữ teal) | `#0d9488` | `#0f766e` | trên trắng = 4.9:1 ✅ |
| `--ink-2` (chữ phụ) | `#64748b` | `#475569` | trên trắng = 7.0:1 ✅ |
| `--ink-3` | `#94a3b8` | `#64748b` | chỉ dùng placeholder |
| footer `--ink-on-dark` phụ | `#64748b` | `#94a3b8` | trên `#0f172a` = 5.6:1 ✅ |

### 4.2 `src/styles/motion.css` — lớp motion riêng của dự án (mới)

Lấy nguyên số của skill, áp cho class của dự án:
- Thẻ có link (`.featured__btn`, `.card`) nâng 2px, viền đậm hơn, bóng mờ 24px — 180ms in / 120ms out.
- Ảnh trong thẻ zoom 1.03 trong khung — 600ms in / 400ms out.
- Nút: hover nâng 1px + đổi sắc 14% về ink (150ms); press xuống 1px + scale .985 (90ms).
- Link: gạch chân 1px vẽ từ trái sang phải (150ms in / 120ms out).
- Focus ring 2px màu action, **không transition**.
- Tất cả nằm dưới `@media (hover: hover) and (pointer: fine)` → điện thoại không kẹt hover.
- `@media (prefers-reduced-motion: reduce)` → chỉ còn đổi màu, không transform.

### 4.3 Hero — đổi từ slider sang `split`

Skill cấm carousel/slider tự chạy (`motion.md` §Never) → **bỏ auto-rotate 5s và bỏ dots**.

Bố cục mới (1440): chữ trên cột 1–5, ảnh trên cột 7–12, cùng đỉnh, ảnh kết thúc trên cạnh phải.
- Ảnh: `banner_hero2.jpg` (ảnh sân cầu lông thật của bạn) — có `<picture>` với 1 bản mobile crop.
- Tiêu đề canh **trái** (bỏ căn giữa) → hết `centre-axis`.
- Thêm nút CTA chính "Tìm sân trống" → `/tim-san` → hết `cta` FAIL.
- Trust strip chuyển thành 3 số liệu canh trái, dạng hàng ngang dưới CTA.
- Hero chiếm **đúng 1 màn hình** (`min-height: 100svh`), nội dung kết thúc trước mép dưới → hết `hero-fill` + `section-tile` của hero.
- Overlay tối đặt trên 1/3 trái (nơi có chữ), không phủ cả ảnh → hết `busy-ground`.
- Nhập cảnh: h1 + sub + CTA + trust lần lượt (stagger 60ms, `translateY 12px` → 0), tổng ~1.1s, dùng `framer-motion` (đã có sẵn) hoặc CSS thuần.

### 4.4 SearchBar — gộp vào Hero, không overlap

`search` hiện có `margin-top: -40px` → gây `spill` (tràn 50px khỏi hero) và `flush`.

Sửa: form tìm kiếm **nằm ngay dưới CTA trong hero** (một khối, nền trắng, bo 12px). Bỏ `margin-top` âm. Field 48px, label 14px ở trên (skill `system.md` §Forms: label phải nhìn thấy được, không dùng placeholder làm label). Nút "Tìm sân" 48px.

### 4.5 FeaturedCourts — ảnh thật, sửa chồng chữ

- Thay `linear-gradient` tổng hợp bằng `<img>` 4 ảnh nhà thi đấu stand-in (mỗi thẻ một ảnh, không dùng lại).
- `overlap-text`: h3 tên sân `min-width: 0` + `text-overflow: ellipsis`, cột rating `flex: 0 0 auto` → không còn đè lên nhau.
- `text-contrast`: màu rating cam → `--cta-1` (đậm hơn); màu "Trống lúc" → `--brand-1`.
- Ảnh trong thẻ có `loading="lazy"`, `width`/`height` để không nhảy layout.
- 4 cột trên desktop → 2 cột ở 1024 → 1 cột ở 560 (giữ nguyên).

### 4.6 CitiesSection — thêm ảnh để hết `no-visual`

- Mỗi thẻ thành phố có **ảnh nhỏ 3:2** ở trên (dùng 5 ảnh stand-in khác), tên + số sân bên dưới.
- Bỏ grid 5 cột ép chật (`overlap-text` ở 320px do `white-space: nowrap` + `overflow: hidden` cùng lúc) → 5 cột trên desktop, 2 cột ở 900px, 1 cột ở 560px, tag được phép xuống dòng.
- Tiêu đề đổi thành có tên đối tượng: "Sân cầu lông ở Hà Nội, TP.HCM và Đà Nẵng" → hết `copy-headings`.

### 4.7 FaqSection — có hình và có nút

- `text-only` FAIL → bổ sung một ảnh nhà thi đấu ở cột phải, FAQ ở cột trái (split 6/6).
- `cta` FAIL (section cuối không có nút) → thêm nút "Tìm sân trống" ở cuối section.
- Tiêu đề đổi thành "Cách đặt sân, đổi lịch và hoàn tiền" → hết `copy-headings`.
- Skill nói FAQ phải **mở hết, không accordion**. Giữ accordion hiện tại vì đó là lựa chọn UX của dự án và `cta`/`text-only` mới là lỗi cần sửa; ghi rõ là ngoại lệ.

### 4.8 Header + Footer — link thật, tap target 44px

- Header nav (3 link) → trỏ anchor thật: "Tìm sân" → `/tim-san`, "Sân nổi bật" → `/#san-noi-bat`, "Hỗ trợ" → `/#faq`.
- Footer: "Tìm sân cầu lông" → `/tim-san`; "Hướng dẫn đặt sân" → `/#faq`; "Cổng thanh toán" → `/#faq`; "Liên hệ" → `mailto:hotro@caulongdee.example`; "Điều khoản" → `/#dieu-khoan`; "Chính sách" → `/#chinh-sach`.
  - Skill quy tắc 9: contact phải ở domain `.example`, không số điện thoại thật, không mã số doanh nghiệp.
  - Hai anchor `#dieu-khoan` / `#chinh-sach` cần chỗ đứng → thêm một dải điều khoản rút gọn ở cuối FAQ (2 đoạn văn bản thật, không phải placeholder).
- **Tap target**: mọi link trong footer và link chữ trong nội dung ≥ 44px cao trên điện thoại (`display: inline-flex; align-items: center; min-height: 44px`) → hết `tap-size` FAIL (15 cái).
- Footer: `font-weight` và cỡ chữ về 16/14 theo thang mới; dòng bản quyền dùng màu đạt 4.5:1 trên nền tối.

### 4.9 Credits ảnh — một dòng ở chân trang

Skill: **không ghi chú dưới ảnh**, ghi nguồn trong **một dòng duy nhất** ở chân trang, cuộn được (`<details>`).

Nội dung dòng credits (từ `photos.mjs credits`): liệt kê tên tác giả + giấy phép của từng ảnh Wikimedia dùng trên trang, kèm ghi chú "ảnh minh hoạ". Đây là **ảnh thay thế**, không phải sân của Cầu Lông dee → phải nói rõ trong dòng credits đó.

### 4.10 `index.html` — head theo skill `system.md` §Head

Thêm: `meta description`, `og:title` / `og:description` / `og:type` / `og:image`, `twitter:card`, `meta theme-color` cập nhật theo nền mới (`#ffffff`), `link rel="canonical"` để nguyên dạng comment. Bỏ `theme-color` cũ `#0d0e10` (đen) vì trang giờ nền sáng.

### 4.11 Skip link

`Layout.tsx` thêm `<a class="skip-link" href="#main">Bỏ qua tới nội dung</a>` làm con đầu tiên của header → hết WARN `skip-link`, giữ WCAG.

---

## 5. Ảnh

**Ảnh thật của dự án** (giữ nguyên, không đổi):
- `frontend/public/banner_hero2.jpg` → hero trang chủ.

**Ảnh stand-in** (đã tải về `assets/img/`, sẽ copy vào `frontend/public/img/`):
| File | Nội dung | Dùng ở |
|---|---|---|
| `photo-f139625978` | Sân cầu lông (Chiasma 5.0) | Featured #1 |
| `photo-f152558530` | Người chơi cầu lông (Y.M.C.A., PD) | Featured #2 |
| `photo-f160121535` | Trận cầu lông Olympic 2012 | Featured #3 |
| `photo-f20514494` | Cầu lông Olympic 9410 | Featured #4 |
| `photo-f76820497` | Cầu lông nữ trong nhà thi đấu | Cities — TP.HCM |
| `photo-f199967395` | Vận động viên cầu lông (CC0) | Cities — Hà Nội |
| `photo-f120168288` | Sân cầu lông trong nhà thi đấu (Coliseo Arena) | Cities — Đà Nẵng |
| `photo-f25559977` | Chung kết đôi Olympic 2012 | Cities — Hải Phòng |
| `photo-f125986121` | Cầu lông Philippines | Cities — Cần Thơ |

Đủ **9 ảnh khác nhau** cho 4 thẻ sân + 5 thẻ thành phố → không ảnh nào bị dùng lại (skill cấm `photo-repeat`).

Dùng bản `-960` (~150–190 KB) cho thẻ; hero dùng ảnh riêng. Tổng trọng lượng trang phải **< 1,2 MB** (ngưỡng `perf.mjs`).

---

## 6. Quy tắc của skill **không** áp dụng ở đây (ghi rõ để không "fix" nhầm)

| Quy tắc | Vì sao bỏ qua |
|---|---|
| `section-height` / `one-section` / `section-air` | Bắt mỗi section đúng 1–2 màn hình ở 1440×900. Áp cứng sẽ làm trang chủ dài 5–6 màn hình. Ta giữ section có chiều cao tự nhiên nhưng **bảo đảm có khoảng đệm ≥ 1/4 màn hình** giữa các section, và tiêu đề section không bao giờ lộ lên màn hình trước. |
| `hero-screen`, `container-edges`, `row-lines`, `split-pair` | Bị `SKIP` khi chạy `--no-rhythm`; ta dùng `--gut` cố định 1200px cho mọi section (đã có sẵn) nên cạnh trái/phải đã thống nhất. |
| `hero-fill` ở mức "đúng 1 màn hình" | Vẫn áp dụng cho hero (sửa triệt để). |
| `text-only` cho FAQ | Skill nói FAQ mở hết; ta giữ accordion (ngoại lệ có chủ ý, đã ghi ở §4.7). |
| `photo-credit` dưới ảnh | Skill cấm caption dưới ảnh → credits gom 1 dòng ở chân trang. |

**Cách verify**: chạy `consistency.mjs` với `--quick --no-rhythm`, đọc `report.json`, đối chiếu từng FAIL/WARN với danh sách hợp lệ ở trên. Mục tiêu: **mọi FAIL còn lại phải nằm trong bảng này**, không có FAIL mới.

---

## 7. Thứ tự thực thi

1. **Tokens**: viết lại `tokens.css` (spacing, typography, radius, motion, sửa contrast).
2. **Motion layer**: tạo `src/styles/motion.css`, import sau `tokens.css` trong `main.tsx`.
3. **Head + shell**: `index.html` (meta/og), `Layout.tsx` (skip link), `Header.tsx`/`Header.css` (link thật, focus ring), `Footer.tsx`/`Footer.css` (link thật, tap 44px, credits).
4. **Hero + SearchBar**: `Hero.tsx`/`Hero.css` (bỏ slider, split, CTA, 100svh), `SearchBar.tsx`/`SearchBar.css` (gộp vào hero, field 48px).
5. **FeaturedCourts**: `FeaturedCourts.tsx`/`.css` (ảnh thật, sửa overlap + contrast) + copy ảnh vào `public/img/`.
6. **CitiesSection**: thêm ảnh, đổi tiêu đề, sửa grid.
7. **FaqSection**: thêm ảnh + CTA, đổi tiêu đề, thêm dải điều khoản/chính sách.
8. **CourtCard** (dùng chung ở `/tim-san`): đồng bộ token mới, sửa contrast, thêm motion.
9. **Verify**: `tsc --noEmit` → `npm run build` → `consistency.mjs` → so `report.json` với §6.
10. **Cập nhật `README.md`**: mục "📈 Tiến trình dự án" và "🌐 API Endpoints" (không thêm endpoint, chỉ ghi chú giao diện).

---

## 8. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Đổi `--cta-0` làm nút cam đậm hơn, mất "sáng" | Cùng hue, chỉ giảm độ sáng để đạt WCAG AA. Nếu bạn thấy nặng → dùng cam sáng cho **nền** và cam đậm cho **chữ** trên nền sáng (kiểu dual-token). |
| Section nào phải cao hơn 1 màn hình để hết `no-visual` | Ưu tiên thêm ảnh thay vì bơm padding trống. |
| Ảnh stand-in nhìn "không phải sân Việt Nam" | Ghi rõ trong dòng credits là ảnh minh hoạ; khi bạn có ảnh thật thì thay vào, cấu trúc không đổi. |
| Checker `section-tile` vẫn FAIL | Đã ghi ở §6 là ngoại lệ có chủ ý — không sửa. |

---

## 9. Còn lại gì cho builder

- Ảnh: copy 9 file từ `assets/img/` vào `frontend/public/img/`, đặt tên có nghĩa (`sân-1.jpg` → `court-01.jpg`).
- Chạy `node .agents/skills/design-taste-frontend/scripts/photos.mjs credits --out .` sau khi gắn ảnh vào markup để lấy đúng dòng credits có tên tác giả và giấy phép.
- Giữ nguyên cấu trúc route và logic React; mọi thay đổi nằm ở CSS + markup lớp/ảnh.

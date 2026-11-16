# Tách trang chủ (bảng tin) và trang tìm sân (landing)

> Ngày: 2026-11-16
> Phạm vi: Frontend — `Home.tsx`, `CourtDiscovery.tsx`, `Header.tsx`, `Footer.tsx`, `Hero.tsx`

## 1. Ý định & lý do

Trang chủ `/` hiện đang chứa hai việc khác nhau chồng lên nhau:

1. **Bảng tin cộng đồng** (feed) — tính năng mới, kiểu Facebook, là thứ người dùng muốn thấy đầu tiên.
2. **Landing page marketing** (Hero → Sân nổi bật → Bảng giá → Thành phố → FAQ) — làm trang chủ dài lê thê, đẩy feed xuống dưới và làm loãng trải nghiệm feed.

Yêu cầu của chủ dự án: **trang chủ chỉ hiện bảng tin**; toàn bộ landing chuyển sang **trang tìm sân** `/tim-san` — nơi người dùng đã đến với ý định đặt sân, nên landing ở đó là đúng ngữ cảnh, không làm loãng.

## 2. Mục tiêu / không mục tiêu

**Mục tiêu**
- `/` render **duy nhất** `Feed` (không Hero, không Sân nổi bật, không Bảng giá/Thành phố/FAQ).
- `/tim-san` chứa phần tìm sân hiện có (banner slideshow + ô tìm nhanh + bộ lọc + danh sách + bản đồ) ở trên, rồi 5 section landing ở dưới.
- Mọi link tới anchor (`#bang-gia`, `#faq`) trong Header/Footer/Hero tiếp tục hoạt động — cuộn đúng tới section, không phải "chết".

**Không mục tiêu**
- Không đổi nội dung/nội dung hiển thị của feed.
- Không đổi nghiệp vụ tìm sân (bộ lọc, phân trang, bản đồ) — chỉ dồn bố cục.
- Không sửa các link footer `/#dieu-khoan`, `/#chinh-sach` — chúng **vốn đã** không có section đích (dead link có sẵn từ trước, nằm ngoài phạm vi thay đổi này).

## 3. Ràng buộc phát hiện khi đọc code

| # | Ràng buộc | File | Ảnh hưởng |
|---|---|---|---|
| C1 | Hero được thiết kế để **lấp trọn màn hình đầu tiên**: `min-height: calc(100svh - 76px)` | `Hero.css:25` | Ở giữa trang `/tim-san`, hero cao 1 màn hình là lỗi bố cục → cần biến thể "compact" (bỏ min-height, giảm padding). |
| C2 | Hero chứa sẵn một `<SearchBar>` (form khu vực/ngày/giờ) | `Hero.tsx:105` | `/tim-san` đã có `QuickSearchBar` ngay phía trên → trùng 2 form tìm trên 1 trang → Hero trên `/tim-san` phải ẩn form này. |
| C3 | `Header.tsx` / `Footer.tsx` dùng `Link` thuần của react-router — **không** cuộn tới anchor | `Header.tsx:34`, `Footer.tsx:16` | Chỉ `AppLink` mới xử lý hash-scroll. Đây là bug có sẵn; khi đổi đích anchor bắt buộc phải sửa, nếu không link vẫn "chết". |
| C4 | `Hero.tsx` nút "Xem bảng giá" trỏ `/#bang-gia` | `Hero.tsx:58` | Phải đổi thành `/tim-san#bang-gia` (Hero nay nằm trên chính trang đó). |
| C5 | Section landing có nền riêng (`--surface-0` / `--surface-1`) và `max-width: 1200px` | `*.css` | Phải nằm **ngoài** khối `.cd` (khối có nền `--surface-1` + `margin-top:-60px` để bar nổi đè banner) để không bị nền/bo góc lệch. |
| C6 | `.pricing` đã có `scroll-margin-top: 80px`; `.faq` thì chưa | `PricingSection.css`, `FaqSection.css` | Thêm `scroll-margin-top` cho `.faq` để header sticky không che tiêu đề. |

## 4. Các hướng đã cân nhắc

### Hướng A — Hero "compact" trên `/tim-san` (ĐÃ CHỌN)

`/tim-san` = [banner slideshow + QuickSearchBar + FilterPanel + danh sách + bản đồ] → [Hero compact (không form, không full-screen)] → [Sân nổi bật] → [Bảng giá] → [Thành phố] → [FAQ].

- **Đánh đổi**: Hero phải có 2 biến thể (`compact`) → `Hero.tsx` phức tạp hơn một chút; 2 banner vẫn cùng tồn tại trên trang (banner slideshow + ảnh hero).
- **Vì sao chọn**: giữ nguyên toàn bộ nội dung landing (không mất gì), và "search-first" đúng như yêu cầu — người dùng đến `/tim-san` thấy ngay công cụ tìm sân.

### Hướng B — Bỏ hẳn Hero khỏi `/tim-san`

Chỉ giữ Sân nổi bật + Bảng giá + Thành phố + FAQ.

- **Đánh đổi**: mất headline "Đặt sân cầu lông trong 30 giây", mất ảnh banner đẹp và 3 stat (500+ sân / 30 giây / 4.8★). Trang mở đầu bằng danh sách sân ngay — có thể hơi "nặng nề" với người mới.
- **Bị loại**: chủ dự án đã chọn giữ Hero trong danh sách section chuyển sang.

### Hướng C — Giữ Hero nguyên vẹn (kể cả form + full-screen)

- **Đánh đổi**: 2 form tìm sân (QuickSearchBar + Hero's SearchBar) và 1 hero cao 1 màn hình nằm giữa trang → rối, lặp.
- **Bị loại**: vi phạm ràng buộc C1/C2.

## 5. Thiết kế chi tiết

### 5.1 `frontend/src/pages/Home.tsx`

```tsx
import { Feed } from '../components/feed/Feed';
import './Home.css';

export function Home() {
  return (
    <div className="home-feed">
      <Feed />
    </div>
  );
}
```

- Xoá import `Hero`, `FeaturedCourts`, `PricingSection`, `CitiesSection`, `FaqSection`.
- `Home.css`: giữ `.home-feed`; xoá các rule `.home__section*` đã không còn dùng (đã grep xác nhận không file nào dùng `home__section` / `home__main` / `className="home"`).

### 5.2 `frontend/src/pages/CourtDiscovery.tsx`

Cấu trúc mới (landing nằm **ngoài** `.cd`, sau khối `.cd`):

```
<BookingHeader />
<div className="cd">… (QuickSearchBar, crumbs, FilterPanel, results, map) …</div>
<Hero compact showSearch={false} />
<FeaturedCourts />
<PricingSection />
<CitiesSection />
<FaqSection />
```

- `Hero` nhận 2 prop mới: `compact?: boolean` (mặc định `false`) và `showSearch?: boolean` (mặc định `true`).
- 4 section landing giữ nguyên `id` (`bang-gia`, `faq`) nên anchor cũ vẫn dùng được, chỉ đổi prefix path.

### 5.3 `frontend/src/components/Hero.tsx`

```tsx
type HeroProps = {
  /** Bản rút gọn dùng khi hero không nằm ở đầu trang (trang tìm sân). */
  compact?: boolean;
  /** Ẩn ô tìm kiếm khi trang đã có sẵn công cụ tìm sân. */
  showSearch?: boolean;
};
```

- `compact` → thêm class `hero--compact`, dùng để bỏ `min-height: 100svh` và giảm padding dọc.
- `showSearch={false}` → không render khối `.hero__search`.
- Nút "Tìm sân trống" → `href="/tim-san#ket-qua"` (nhảy xuống khối kết quả), nút "Xem bảng giá" → `href="/tim-san#bang-gia"`.
- Thêm `id="ket-qua"` cho `<section className="cd__results">`.

### 5.4 Link tới anchor (`Header.tsx`, `Footer.tsx`, `Hero.tsx`)

- **Đổi đích**: `/#bang-gia` → `/tim-san#bang-gia`; `/#faq` → `/tim-san#faq`.
- **Sửa cơ chế cuộn (C3)**: `Header.tsx` và `Footer.tsx` chuyển từ `Link` của `react-router-dom` sang `AppLink` (`src/components/AppLink.tsx`) — `AppLink` đã có effect cuộn tới anchor sau khi route đổi. `AppLink` nhận `className` qua `...rest` nên không phải đổi markup.
  - Lưu ý: `AppLink` dùng `Link` của react-router ⇒ điều hướng SPA, không reload trang. Hành vi mong muốn.
- `Hero.tsx` dùng `Button href=...` của Astryx → đã đi qua `LinkProvider`/`AppLink` nên hash-scroll hoạt động sẵn.

### 5.5 CSS

- `Hero.css`: thêm khối `.hero--compact` (bỏ `min-height`, giảm padding dọc của `.hero__inner`).
- `FaqSection.css`: thêm `scroll-margin-top: 80px` cho `.faq`.
- `Home.css`: dọn rule không dùng.

## 6. Test

- `Home.test.tsx` (mới): render `<Home/>` → có `Feed`, **không** có `id="bang-gia"` / `id="faq"` / heading "Sân cầu lông nổi bật hôm nay".
- `CourtDiscovery.test.tsx` (mới): render `<CourtDiscovery/>` → có `id="bang-gia"`, `id="faq"`, và khối tìm sân.
- Chạy lại toàn bộ suite hiện có (46 test) để chắc không gãy gì.

## 7. Verify

```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
npm run test
npm run build
```

Kiểm tra bằng browser: `/` chỉ có feed; `/tim-san` có tìm sân ở trên + landing ở dưới; bấm "Bảng giá" ở header → cuộn tới `#bang-gia`; bấm "Hỗ trợ" → cuộn tới `#faq`.

## 8. Còn lại cho builder

- Có nên thêm nội dung "Chính sách / Điều khoản" thật cho 2 link footer dead không? (ngoài phạm vi hiện tại)

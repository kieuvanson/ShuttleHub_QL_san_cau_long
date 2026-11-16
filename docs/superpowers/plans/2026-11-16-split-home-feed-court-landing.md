# Tách trang chủ (bảng tin) và trang tìm sân (landing) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang chủ `/` chỉ còn feed cộng đồng; toàn bộ landing (Hero → Sân nổi bật → Bảng giá → Thành phố → FAQ) chuyển xuống trang tìm sân `/tim-san`, và mọi link tới anchor vẫn cuộn đúng tới section.

**Architecture:** Frontend-only, không đổi API. `Home.tsx` giữ lại `<Feed />`; `CourtDiscovery.tsx` nhận thêm 5 section landing đặt **ngoài** khối `.cd` (khối có nền riêng + `margin-top: -60px` để thanh tìm nhanh nổi đè banner). `Hero` được rút gọn vĩnh viễn (bỏ chiều cao 1 màn hình, bỏ ô tìm kiếm trùng, hạ `<h1>` → `<h2>`) vì nay nó chỉ sống ở `/tim-san`. `AppLink` (đã có sẵn hash-scroll) được dùng cho Header/Footer để link anchor cuộn được.

**Tech Stack:** React 19 · TypeScript 7 · Vite 8 · `@astryxdesign/core` 0.7.13 · `framer-motion` 14 · React Router 7 · Vitest 5 + Testing Library 16

**Spec:** `docs/superpowers/specs/2026-11-16-split-home-feed-court-landing-design.md`

---

## Global Constraints

- **Trả lời và comment bằng tiếng Việt.** Tên biến/hàm/class viết tiếng Anh.
- **Không dùng `any`** trong TypeScript. **Không thêm dependency runtime mới.**
- **CSS đi cùng file component**, mọi rule app nằm trong `@layer app`. **Không hardcode màu** — dùng token (`--surface-*`, `--s-*`, `--ink-*`).
- Gọi API qua `src/api/client.ts` — thay đổi này **không** đụng API.
- **Không sửa file migration** backend; thay đổi này **không** đụng backend.
- **Verify trước khi báo xong** (cả 3 phải pass):
  ```powershell
  cd frontend
  .\node_modules\.bin\tsc --noEmit
  npm run test
  npm run build
  ```
- **Cập nhật `README.md`** ở gốc repo: mục "📈 Tiến trình dự án" (hạng mục 3.x) sau khi verify thật. Không thêm/sửa endpoint (không có API mới).
- **Không tự `git push`.**

### Bảng id/anchor quyết định trong plan này

| Anchor | Section chủ | Nằm ở đâu sau thay đổi |
|---|---|---|
| `ket-qua` | khối danh sách sân | `/tim-san` |
| `bang-gia` | `PricingSection` | `/tim-san` |
| `faq` | `FaqSection` | `/tim-san` |
| `dieu-khoan` | `FaqSection` (khối điều khoản) | `/tim-san` |
| `chinh-sach` | `FaqSection` (khối chính sách) | `/tim-san` |
| `post-<id>` | bài viết trong feed | `/` (không đổi) |

> ⚠️ `dieu-khoan` và `chinh-sach` **KHÔNG phải** dead link — chúng nằm trong `FaqSection.tsx` (`faq__terms`) và đi theo section đó sang `/tim-san`. Phải đổi cả 2.

---

## Review Focus

Những input/điều kiện mà spec đòi nhưng không task nào test trực tiếp — mỗi dòng được gắn vào task sở hữu code:

1. **Bấm "Bảng giá" / "Hỗ trợ" ở Header khi đang đứng ở trang khác** (`/`) → phải điều hướng tới `/tim-san#bang-gia` và **cuộn tới** section, không chỉ đổi URL. → Task 4, test `Header.test.tsx` + `Footer.test.tsx`.
2. **Bấm link tới `/tim-san` từ bên trong section đã ở `/tim-san`** (nút "Xem sân theo ca này", "Xem tất cả", thẻ sân/thành phố) → `/tim-san` trùng `/tim-san` là **no-op** của React Router: trang không đổi, không cuộn, người dùng tưởng nút chết. Phải trỏ `/tim-san#ket-qua`. → Task 5, test `CourtDiscovery.test.tsx`.
3. **Trang chủ mất `<h1>`** khi Hero rời đi → trang không còn tiêu đề chính cho trình đọc màn hình / SEO. Phải có h1 (ẩn thị giác) là "Bảng tin cộng đồng cầu lông". → Task 1, test `Home.test.tsx`.
4. **Trang `/tim-san` có 2 công cụ tìm kiếm** nếu Hero giữ nguyên ô tìm kiếm → người dùng thấy 2 form tìm sân cạnh nhau (QuickSearchBar + form khu vực/ngày/giờ của Hero). Phải còn **đúng 1**. → Task 2, test `CourtDiscovery.test.tsx`.
5. **Hero cao 1 màn hình ở giữa `/tim-san`** (`min-height: calc(100svh - 76px)`) → trang dài bị thêm một màn hình trắng vô nghĩa giữa bản đồ và danh sách sân. Phải bỏ. → Task 2, test `Hero.test.tsx`.
6. **`scrollIntoView` không tồn tại trong jsdom** → `AppLink` và deep-link của feed gọi nó → `TypeError` làm hỏng test. Polyfill ở `src/test/setup.ts`. → Task 4.

---

## Cấu trúc file thay đổi

| File | Hành động | Trách nhiệm sau thay đổi |
|---|---|---|
| `frontend/src/pages/Home.tsx` | Sửa | Chỉ render feed + h1 ẩn |
| `frontend/src/pages/Home.css` | Sửa | Thêm `.home__sr-only`, xoá rule chết |
| `frontend/src/pages/Home.test.tsx` | Tạo | Khẳng định trang chủ chỉ có feed |
| `frontend/src/components/Hero.tsx` | Sửa | Hero rút gọn (không full-screen, không form tìm, h2) |
| `frontend/src/components/Hero.css` | Sửa | Bỏ `min-height` + `.hero__search` |
| `frontend/src/components/Hero.test.tsx` | Tạo | Khẳng định hero không còn form tìm / full-screen |
| `frontend/src/components/SearchBar.tsx` | **Xoá** | Không còn dùng (Hero đã bỏ form) |
| `frontend/src/components/SearchBar.css` | **Xoá** | — |
| `frontend/src/pages/CourtDiscovery.tsx` | Sửa | Nhận 5 section landing + h1 + `id="ket-qua"` |
| `frontend/src/pages/CourtDiscovery.css` | Sửa | Style h1 breadcrumb + `scroll-margin-top` |
| `frontend/src/pages/CourtDiscovery.test.tsx` | Tạo | Khẳng định trang tìm sân có đủ anchor + 1 công cụ tìm |
| `frontend/src/components/Header.tsx` | Sửa | Dùng `AppLink`, đổi đích anchor |
| `frontend/src/components/Footer.tsx` | Sửa | Dùng `AppLink`, đổi đích anchor |
| `frontend/src/components/Header.test.tsx` | Tạo | Khẳng định điều hướng tới `/tim-san#bang-gia` |
| `frontend/src/components/Footer.test.tsx` | Tạo | Khẳng định điều hướng tới `/tim-san#faq` / `#dieu-khoan` |
| `frontend/src/components/AppLink.tsx` | Sửa | Thêm `location.key` vào deps hash-scroll |
| `frontend/src/components/FeaturedCourts.tsx` | Sửa | Link trỏ `/tim-san#ket-qua` |
| `frontend/src/components/PricingSection.tsx` | Sửa | Link trỏ `/tim-san#ket-qua` |
| `frontend/src/components/CitiesSection.tsx` | Sửa | Link trỏ `/tim-san#ket-qua` |
| `frontend/src/components/FaqSection.tsx` | Sửa | Link trỏ `/tim-san#ket-qua` |
| `frontend/src/components/FaqSection.css` | Sửa | `scroll-margin-top` cho `.faq` và `.faq__terms` |
| `frontend/src/test/setup.ts` | Sửa | Polyfill `Element.prototype.scrollIntoView` |

---

## Task 1: Trang chủ chỉ còn feed

**Files:**
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/Home.css`
- Test: `frontend/src/pages/Home.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `Feed` từ `../components/feed/Feed` (không đổi), `DEMO_POSTS` từ `../data/demoPosts`.
- Produces: `<Home />` — không còn render `Hero`/`FeaturedCourts`/`PricingSection`/`CitiesSection`/`FaqSection`.

- [ ] **Step 1: Viết test thất bại**

Tạo `frontend/src/pages/Home.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { DEMO_POSTS } from '../data/demoPosts';
import { Home } from './Home';

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Home — trang chủ chỉ có bảng tin', () => {
  it('render feed cộng đồng', async () => {
    renderHome();
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(DEMO_POSTS.length);
    });
  });

  it('không còn section landing nào', async () => {
    renderHome();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    expect(document.getElementById('bang-gia')).toBeNull();
    expect(document.getElementById('faq')).toBeNull();
    expect(screen.queryByText('Đặt sân cầu lông trong 30 giây')).not.toBeInTheDocument();
    expect(screen.queryByText('Sân cầu lông nổi bật hôm nay')).not.toBeInTheDocument();
  });

  it('có h1 cho trình đọc màn hình', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bảng tin cộng đồng cầu lông' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/pages/Home.test.tsx
```
Expected: FAIL — `Home` vẫn render `Hero` → `document.getElementById('bang-gia')` khác `null`, và không tìm thấy h1 "Bảng tin cộng đồng cầu lông".

- [ ] **Step 3: Rút gọn `Home.tsx`**

Ghi đè `frontend/src/pages/Home.tsx`:

```tsx
import { Feed } from '../components/feed/Feed';
import './Home.css';

/**
 * Trang chủ nay CHỈ là bảng tin cộng đồng.
 *
 * Toàn bộ landing marketing (Hero, sân nổi bật, bảng giá, thành phố, FAQ)
 * đã chuyển sang trang tìm sân `/tim-san` — nơi người dùng đã có ý định đặt
 * sân, nên landing ở đó không làm loãng trải nghiệm.
 */
export function Home() {
  return (
    <div className="home-feed">
      {/* `h1` ẩn thị giác: trang chủ không còn section nào hiện tiêu đề
          lớn, nhưng vẫn cần một tiêu đề chính cho trình đọc màn hình/SEO. */}
      <h1 className="home__sr-only">Bảng tin cộng đồng cầu lông</h1>
      <Feed />
    </div>
  );
}
```

- [ ] **Step 4: Cập nhật `Home.css`**

Trong `frontend/src/pages/Home.css`:
- **Thêm** rule `.home__sr-only` (dùng kỹ thuật clip-path cổ điển để ẩn khỏi mắt nhưng vẫn đọc được bởi screen reader):

```css
/* Tiêu đề chính ẩn thị giác — chỉ dành cho trình đọc màn hình. */
.home__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- **Xoá** các rule `.home`, `.home__main`, `.home__section`, `.home__section--tight`, `.home__section--bleed` và media query `@media (max-width: 720px)` chứa chúng (đã grep xác nhận không file nào dùng `home__section` / `home__main` / `className="home"`).
- **Giữ** nguyên `.home-feed`.

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/pages/Home.test.tsx
```
Expected: 3 test PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/pages/Home.tsx frontend/src/pages/Home.css frontend/src/pages/Home.test.tsx
git commit -m "feat(frontend): trang chủ chỉ hiển thị bảng tin cộng đồng"
```

---

## Task 2: Hero rút gọn (không full-screen, không ô tìm kiếm trùng)

**Files:**
- Modify: `frontend/src/components/Hero.tsx`
- Modify: `frontend/src/components/Hero.css`
- Delete: `frontend/src/components/SearchBar.tsx`, `frontend/src/components/SearchBar.css`
- Test: `frontend/src/components/Hero.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `Heading`, `Text`, `Badge`, `Button`, `Grid`, `VStack`, `HStack`, `Section` từ `@astryxdesign/core/*`.
- Produces: `<Hero />` — không còn prop nào. Render `<h2>` "Đặt sân cầu lông trong 30 giây", **không** có `<form role="search">`, class gốc `.hero` (không có `.hero--compact`).

> **Quyết định thiết kế (YAGNI):** Hero nay chỉ dùng ở `/tim-san`. Thêm biến thể `compact` sẽ tạo 2 nhánh CSS mà không ai dùng nhánh "full-screen" → **xoá hẳn** chiều cao 1 màn hình, không thêm prop.

- [ ] **Step 1: Viết test thất bại**

Tạo `frontend/src/components/Hero.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Hero } from './Hero';

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
}

describe('Hero', () => {
  it('tiêu đề ở mức h2 vì h1 thuộc về tiêu đề trang', () => {
    renderHero();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Đặt sân cầu lông trong 30 giây' }),
    ).toBeInTheDocument();
  });

  it('không còn ô tìm kiếm trùng với thanh tìm nhanh của trang tìm sân', () => {
    renderHero();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/components/Hero.test.tsx
```
Expected: FAIL — `Hero` đang render `Heading level={1}` và `<SearchBar />` (form `role="search"`).

- [ ] **Step 3: Sửa `Hero.tsx`**

Sửa `frontend/src/components/Hero.tsx`:
- **Xoá** import `import { SearchBar } from './SearchBar';`.
- **Xoá** khối `<motion.div ... className="hero__search"><SearchBar /></motion.div>` (và `custom={5}` tương ứng).
- **Đổi** `<Heading level={1} type="display-2" textWrap="balance">` → `<Heading level={2} type="display-2" textWrap="balance">`.
- **Đổi** 2 nút CTA:
  - `<Button label="Tìm sân trống" variant="primary" href="/tim-san" />` → `href="/tim-san#ket-qua"`
  - `<Button label="Xem bảng giá" variant="secondary" href="/#bang-gia" />` → `href="/tim-san#bang-gia"`
- **Thêm** comment tiếng Việt giải thích *tại sao* bỏ ô tìm kiếm (trang tìm sân đã có `QuickSearchBar`).

- [ ] **Step 4: Sửa `Hero.css`**

Trong `frontend/src/components/Hero.css`:
- **Xoá** khối `.hero { min-height: calc(100svh - 76px); display: flex; flex-direction: column; }` → thay bằng `.hero` chỉ còn `width/background/overflow` (khối `.hero` đầu file đã có sẵn 3 thuộc tính đó — chỉ cần bỏ 3 dòng `min-height`/`display`/`flex-direction` ở khối thứ hai).
- **Xoá** khối `.hero > :first-child { flex: 1 1 auto; ... }` (chỉ phục vụ mẹo `100svh`).
- **Sửa** `.hero__inner`: bỏ `flex: 1 1 auto;` và `justify-content: space-between;` (không còn thanh tìm kiếm để đẩy xuống đáy).
- **Xoá** khối `.hero__search { flex: 0 0 auto; }`.
- **Xoá** media query `@media (max-width: 720px) { .hero { min-height: calc(100svh - 64px); } }`.
- **Giữ** nguyên: `.hero__grid`, `.hero__copy`, `.hero__actions`, `.hero__stats`, `.hero__media`, `.hero__frame`, các media query còn lại.

- [ ] **Step 5: Xoá `SearchBar` (đã hết dùng)**

Trước khi xoá, xác nhận không còn file nào import nó:
```powershell
cd frontend
rg -n "from './SearchBar'" src/
```
Expected: **không** có kết quả nào (sau khi Step 3 đã xoá import trong `Hero.tsx`).
Nếu `rg` không có trên PATH, dùng:
```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
```
Expected: không có lỗi "Cannot find module './SearchBar'".

Sau đó:
```powershell
git rm frontend/src/components/SearchBar.tsx frontend/src/components/SearchBar.css
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/components/Hero.test.tsx
```
Expected: 2 test PASS.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/components/Hero.tsx frontend/src/components/Hero.css frontend/src/components/Hero.test.tsx
git commit -m "refactor(frontend): rút gọn Hero cho trang tìm sân (bỏ full-screen và ô tìm kiếm trùng)"
```

---

## Task 3: Trang `/tim-san` nhận 5 section landing

**Files:**
- Modify: `frontend/src/pages/CourtDiscovery.tsx`
- Modify: `frontend/src/pages/CourtDiscovery.css`
- Test: `frontend/src/pages/CourtDiscovery.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `Hero` (Task 2), `FeaturedCourts`, `PricingSection` (giữ `id="bang-gia"`), `CitiesSection`, `FaqSection` (giữ `id="faq"`, `id="dieu-khoan"`, `id="chinh-sach"`).
- Produces: `<CourtDiscovery />` — thêm `id="ket-qua"` cho `<section className="cd__results">` và `<h1>` trong breadcrumb.

- [ ] **Step 1: Viết test thất bại**

Tạo `frontend/src/pages/CourtDiscovery.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CourtDiscovery } from './CourtDiscovery';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tim-san']}>
      <CourtDiscovery />
    </MemoryRouter>,
  );
}

describe('CourtDiscovery — trang tìm sân', () => {
  it('có tiêu đề chính h1 và khối kết quả', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Tìm sân cầu lông' })).toBeInTheDocument();
    expect(document.getElementById('ket-qua')).not.toBeNull();
  });

  it('chứa đủ các section landing và anchor của chúng', () => {
    renderPage();
    expect(document.getElementById('bang-gia')).not.toBeNull();
    expect(document.getElementById('faq')).not.toBeNull();
    expect(document.getElementById('dieu-khoan')).not.toBeNull();
    expect(document.getElementById('chinh-sach')).not.toBeNull();
    expect(screen.getByText('Sân cầu lông nổi bật hôm nay')).toBeInTheDocument();
  });

  it('chỉ có MỘT công cụ tìm kiếm trên trang', () => {
    renderPage();
    // `QuickSearchBar` dùng role="search"; form cũ của Hero đã bị bỏ.
    expect(screen.getAllByRole('search')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/pages/CourtDiscovery.test.tsx
```
Expected: FAIL — chưa có `id="ket-qua"`, chưa có h1 "Tìm sân cầu lông", chưa có `#bang-gia`/`#faq`.

- [ ] **Step 3: Sửa `CourtDiscovery.tsx`**

Sửa `frontend/src/pages/CourtDiscovery.tsx`:
- **Thêm** import:
  ```tsx
  import { Hero } from '../components/Hero';
  import { FeaturedCourts } from '../components/FeaturedCourts';
  import { PricingSection } from '../components/PricingSection';
  import { CitiesSection } from '../components/CitiesSection';
  import { FaqSection } from '../components/FaqSection';
  ```
- **Đổi** breadcrumb: `<span aria-current="page">Tìm sân cầu lông</span>` → `<h1 className="cd__crumbs-current" aria-current="page">Tìm sân cầu lông</h1>`.
- **Thêm** `id="ket-qua"` vào `<section className="cd__results" ...>`.
- **Thêm** 5 section landing **sau** khối `</div>` đóng `.cd` (tức là **ngoài** `.cd`, để giữ nền/bo góc riêng của từng section và không bị `.cd { margin-top: -60px }` kéo theo):

```tsx
      {/* Landing marketing nằm DƯỚI phần tìm sân, ngoài khối `.cd` — vì `.cd`
          có nền riêng và `margin-top: -60px` để thanh tìm nhanh nổi đè
          banner; đặt section vào trong `.cd` sẽ làm lệch nền. */}
      <Hero />
      <FeaturedCourts />
      <PricingSection />
      <CitiesSection />
      <FaqSection />
```

- **Giữ** nguyên khối `{selectedCourt && (...)}` (toast) ở cuối.

- [ ] **Step 4: Sửa `CourtDiscovery.css`**

Trong `frontend/src/pages/CourtDiscovery.css`:
- **Thêm**:
```css
/* h1 trong breadcrumb — giữ đúng nhịp chữ của breadcrumb nhưng là tiêu đề
   chính của trang (h1 duy nhất của `/tim-san`). */
.cd__crumbs-current {
  margin: 0;
  font-size: inherit;
  font-weight: 600;
  color: var(--ink-0);
}
```
- **Thêm** vào `.cd__results`: `scroll-margin-top: 80px;` (để anchor `#ket-qua` không bị header sticky che).

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/pages/CourtDiscovery.test.tsx
```
Expected: 3 test PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/pages/CourtDiscovery.tsx frontend/src/pages/CourtDiscovery.css frontend/src/pages/CourtDiscovery.test.tsx
git commit -m "feat(frontend): chuyển landing marketing sang trang tìm sân /tim-san"
```

---

## Task 4: Header + Footer trỏ đúng anchor và cuộn được

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/components/Footer.tsx`
- Modify: `frontend/src/components/AppLink.tsx`
- Modify: `frontend/src/test/setup.ts`
- Test: `frontend/src/components/Header.test.tsx`, `frontend/src/components/Footer.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `AppLink` từ `../components/AppLink` — nhận `to`/`href` + props của React Router `Link` (`className`, `aria-*`, `role`…).
- Produces: `AppLink` cuộn tới anchor khi **cả** `pathname`, `hash` **và** `location.key` đổi (để bấm lần hai cùng anchor vẫn cuộn).

> **Vì sao phải sửa `AppLink`:** nó dùng `Link` thuần của react-router ⇒ **không** tự cuộn tới hash. Chỉ `AppLink` mới có effect cuộn. Header/Footer hiện dùng `Link` ⇒ link anchor của chúng **chết** (chỉ đổi URL, không cuộn). Đây là bug có sẵn; chuyển section đi nơi khác làm lộ nó ra.

- [ ] **Step 1: Viết test thất bại**

Tạo `frontend/src/components/Header.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { Header } from './Header';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="loc">{`${location.pathname}${location.hash}`}</span>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Header />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Header — link tới anchor', () => {
  it('"Bảng giá" điều hướng tới /tim-san#bang-gia', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('link', { name: 'Bảng giá' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#bang-gia');
  });

  it('"Hỗ trợ" điều hướng tới /tim-san#faq', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('link', { name: 'Hỗ trợ' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#faq');
  });
});
```

Tạo `frontend/src/components/Footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="loc">{`${location.pathname}${location.hash}`}</span>;
}

function renderFooter() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Footer />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Footer — link tới anchor', () => {
  it('"Hướng dẫn đặt sân" điều hướng tới /tim-san#faq', async () => {
    const user = userEvent.setup();
    renderFooter();
    await user.click(screen.getByRole('link', { name: 'Hướng dẫn đặt sân' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#faq');
  });

  it('"Điều khoản" điều hướng tới /tim-san#dieu-khoan', async () => {
    const user = userEvent.setup();
    renderFooter();
    await user.click(screen.getByRole('link', { name: 'Điều khoản' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#dieu-khoan');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/components/Header.test.tsx src/components/Footer.test.tsx
```
Expected: FAIL — link vẫn trỏ `/#bang-gia`, `/#faq`, `/#dieu-khoan`.

- [ ] **Step 3: Polyfill `scrollIntoView` cho jsdom**

Sửa `frontend/src/test/setup.ts`, thêm vào khối `beforeAll` hiện có:

```ts
  // jsdom chưa implement `Element.scrollIntoView` — `AppLink` và deep-link của
  // feed gọi nó để cuộn tới anchor → `TypeError` làm hỏng test. Polyfill tối
  // thiểu: hàm rỗng (test chỉ cần biết có gọi được).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }
```

- [ ] **Step 4: Sửa `AppLink.tsx`**

Sửa `frontend/src/components/AppLink.tsx`:
- **Đổi** deps của effect: `[location.pathname, location.hash]` → `[location.pathname, location.hash, location.key]`.
  - Lý do: bấm lại **cùng** một anchor khi đang đứng ở `/tim-san` sẽ không đổi `pathname`/`hash` ⇒ effect không chạy ⇒ không cuộn. `location.key` của React Router đổi mỗi lần điều hướng nên luôn kích hoạt lại.
- **Thêm** comment tiếng Việt giải thích điều đó.

- [ ] **Step 5: Sửa `Header.tsx`**

Trong `frontend/src/components/Header.tsx`:
- **Thêm** `import { AppLink } from './AppLink';`
- **Thay** mọi `<Link>` nội bộ của react-router bằng `<AppLink>` (brand, 3 link nav, link trong menu user, "Đăng nhập", "Đăng ký"). `useNavigate` cho logout **giữ nguyên**.
- **Đổi** đích 2 link anchor:
  - `<AppLink to="/tim-san#bang-gia" className="hdr__navlink">Bảng giá</AppLink>`
  - `<AppLink to="/tim-san#faq" className="hdr__navlink hdr__navlink--secondary">Hỗ trợ</AppLink>`
- **Xoá** comment cũ nói "Điều hướng về trang chủ rồi cuộn tới anchor" và thay bằng comment mới giải thích section đã chuyển sang `/tim-san`.
- **Xoá** import `Link` khỏi `react-router-dom` nếu không còn dùng (giữ `useNavigate`).

- [ ] **Step 6: Sửa `Footer.tsx`**

Trong `frontend/src/components/Footer.tsx`:
- **Thay** `import { Link } from 'react-router-dom'` → `import { AppLink } from './AppLink';`
- **Đổi** `PRODUCT_LINKS`:
  ```tsx
  const PRODUCT_LINKS: FooterLink[] = [
    {label: 'Tìm sân cầu lông', to: '/tim-san'},
    {label: 'Hướng dẫn đặt sân', to: '/tim-san#faq'},
    {label: 'Cổng thanh toán', to: '/tim-san#faq'},
  ];
  ```
- **Đổi** `SUPPORT_LINKS`:
  ```tsx
  const SUPPORT_LINKS: FooterLink[] = [
    {label: 'Liên hệ', href: 'mailto:hotro@caulongdee.example'},
    {label: 'Điều khoản', to: '/tim-san#dieu-khoan'},
    {label: 'Chính sách', to: '/tim-san#chinh-sach'},
  ];
  ```
- **Đổi** trong `FooterLinkItem`: `<Link to={link.to} className={className}>` → `<AppLink to={link.to} className={className}>`.

- [ ] **Step 7: Chạy test để xác nhận PASS**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/components/Header.test.tsx src/components/Footer.test.tsx
```
Expected: 4 test PASS.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/components/Header.tsx frontend/src/components/Footer.tsx frontend/src/components/AppLink.tsx frontend/src/test/setup.ts frontend/src/components/Header.test.tsx frontend/src/components/Footer.test.tsx
git commit -m "fix(frontend): link anchor trong header/footer cuộn tới section trên /tim-san"
```

---

## Task 5: Link nội bộ trong section landing trỏ `#ket-qua`

**Files:**
- Modify: `frontend/src/components/FeaturedCourts.tsx`
- Modify: `frontend/src/components/PricingSection.tsx`
- Modify: `frontend/src/components/CitiesSection.tsx`
- Modify: `frontend/src/components/FaqSection.tsx`
- Modify: `frontend/src/components/FaqSection.css`
- Test: `frontend/src/pages/CourtDiscovery.test.tsx` (bổ sung assertion)

**Interfaces:**
- Consumes: anchor `ket-qua` do Task 3 tạo.
- Produces: mọi link "đi tìm sân" bên trong landing section trỏ `/tim-san#ket-qua` thay vì `/tim-san`.

> **Vì sao bắt buộc:** các section này **đã nằm trong** `/tim-san`. Link `to="/tim-san"` khi đang ở `/tim-san` là no-op của React Router → URL không đổi, trang không cuộn → người dùng bấm nút mà không có gì xảy ra.

- [ ] **Step 1: Bổ sung assertion thất bại**

Trong `frontend/src/pages/CourtDiscovery.test.tsx`, thêm test mới vào `describe`:

```tsx
  it('không còn link nào tới /tim-san mà thiếu hash', () => {
    const {container} = renderPage();
    // Link `to="/tim-san"` khi đang đứng ở `/tim-san` là no-op của React
    // Router: URL không đổi, trang không cuộn → người dùng bấm mà không có
    // gì xảy ra. Mọi link nội bộ tới trang tìm sân phải kèm hash.
    const anchors = Array.from(container.querySelectorAll('a[href*="/tim-san"]'));
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a.getAttribute('href')).toMatch(/#/);
    }
  });

  it('có link đi tới kết quả tìm sân', () => {
    const {container} = renderPage();
    const toResults = Array.from(
      container.querySelectorAll('a[href*="/tim-san#ket-qua"]'),
    );
    expect(toResults.length).toBeGreaterThan(0);
  });
});

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/pages/CourtDiscovery.test.tsx
```
Expected: FAIL — có link `href="/tim-san"` không chứa `#`.

- [ ] **Step 3: Đổi đích link trong 4 section**

- `FeaturedCourts.tsx`: link "Xem tất cả" `<Link to="/tim-san">` → `<AppLink to="/tim-san#ket-qua">`; `ClickableCard ... href="/tim-san"` (thẻ dẫn nhập + 4 thẻ phụ) → `href="/tim-san#ket-qua"`.
- `PricingSection.tsx`: `<Button label="Xem sân theo ca này" variant="secondary" href="/tim-san" />` → `href="/tim-san#ket-qua"`.
- `CitiesSection.tsx`: `ClickableCard ... href="/tim-san"` (5 thẻ thành phố) → `href="/tim-san#ket-qua"`.
- `FaqSection.tsx`: `<Button label="Tìm sân trống" variant="primary" href="/tim-san" />` → `href="/tim-san#ket-qua"`.

> **Lưu ý — phải dùng `AppLink` cho link "Xem tất cả" của `FeaturedCourts`:** nó đang dùng `Link` thuần của react-router ⇒ React Router **không** cuộn tới hash (chỉ `AppLink` mới có effect hash-scroll, xem Task 4 Step 4). Đổi sang `AppLink` (import từ `./AppLink`) và đổi `Link` của react-router thành `AppLink` cho toàn bộ file.
>
> `ClickableCard` / `Button` của Astryx đã đi qua `LinkProvider` → `AppLink` trong `main.tsx`, nên `href="/tim-san#ket-qua"` của chúng tự động có hash-scroll.

- [ ] **Step 4: Thêm `scroll-margin-top` cho các anchor trong FAQ**

Trong `frontend/src/components/FaqSection.css`:
- Thêm vào `.faq`: `scroll-margin-top: 80px;` (anchor `#faq` không bị header sticky che).
- Thêm khối mới:
```css
/* Các khối điều khoản / chính sách trong FAQ cũng là đích của anchor
   (#dieu-khoan, #chinh-sach) → cần neo khỏi header sticky. */
.faq__terms {
  scroll-margin-top: 80px;
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run src/pages/CourtDiscovery.test.tsx
```
Expected: 4 test PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/FeaturedCourts.tsx frontend/src/components/PricingSection.tsx frontend/src/components/CitiesSection.tsx frontend/src/components/FaqSection.tsx frontend/src/components/FaqSection.css frontend/src/pages/CourtDiscovery.test.tsx
git commit -m "fix(frontend): link trong landing section trỏ tới kết quả tìm sân"
```

---

## Task 6: Verify toàn diện + cập nhật README

**Files:**
- Modify: `README.md` (mục "📈 Tiến trình dự án")

**Interfaces:**
- Consumes: toàn bộ thay đổi Task 1–5.
- Produces: bản build pass + README cập nhật.

- [ ] **Step 1: Chạy type-check**

```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
```
Expected: không có output lỗi, exit code 0.

- [ ] **Step 2: Chạy toàn bộ test**

```powershell
cd frontend
npm run test
```
Expected: tất cả PASS — 46 test cũ + 14 test mới (Home 3 · Hero 2 · CourtDiscovery 5 · Header 2 · Footer 2) = **60 test**.

- [ ] **Step 3: Build**

```powershell
cd frontend
npm run build
```
Expected: build thành công, không lỗi.

- [ ] **Step 4: Kiểm tra bằng browser**

```powershell
cd frontend
npm run dev
```

Mở `http://localhost:5173/`:
- Trang chủ **chỉ** có feed (dải khoảnh khắc + composer + 4 tab + danh sách bài + sidebar). **Không** có Hero, không "Sân cầu lông nổi bật hôm nay", không "Bảng giá", không FAQ.

Mở `http://localhost:5173/tim-san`:
- Trên cùng: banner slideshow + thanh tìm nhanh + breadcrumb + bộ lọc + danh sách sân + bản đồ.
- Dưới cùng: Hero (không cao 1 màn hình, không có ô tìm kiếm) → Sân nổi bật → Bảng giá → Thành phố → FAQ.
- **Đếm** `role="search"` bằng DevTools: phải đúng **1**.

Bấm "Bảng giá" ở Header → phải **cuộn tới** khối "Bảng giá đặt sân theo khung giờ" (không chỉ đổi URL).
Bấm "Hỗ trợ" ở Header → phải cuộn tới FAQ.
Bấm "Điều khoản" ở Footer → phải cuộn tới khối "Điều khoản đặt sân".
Bấm "Xem sân theo ca này" trong Bảng giá → phải cuộn lên khối danh sách sân.

- [ ] **Step 5: Cập nhật `README.md`**

Trong mục "### Giai đoạn 3 — Tìm & đặt sân (Khách)":
- Sửa hàng `3.1` thành: `| 3.1 | Trang tìm sân `/tim-san` + banner + tìm sân nhanh | ✅ |`
- Thêm hàng mới sau `3.11`:
  `| 3.12 | Trang chủ chỉ là bảng tin cộng đồng — landing (hero, sân nổi bật, bảng giá, thành phố, FAQ) chuyển sang trang tìm sân | ✅ |`

Không sửa mục "🌐 API Endpoints" (không có endpoint mới) và không sửa mục "🚀 Công nghệ sử dụng" (không thêm dependency).

- [ ] **Step 6: Commit**

```powershell
git add README.md
git commit -m "docs: cập nhật tiến trình dự án sau khi tách trang chủ và trang tìm sân"
```

---

## Ghi chú cho người thực thi

- Thứ tự Task 1 → 2 → 3 → 4 → 5 là bắt buộc: Task 3 dùng `Hero` đã rút gọn (Task 2) và tạo anchor `ket-qua` mà Task 5 trỏ tới.
- Task 4 và Task 5 độc lập với nhau về mặt code, nhưng cùng đụng file test `CourtDiscovery.test.tsx` — nếu chạy song song, làm tuần tự.
- Nếu một bước test FAIL không đúng lý do đã nêu, **dừng lại** và tìm hiểu trước khi sửa tiếp — không sửa cho xanh.

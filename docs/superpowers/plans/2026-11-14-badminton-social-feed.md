# Trang chủ dạng feed cộng đồng cầu lông — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến trang chủ `/` của Cầu Lông dee thành một feed cộng đồng 2 cột (kiểu Facebook) cho phép người dùng đăng bài xét kèo, tuyển người đánh, cảm nghĩ và chia sẻ sân — bằng dữ liệu demo ở giai đoạn 1.

**Architecture:** Frontend-only. Một thư mục `src/components/feed/` chứa các component feed, dùng **mô hình lai** của dự án: component Astryx (`Card`, `Avatar`, `TabList`, `Dialog`, `Toast`, `Button`, `IconButton`, `TextArea`, `RadioList`) làm khung + file `.css` riêng cho bố cục Facebook đặc thù. Toàn bộ state (posts, like, tab lọc) nằm trong `Feed.tsx`. Màu Facebook đưa vào `localTokens` của theme `caulongdee` để không hardcode hex trong CSS.

**Tech Stack:** React 19 · TypeScript 7 · Vite 8 · `@astryxdesign/core` 0.7.13 · `lucide-react` 1.55 · `framer-motion` 14 · Vitest 5 + Testing Library 16 (đã cài trong `node_modules`, thiếu khai báo ở `package.json`)

**Spec:** `docs/superpowers/specs/2026-11-14-badminton-social-feed-design.md`

---

## Global Constraints

- **Trả lời và comment bằng tiếng Việt.** Tên biến/hàm/class viết tiếng Anh.
- **Không dùng `any`** trong TypeScript. Mọi payload có type riêng.
- **Không thêm dependency runtime mới.** `lucide-react` đã có sẵn — dùng nó, không thêm thư viện icon khác.
- **CSS đi cùng file component** (`Component.tsx` + `Component.css`), theo `.cursor/rules/frontend-conventions.mdc`. Mọi rule CSS của app nằm trong `@layer app` để không đè lên component Astryx.
- **Không hardcode màu trong CSS của component.** Màu Facebook khai báo trong `src/themes/caulongdee/caulongdeeTheme.ts` (`localTokens`), dùng qua `var(--fb-*)`.
- **Sau khi sửa `caulongdeeTheme.ts` phải chạy lại `npm run astryx -- theme build src/themes/caulongdee/caulongdeeTheme.ts`** — file `caulongdee.css` và `caulongdee.js` là output máy sinh, không sửa tay.
- **Icon cụ thể** (đã chốt trong spec §4): `Zap` = xét kèo · `UserPlus` = tuyển người · `Feather` = cảm nghĩ · `MapPin` = sân · `Trophy` = đánh đôi · `Heart` = thích · `MessageCircle` = bình luận · `Share2` = chia sẻ · `Calendar` = hôm nay · `Search` = tìm · `Star` = yêu thích · `Plus` = thêm · `Ellipsis` = menu · `Image` = ảnh/video.
- **4 loại bài**: `challenge` (XÉT KÈO) · `recruit` (TUYỂN NGƯỜI ĐÁNH) · `thought` (CẢM NGHĨ) · `court` (SÂN CẦU LÔNG).
- **4 tab lọc**: Tất cả · Tuyển người đánh · Xét kèo · Cảm nghĩ. Bài `court` chỉ hiện ở tab "Tất cả".
- **Stories là "khoảnh khắc"** (ảnh của người chơi), story đầu là ô "Thêm khoảnh khắc".
- **8 bài demo**, sắp xếp mới nhất trước, trộn đều 4 loại. Đánh dấu "DEMO" **chỉ bằng comment đầu file**, không badge UI.
- **Khách chưa đăng nhập** xem feed bình thường; bấm composer / "Đăng bài" → toast "Hãy đăng nhập để đăng bài" kèm nút dẫn `/dang-nhap`. Không tự chuyển hướng.
- **Nút chưa làm** (Bình luận, Ảnh/Video, menu `⋯`) → toast "Tính năng này sẽ có ở giai đoạn sau". Không im lặng, không disable.
- **Chia sẻ** copy link `/?post={id}`; trang đọc param `post` và scroll tới bài tương ứng, bài không tồn tại thì bỏ qua.
- **Giữ nguyên** `Hero`, `FeaturedCourts`, `PricingSection` (`#bang-gia`), `CitiesSection`, `FaqSection` (`#faq`) ở **dưới feed**. Không sửa `Header.tsx`, `Footer.tsx`.
- **Bố cục**: shell `max-width: 1280px`, lưới `minmax(0,1fr) 320px`, gap 24px; feed `max-width: 700px`; sidebar `position: sticky; top: 84px`. ≤1100px → 1 cột (680px). ≤600px → card full-bleed bo góc 0.
- **Verify**: `npm run test` (test) · `.\node_modules\.bin\tsc --noEmit` · `npm run build` — cả 3 phải pass trước khi báo xong.

---

## Review Focus

Những input/điều kiện mà spec nói "phải" nhưng không task nào test trực tiếp — mỗi dòng dưới đây được gắn vào task sở hữu code:

1. **Bài mới đăng phải xuất hiện ở đầu feed** và phải hiện ở tab "Tất cả" khi đang lọc theo tab khác → test ở Task 8.
2. **Like phải là toggle, không phải bộ đếm tăng vô hạn**: bấm 2 lần trở về số ban đầu, trạng thái điện tử → test ở Task 3 và Task 8.
3. **Nội dung trắng không được đăng** — nút "Đăng bài" phải disable → test ở Task 6.
4. **Nội dung dài hơn 500 ký tự phải bị chặn** (bộ đếm của `TextArea maxLength` cảnh báo, nút Đăng bài disable) → test ở Task 6.
5. **Deep-link `?post={id}` với id không tồn tại không được làm hỏng trang** — feed vẫn render bình thường, không throw → test ở Task 8.
6. **`navigator.clipboard` không tồn tại (trình duyệt cũ, HTTP, test jsdom)** → `handleShare` phải bắt lỗi và hiện toast lỗi, không throw ra console → test ở Task 8.

---

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `frontend/package.json` | **Sửa** — thêm script `test` / `test:watch` + khai báo devDeps đã cài trong `node_modules` |
| `frontend/vitest.config.ts` | **Đã có** — cấu hình Vitest + jsdom + setup file |
| `frontend/src/test/setup.ts` | **Đã có** — jest-dom + polyfill `HTMLDialogElement.showModal/close` |
| `frontend/src/themes/caulongdee/caulongdeeTheme.ts` | **Sửa** — thêm `localTokens` màu Facebook |
| `frontend/src/themes/caulongdee/caulongdee.css` + `.js` | **Sinh máy** — regenerate bằng `astryx theme build` |
| `frontend/src/data/demoPosts.ts` | **Đã có** — types + `DEMO_POSTS` + `DEMO_STORIES` + `DEMO_PLAYERS` + `DEMO_SUGGESTED` |
| `frontend/src/data/demoPosts.test.ts` | **Đã có** — test tính toàn vẹn dữ liệu |
| `frontend/src/components/feed/feedUtils.ts` | **Đã có** — hàm thuần: lọc bài, toggle like, tạo bài mới |
| `frontend/src/components/feed/feedUtils.test.ts` | **Đã có** — test hàm thuần |
| `frontend/src/components/feed/feed.css` | **Mới** — token cục bộ + class dùng chung cho mọi component feed |
| `frontend/src/components/feed/FeedStories.tsx` + `.css` | **Mới** — dải stories "khoảnh khắc" + overlay xem ảnh to |
| `frontend/src/components/feed/FeedComposer.tsx` + `.css` | **Mới** — ô viết bài + 3 nút hành động nhanh |
| `frontend/src/components/feed/FeedTabs.tsx` + `.css` | **Mới** — 4 tab lọc (`TabList` của Astryx) |
| `frontend/src/components/feed/FeedPostCard.tsx` + `.css` | **Mới** — 1 bài viết + nhãn loại + thanh tương tác |
| `frontend/src/components/feed/FeedSidebar.tsx` + `.css` | **Mới** — 4 khối sidebar |
| `frontend/src/components/feed/FeedComposerModal.tsx` + `.css` | **Mới** — modal đăng bài (`Dialog` của Astryx) |
| `frontend/src/components/feed/Feed.tsx` | **Mới** — container tổng hợp, giữ toàn bộ state |
| `frontend/src/pages/Home.tsx` | **Sửa** — render feed ở trên, giữ nguyên landing sections ở dưới |
| `frontend/src/pages/Home.css` | **Sửa** — thêm rule cho wrapper `.home-feed` |
| `frontend/src/main.tsx` | **Sửa** — bọc app bằng `LayerProvider` để Toast có viewport thật |

---

## Task 1: Khai báo hạ tầng test trong `package.json`

`node_modules` đã có `vitest`, `jsdom`, `@testing-library/*` (do `package-lock.json` đã cập nhật) nhưng `package.json` **chưa khai báo** → `npm ci` trên máy khác sẽ thiếu. Task này đồng bộ manifest và thêm script test.

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: không có.
- Produces: script `npm run test` chạy `vitest run`; script `npm run test:watch` chạy `vitest`. devDependencies khai báo đúng version đang có trong `node_modules`: `vitest ^5.1.0`, `jsdom ^31.0.1`, `@testing-library/dom ^10.4.1`, `@testing-library/jest-dom ^7.0.1`, `@testing-library/react ^16.3.3`, `@testing-library/user-event ^14.6.10`.

- [ ] **Step 1: Thêm script vào `package.json`**

Trong mảng `scripts`, thêm ngay sau `"lint"`:

```json
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 2: Thêm devDependencies**

Trong mảng `devDependencies`, thêm (giữ thứ tự alphabet như file hiện có — `@astryxdesign/cli` trước, `@testing-library/*` sau, `vitest` ở cuối cùng sau `vite`):

```json
"@testing-library/dom": "^10.4.1",
"@testing-library/jest-dom": "^7.0.1",
"@testing-library/react": "^16.3.3",
"@testing-library/user-event": "^14.6.10",
"jsdom": "^31.0.1",
"vitest": "^5.1.0"
```

- [ ] **Step 3: Kiểm tra manifest khớp lock file**

Run: `cd frontend && npm ls vitest jsdom @testing-library/react --depth=0`
Expected: mỗi package in ra version **không có** chữ `invalid` hoặc `UNMET DEPENDENCY`. Nếu có `UNMET`, chạy `npm install` để đồng bộ `package-lock.json`.

- [ ] **Step 4: Chạy test để xác nhận script hoạt động**

Run: `cd frontend && npm run test`
Expected: `Test Files 2 passed (2)` / `Tests 18 passed (18)` (test hiện có: `demoPosts.test.ts` + `feedUtils.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): khai báo script test và devDependencies Vitest"
```

---

## Task 2: Token màu Facebook trong theme Astryx

Feed cần bảng màu Facebook (#1877F2…) nhưng quy tắc Astryx cấm hex rải rác trong CSS và yêu cầu palette đi qua theme. Token phải nằm trong theme để `astryx theme build` sinh ra CSS.

> Hiện trạng: `caulongdee.css` / `caulongdee.js` **đã có** 14 token `--fb-*` (sửa tay ở phiên trước), nhưng file nguồn `caulongdeeTheme.ts` **chưa có** → build lại sẽ xoá mất token. Task này đưa token về đúng file nguồn rồi build lại.

**Files:**
- Modify: `frontend/src/themes/caulongdee/caulongdeeTheme.ts` (khối `localTokens`)
- Regenerate: `frontend/src/themes/caulongdee/caulongdee.css`, `caulongdee.js`

**Interfaces:**
- Consumes: không có.
- Produces: các CSS custom property sau tồn tại trong theme scope, dùng được bằng `var(--fb-*)`:
  `--fb-blue` `#1877F2` · `--fb-blue-hover` `#166FE5` · `--fb-blue-soft` `#E8F0FE`
  `--fb-green` `#1A7F37` · `--fb-green-soft` `#E7F6EC`
  `--fb-orange` `#C2410C` · `--fb-orange-soft` `#FFF1E6`
  `--fb-slate` `#475467` · `--fb-slate-soft` `#EEF1F6`
  `--fb-bg` `#F0F2F5` · `--fb-line` `#E4E6EB`
  `--fb-ink-0` `#050505` · `--fb-ink-1` `#65676B` · `--fb-ink-2` `#8A8D91`
  `--fb-radius-card` `12px` · `--fb-radius-ctl` `8px`

  **Vì sao thêm 2 token bo góc:** spec §5.2 yêu cầu `--r-card: 12px` và `--r-ctl: 8px`. Token `--radius-container` của theme Astryx là `29px` — quá tròn so với Facebook. Không thể dùng token có sẵn nên phải khai báo token riêng.

- [ ] **Step 1: Thêm localTokens vào `caulongdeeTheme.ts`**

Trong `localTokens`, bên cạnh `--cl-teal` / `--cl-teal-hover`, thêm đúng 16 token với giá trị ở Interfaces. Giữ nguyên style 2 space + comment tiếng Việt như file hiện có.

- [ ] **Step 2: Sinh lại CSS theme**

Run: `cd frontend && npm run astryx -- theme build src/themes/caulongdee/caulongdeeTheme.ts`
Expected: build thành công, `caulongdee.css` và `caulongdee.js` được ghi lại.

- [ ] **Step 3: Xác nhận token có trong CSS sinh ra**

Run: `cd frontend && node -e "const c=require('fs').readFileSync('src/themes/caulongdee/caulongdee.css','utf8');const need=['--fb-blue:','--fb-blue-soft:','--fb-green:','--fb-orange:','--fb-slate:','--fb-bg:','--fb-line:','--fb-ink-0:','--fb-ink-2:','--fb-radius-card:','--fb-radius-ctl:'];const miss=need.filter(t=>!c.includes(t));if(miss.length){console.error('MISSING',miss);process.exit(1)}console.log('OK — đủ 11 token')"`
Expected: `OK — đủ 11 token`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/themes/caulongdee/
git commit -m "feat(frontend): đưa token màu Facebook vào theme caulongdee và build lại"
```

---

## Task 3: CSS chung + component FeedPostCard

Card bài viết là khối được nhìn nhiều nhất — làm trước để các task sau có mẫu tham chiếu.

**Files:**
- Create: `frontend/src/components/feed/feed.css`
- Create: `frontend/src/components/feed/FeedPostCard.tsx`
- Create: `frontend/src/components/feed/FeedPostCard.css`
- Test: `frontend/src/components/feed/FeedPostCard.test.tsx`

**Interfaces:**
- Consumes: `FeedPost`, `POST_CATEGORY_LABEL` từ `src/data/demoPosts.ts`; `Card`, `Avatar`, `IconButton`, `Text` của `@astryxdesign/core`; icon `lucide-react`.
- Produces:
  ```tsx
  export type FeedPostCardProps = {
    post: FeedPost;
    isLiked: boolean;
    onToggleLike: (postId: string) => void;
    onShare: (postId: string) => void;
    onUnavailableFeature: (featureName: string) => void;
  };
  export function FeedPostCard(props: FeedPostCardProps): JSX.Element;
  ```
  Nhãn loại bài dùng class `feed-tag--<category>` (kebab-case của `PostCategory`) để CSS tô màu.
  Icon nhãn: `challenge` → `Zap`, `recruit` → `UserPlus`, `thought` → `Feather`, `court` → `MapPin`.

  **Ràng buộc API Astryx đã kiểm chứng:** `IconButton` kế thừa `ButtonProps` mà `ButtonProps extends BaseProps<HTMLButtonElement>` → `BaseProps extends React.HTMLAttributes` → **không** có `aria-pressed` trong type. Vì vậy nút Thích phải là `<button>` HTML thuần với `aria-pressed`, **không** dùng `IconButton` cho nút Thích. `IconButton` chỉ dùng cho nút menu `⋯`.

- [ ] **Step 1: Viết test render**

Tạo `frontend/src/components/feed/FeedPostCard.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {DEMO_POSTS} from '../../data/demoPosts';
import {FeedPostCard} from './FeedPostCard';

const post = DEMO_POSTS[0];

function renderCard(overrides: Partial<React.ComponentProps<typeof FeedPostCard>> = {}) {
  const props = {
    post,
    isLiked: false,
    onToggleLike: vi.fn(),
    onShare: vi.fn(),
    onUnavailableFeature: vi.fn(),
    ...overrides,
  };
  return {props, ...render(<FeedPostCard {...props} />)};
}

describe('FeedPostCard', () => {
  it('hiện tên tác giả và nội dung bài', () => {
    renderCard();
    expect(screen.getByText(post.authorName)).toBeInTheDocument();
    expect(screen.getByText(post.content)).toBeInTheDocument();
  });

  it('hiện nhãn loại bài tương ứng', () => {
    renderCard();
    expect(screen.getByText('TUYỂN NGƯỜI ĐÁNH')).toBeInTheDocument();
  });

  it('bấm Thích gọi onToggleLike với id bài', async () => {
    const user = userEvent.setup();
    const {props} = renderCard();
    await user.click(screen.getByRole('button', {name: /thích/i}));
    expect(props.onToggleLike).toHaveBeenCalledWith(post.id);
  });

  it('bài đã thích có nút Thích ở trạng thái aria-pressed', () => {
    renderCard({isLiked: true});
    expect(screen.getByRole('button', {name: /thích/i})).toHaveAttribute('aria-pressed', 'true');
  });

  it('bấm Chia sẻ gọi onShare với id bài', async () => {
    const user = userEvent.setup();
    const {props} = renderCard();
    await user.click(screen.getByRole('button', {name: /chia sẻ/i}));
    expect(props.onShare).toHaveBeenCalledWith(post.id);
  });

  it('bấm Bình luận gọi onUnavailableFeature với tên tính năng', async () => {
    const user = userEvent.setup();
    const {props} = renderCard();
    await user.click(screen.getByRole('button', {name: /bình luận/i}));
    expect(props.onUnavailableFeature).toHaveBeenCalledWith('Bình luận');
  });

  it('bài có ảnh thì render thẻ ảnh', () => {
    const withImage = DEMO_POSTS.find((p) => p.image);
    renderCard({post: withImage!});
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('bài không ảnh thì không có thẻ ảnh', () => {
    const withoutImage = DEMO_POSTS.find((p) => !p.image);
    renderCard({post: withoutImage!});
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd frontend && npm run test`
Expected: FAIL — `Cannot find module './FeedPostCard'`

- [ ] **Step 3: Tạo `feed.css` — token + class dùng chung**

Đặt trong `@layer app` (như `FeaturedCourts.css`) để không đè lên component Astryx. Nội dung:

```css
/* Feed cộng đồng — bảng màu Facebook, dùng token từ theme caulongdee */
@layer app {
.feed-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--s-6);
  align-items: start;
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--s-6);
}

.feed-col {
  max-width: 700px;
  width: 100%;
  margin: 0 auto;
}

.feed-side {
  position: sticky;
  top: 84px;
  display: grid;
  gap: var(--s-4);
}

.feed-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.feed-tag--challenge { background: var(--fb-orange-soft); color: var(--fb-orange); }
.feed-tag--recruit   { background: var(--fb-green-soft);  color: var(--fb-green); }
.feed-tag--thought   { background: var(--fb-slate-soft);  color: var(--fb-slate); }
.feed-tag--court     { background: var(--fb-blue-soft);   color: var(--fb-blue); }

/* Mọi card của feed dùng bo góc 12px (--fb-radius-card) thay vì
   --radius-container của theme (29px — quá tròn so với Facebook). */
.feed-col > *,
.feed-side > * {
  border-radius: var(--fb-radius-card);
}

@media (max-width: 1100px) {
  .feed-shell { grid-template-columns: minmax(0, 1fr); }
  .feed-col { max-width: 680px; }
  .feed-side { position: static; max-width: 680px; margin: 0 auto; width: 100%; }
}

@media (max-width: 600px) {
  .feed-shell { padding: var(--s-3) 0; }
  .feed-col, .feed-side { max-width: 100%; }
}
}
```

- [ ] **Step 4: Tạo `FeedPostCard.tsx`**

Dùng `Card` của Astryx bọc nội dung (`variant="default"`, `padding={0}` để tự kiểm soát padding trong CSS). Bố cục:
- Header: `Avatar` (props `name={post.authorName}`, `size="md"`) + `VStack` chứa tên tác giả (`Text weight="semibold"`) và dòng meta `{post.createdAtLabel} · Cầu Lông dee` (`Text type="supporting" color="secondary"`); bên phải `IconButton` với icon `Ellipsis`, `label="Tuỳ chọn bài viết"`, `variant="ghost"` → gọi `onUnavailableFeature('Tuỳ chọn bài viết')`.
- Nhãn loại: `<span className={`feed-tag feed-tag--${post.category}`}>` + icon + `POST_CATEGORY_LABEL[post.category]`.
- Nội dung: `<p>` bọc trong `Text` (`type="body"`) — hiển thị `post.content`.
- Ảnh: nếu `post.image` → `<img src={post.image} alt={post.imageAlt ?? ''} />` bọc trong `<div className="feed-post__media">`; `alt` phải có (không rỗng nếu ảnh mang thông tin).
- Thanh thống kê: `{post.likeCount} người thích · {post.commentCount} bình luận` và `{post.shareCount} lượt chia sẻ`.
- Thanh hành động: 3 `<button>` HTML thuần (không phải `IconButton` — xem ràng buộc API ở Interfaces):
  - Thích: icon `Heart`, `aria-label="Thích"`, `aria-pressed={isLiked}` → `onToggleLike(post.id)`
  - Bình luận: icon `MessageCircle`, `aria-label="Bình luận"` → `onUnavailableFeature('Bình luận')`
  - Chia sẻ: icon `Share2`, `aria-label="Chia sẻ"` → `onShare(post.id)`

- [ ] **Step 5: Tạo `FeedPostCard.css`**

Bố cục card: header flex, khoảng cách 12px, tên/meta xám, nhãn loại bo tròn, ảnh `width: 100%; max-height: 520px; object-fit: cover; display: block`, thanh thống kê `font-size: 13px; color: var(--fb-ink-2)`, đường kẻ `1px solid var(--fb-line)`, 3 nút hành động chia đều `flex: 1`, bo góc `var(--fb-radius-card)`. Nút Thích khi `aria-pressed="true"` → `color: var(--fb-blue)`.

- [ ] **Step 6: Chạy test để xác nhận pass**

Run: `cd frontend && npm run test`
Expected: tất cả test trong `FeedPostCard.test.tsx` PASS.

- [ ] **Step 7: Kiểm tra type**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không có lỗi.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/feed/
git commit -m "feat(frontend): thêm component card bài viết cho feed"
```

---

## Task 4: Component FeedTabs (lọc theo loại)

**Files:**
- Create: `frontend/src/components/feed/FeedTabs.tsx`
- Create: `frontend/src/components/feed/FeedTabs.css`
- Test: `frontend/src/components/feed/FeedTabs.test.tsx`

**Interfaces:**
- Consumes: `TabList`, `Tab` của `@astryxdesign/core/TabList`; `FeedFilter` từ `./feedUtils`.
- Produces:
  ```tsx
  export type FeedTabsProps = {
    value: FeedFilter;
    onChange: (filter: FeedFilter) => void;
  };
  export function FeedTabs(props: FeedTabsProps): JSX.Element;
  ```
  Giá trị tab: `'all' | 'recruit' | 'challenge' | 'thought'` — nhãn: "Tất cả", "Tuyển người đánh", "Xét kèo", "Cảm nghĩ".
  `TabList` yêu cầu `value: string` + `onChange: (value: string) => void` → ép kiểu ở biên: `onChange={(v) => onChange(v as FeedFilter)}`.

- [ ] **Step 1: Viết test**

Tạo `frontend/src/components/feed/FeedTabs.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {FeedTabs} from './FeedTabs';

describe('FeedTabs', () => {
  it('hiện đủ 4 tab', () => {
    render(<FeedTabs value="all" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', {name: 'Tất cả'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Tuyển người đánh'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Xét kèo'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Cảm nghĩ'})).toBeInTheDocument();
  });

  it('tab đang chọn có aria-selected true', () => {
    render(<FeedTabs value="challenge" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', {name: 'Xét kèo'})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', {name: 'Tất cả'})).toHaveAttribute('aria-selected', 'false');
  });

  it('bấm tab khác gọi onChange với giá trị tương ứng', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FeedTabs value="all" onChange={onChange} />);
    await user.click(screen.getByRole('tab', {name: 'Cảm nghĩ'}));
    expect(onChange).toHaveBeenCalledWith('thought');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd frontend && npm run test`
Expected: FAIL — `Cannot find module './FeedTabs'`

- [ ] **Step 3: Tạo `FeedTabs.tsx`**

Dùng `TabList` của Astryx: `<TabList value={value} onChange={(v) => onChange(v as FeedFilter)} aria-label="Lọc bài viết">` với 4 `<Tab value="..." label="..." />`. Bọc trong `Card variant="transparent" padding={0}` để có đường kẻ dưới như mockup.

- [ ] **Step 4: Tạo `FeedTabs.css`**

`.feed-tabs` = container; đường kẻ dưới `1px solid var(--fb-line)`; padding ngang 4px. Tab font 15px weight 600. Ở ≤600px font 13px, padding 12px 4px.

- [ ] **Step 5: Chạy test để xác nhận pass**

Run: `cd frontend && npm run test`
Expected: tất cả test trong `FeedTabs.test.tsx` PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/feed/FeedTabs.tsx frontend/src/components/feed/FeedTabs.css frontend/src/components/feed/FeedTabs.test.tsx
git commit -m "feat(frontend): thêm tab lọc bài theo loại"
```

---

## Task 5: Component FeedStories + FeedSidebar

**Files:**
- Create: `frontend/src/components/feed/FeedStories.tsx`
- Create: `frontend/src/components/feed/FeedStories.css`
- Create: `frontend/src/components/feed/FeedSidebar.tsx`
- Create: `frontend/src/components/feed/FeedSidebar.css`
- Test: `frontend/src/components/feed/FeedSidebar.test.tsx`

**Interfaces:**
- Consumes: `DEMO_STORIES`, `DEMO_PLAYERS`, `DEMO_SUGGESTED`; `Avatar`, `Card`, `Heading`, `Text`, `Dialog`, `DialogHeader` của Astryx; icon lucide; `AppLink` (`src/components/AppLink.tsx`) cho link `/tim-san`.
- Produces:
  ```tsx
  export type FeedStoriesProps = {
    onUnavailableFeature: (featureName: string) => void;
  };
  export function FeedStories(props: FeedStoriesProps): JSX.Element;
  export type FeedSidebarProps = {
    onUnavailableFeature: (featureName: string) => void;
  };
  export function FeedSidebar(props: FeedSidebarProps): JSX.Element;
  ```
  `FeedStories` tự quản lý state `selectedStory: FeedStory | null` và mở `Dialog` overlay xem ảnh to khi bấm vào 1 story (spec §5.7: "Click story → hiện overlay mô phỏng xem ảnh to"). Story `isAdd` không mở overlay — bấm nó gọi `onUnavailableFeature('Thêm khoảnh khắc')`.

  **Lưu ý về `authorInitials`:** spec §5.5 liệt kê field này trong `FeedPost`, nhưng `Avatar` của Astryx **tự tính initials từ `name`** (`name={post.authorName}`) → không cần field riêng. `demoPosts.ts` đã có sẵn mà không có field này, và test tính toàn vẹn dữ liệu đã pass → giữ nguyên, không thêm.

- [ ] **Step 1: Viết test sidebar**

Tạo `frontend/src/components/feed/FeedSidebar.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {DEMO_PLAYERS, DEMO_SUGGESTED} from '../../data/demoPosts';
import {FeedSidebar} from './FeedSidebar';

describe('FeedSidebar', () => {
  it('hiện đủ 4 người đang tuyển', () => {
    render(<FeedSidebar onUnavailableFeature={vi.fn()} />);
    for (const player of DEMO_PLAYERS) {
      expect(screen.getByText(player.name)).toBeInTheDocument();
    }
  });

  it('hiện đủ 3 gợi ý kết bạn', () => {
    render(<FeedSidebar onUnavailableFeature={vi.fn()} />);
    for (const person of DEMO_SUGGESTED) {
      expect(screen.getByText(person.name)).toBeInTheDocument();
    }
  });

  it('có link tới trang tìm sân', () => {
    render(<FeedSidebar onUnavailableFeature={vi.fn()} />);
    expect(screen.getByRole('link', {name: /tìm sân nhanh/i})).toHaveAttribute('href', '/tim-san');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd frontend && npm run test`
Expected: FAIL — `Cannot find module './FeedSidebar'`

- [ ] **Step 3: Tạo `FeedStories.tsx`**

`Card` bọc một hàng ngang cuộn được (`overflow-x: auto`). Mỗi story: khung ảnh 108×108 bo góc 12px viền 3px `--fb-blue`, `<img src={story.image} alt={story.name} />`, tên bên dưới (12px `--fb-ink-1`). Story đầu (`isAdd`) có nút tròn `Plus` ở góc dưới phải, màu `--fb-blue`, viền trắng 2px.

Bấm vào 1 story (không phải story `isAdd`) → mở `Dialog` overlay hiện ảnh to + tên. `Dialog` của Astryx yêu cầu `isOpen` + `onOpenChange`; dùng state `selectedStory: FeedStory | null` → `isOpen={selectedStory != null}`, `onOpenChange={(open) => !open && setSelectedStory(null)}`.

Bấm story `isAdd` → `onUnavailableFeature('Thêm khoảnh khắc')`.

**Vì cần callback mà `FeedStories` không có:** thêm prop vào interface:
```tsx
export type FeedStoriesProps = {
  onUnavailableFeature: (featureName: string) => void;
};
export function FeedStories(props: FeedStoriesProps): JSX.Element;
```

- [ ] **Step 4: Tạo `FeedStories.css`**

`.feed-stories` = flex, `gap: 12px`, `overflow-x: auto`, `padding: 14px 16px`. `.feed-story` = width 108px, flex `0 0 auto`, text-align center.

- [ ] **Step 5: Tạo `FeedSidebar.tsx`**

4 khối, mỗi khối một `Card`:
1. **Tìm sân nhanh** — `Heading level={3}` "Tìm sân nhanh" + `AppLink` (`href="/tim-san"`, `aria-label` chứa "Tìm sân nhanh") + 3 mục link (icon `Calendar` "Hôm nay" / `Trophy` "Đánh đôi tối nay" / `Star` "Sân được yêu thích").
2. **Đang tuyển người đánh** — `Heading level={3}` + 4 dòng: `Avatar` (size nhỏ, `name={player.name}`) + tên + dòng phụ `{player.gender} · {player.time} · {player.area}`.
3. **Bạn có thể quen** — `Heading level={3}` + 3 dòng: `Avatar` + tên + `{mutualCount} bạn chung`.
4. **Footer links** — dòng chữ nhỏ 12px `--fb-ink-2`: "Về Cầu Lông dee" · "Trợ giúp" · "Bảo mật" · "Điều khoản" · "Chính sách" · "Cookies", và dòng "Cầu Lông dee © 2026 · Đặt sân & kết nối người chơi".

- [ ] **Step 6: Tạo `FeedSidebar.css`**

Mỗi khối: `Card` padding 0 + padding trong cho tiêu đề và danh sách. Dòng sidebar: flex, gap 10px, padding 9px 16px, hover nền `--fb-bg`. Icon trong ô bo góc 9px nền `--fb-bg`.

- [ ] **Step 7: Chạy test để xác nhận pass**

Run: `cd frontend && npm run test`
Expected: tất cả test trong `FeedSidebar.test.tsx` PASS.

- [ ] **Step 8: Kiểm tra type**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không có lỗi.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/feed/
git commit -m "feat(frontend): thêm dải stories và sidebar cộng đồng cho feed"
```

---

## Task 6: Component FeedComposer + FeedComposerModal (đăng bài)

**Files:**
- Create: `frontend/src/components/feed/FeedComposer.tsx`
- Create: `frontend/src/components/feed/FeedComposer.css`
- Create: `frontend/src/components/feed/FeedComposerModal.tsx`
- Create: `frontend/src/components/feed/FeedComposerModal.css`
- Test: `frontend/src/components/feed/FeedComposer.test.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogHeader`, `TextArea`, `Button`, `RadioList`, `RadioListItem` của `@astryxdesign/core`; `Avatar`; `PostCategory`; `createPost` từ `./feedUtils`.
- Produces:
  ```tsx
  export type FeedComposerProps = {
    onOpenComposer: (category: PostCategory) => void;
    onUnavailableFeature: (featureName: string) => void;
  };
  export function FeedComposer(props: FeedComposerProps): JSX.Element;

  export type FeedComposerModalProps = {
    isOpen: boolean;
    initialCategory: PostCategory;
    authorName: string;
    onClose: () => void;
    onSubmit: (post: FeedPost) => void;
  };
  export function FeedComposerModal(props: FeedComposerModalProps): JSX.Element;
  ```
  `FeedComposerModal` chỉ gọi `onSubmit` khi nội dung trim khác rỗng; nút "Đăng bài" `isDisabled` khi rỗng.

  **Ràng buộc API Astryx đã kiểm chứng:**
  - `TextArea` có props `label` (bắt buộc), `maxLength`, `rows`, `value`, `onChange: (value: string, e) => void`. `maxLength` tự hiện bộ đếm ký tự và cảnh báo khi vượt — không cần tự viết bộ đếm.
  - `RadioList` yêu cầu `label: string` (bắt buộc), `value: string`, `onChange`; `RadioListItem` yêu cầu `label: ReactNode`, `value: string`. Render ra `role="radiogroup"` / `role="radio"` thật → test dùng `getByRole('radio', {name})`.
  - `Dialog` yêu cầu `isOpen` + `onOpenChange`. `Dialog` của Astryx gọi `HTMLDialogElement.showModal()` — jsdom chưa có, nhưng `src/test/setup.ts` **đã polyfill** sẵn.

- [ ] **Step 1: Viết test**

Tạo `frontend/src/components/feed/FeedComposer.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {FeedComposer} from './FeedComposer';
import {FeedComposerModal} from './FeedComposerModal';

describe('FeedComposer', () => {
  it('bấm ô viết bài gọi onOpenComposer với loại mặc định', async () => {
    const user = userEvent.setup();
    const onOpenComposer = vi.fn();
    render(<FeedComposer onOpenComposer={onOpenComposer} onUnavailableFeature={vi.fn()} />);
    await user.click(screen.getByRole('button', {name: /bạn muốn xét kèo hay tuyển người đánh cùng/i}));
    expect(onOpenComposer).toHaveBeenCalledWith('challenge');
  });

  it('bấm nút Tuyển người đánh mở modal với loại recruit', async () => {
    const user = userEvent.setup();
    const onOpenComposer = vi.fn();
    render(<FeedComposer onOpenComposer={onOpenComposer} onUnavailableFeature={vi.fn()} />);
    await user.click(screen.getByRole('button', {name: /tuyển người đánh/i}));
    expect(onOpenComposer).toHaveBeenCalledWith('recruit');
  });

  it('bấm nút Ảnh / Video báo tính năng chưa làm', async () => {
    const user = userEvent.setup();
    const onUnavailableFeature = vi.fn();
    render(<FeedComposer onOpenComposer={vi.fn()} onUnavailableFeature={onUnavailableFeature} />);
    await user.click(screen.getByRole('button', {name: /ảnh \/ video/i}));
    expect(onUnavailableFeature).toHaveBeenCalledWith('Ảnh / Video');
  });
});

describe('FeedComposerModal', () => {
  it('nút Đăng bài bị disable khi nội dung rỗng', () => {
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', {name: /đăng bài/i})).toBeDisabled();
  });

  it('gửi bài hợp lệ lên onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'Buổi tối ai rảnh đánh đôi với mình');
    await user.click(screen.getByRole('button', {name: /đăng bài/i}));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      category: 'challenge',
      content: 'Buổi tối ai rảnh đánh đôi với mình',
      authorName: 'Nguyễn Văn A',
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    });
  });

  it('chọn loại bài khác trước khi gửi thì category đổi theo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('radio', {name: /tuyển người đánh/i}));
    await user.type(screen.getByRole('textbox'), 'Cần 1 bạn chơi đôi tối mai');
    await user.click(screen.getByRole('button', {name: /đăng bài/i}));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({category: 'recruit'});
  });

  it('nội dung vượt 500 ký tự thì nút Đăng bài bị disable', async () => {
    const user = userEvent.setup();
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'a'.repeat(501));
    expect(screen.getByRole('button', {name: /đăng bài/i})).toBeDisabled();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd frontend && npm run test`
Expected: FAIL — `Cannot find module './FeedComposer'`

- [ ] **Step 3: Tạo `FeedComposer.tsx`**

- `Card` của Astryx, bên trong: hàng đầu gồm `Avatar` + một `button` có class `feed-composer__input` với nội dung chữ "Bạn muốn xét kèo hay tuyển người đánh cùng?" (`aria-label` khớp đúng câu đó) → gọi `onOpenComposer('challenge')`.
- Hàng dưới: 3 nút (`button` thường có icon lucide + chữ):
  - "Ảnh / Video" (icon `Image`) → `onUnavailableFeature('Ảnh / Video')`
  - "Xét kèo" (icon `Zap`) → `onOpenComposer('challenge')`
  - "Tuyển người đánh" (icon `UserPlus`) → `onOpenComposer('recruit')`

- [ ] **Step 4: Tạo `FeedComposer.css`**

Ô input bo tròn `--radius-full`, nền `--fb-bg`, padding 11px 14px, màu chữ `--fb-ink-1`; 3 nút hành động `flex: 1`, hover nền `--fb-bg`.
- [ ] **Step 5: Tạo `FeedComposerModal.tsx`**

- `<Dialog isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>` bọc `DialogHeader title="Đăng bài"` + nội dung.
- Bộ chọn loại: `RadioList label="Loại bài viết" value={category} onChange={(v) => setCategory(v as PostCategory)}` với 4 `RadioListItem` (`label` lấy từ `POST_CATEGORY_LABEL`, `value` = tên category). Loại đang chọn = `initialCategory` mở đầu, đổi được bằng click.
- `TextArea` của Astryx: `label="Nội dung bài viết"`, `maxLength={500}`, `rows={5}`, `value={content}`, `onChange={(v) => setContent(v)}`, `placeholder` tiếng Việt.
- Nút "Đăng bài" (`Button variant="primary"`) `isDisabled={content.trim() === '' || content.length > 500}` → khi bấm gọi `createPost({category, content, authorName, id: \`p-${Date.now()}\`})` rồi `onSubmit(post)` và `onClose()`.

- [ ] **Step 6: Tạo `FeedComposerModal.css`**

Bộ chọn loại: 4 nút xếp hàng ngang, bo góc `--fb-radius-ctl`, nền `--fb-bg`, nền khi chọn `--fb-blue-soft` + viền `--fb-blue`.

- [ ] **Step 7: Chạy test để xác nhận pass**

Run: `cd frontend && npm run test`
Expected: tất cả test trong `FeedComposer.test.tsx` PASS.

- [ ] **Step 8: Kiểm tra type**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không có lỗi.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/feed/
git commit -m "feat(frontend): thêm composer và modal đăng bài cho feed"
```

---

## Task 7: Bọc app bằng LayerProvider (viewport cho Toast)

`useToast` của Astryx hoạt động được nhờ fallback viewport, nhưng fallback đó **không** nằm trong `LayerProvider` → toast sẽ không dùng được cấu hình inset/position chuẩn của app và in cảnh báo "No LayerProvider found" ra console. Task này bọc app cho đúng.

**Files:**
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `LayerProvider` từ `@astryxdesign/core/Layer`.
- Produces: `LayerProvider` bọc toàn bộ cây app, **bên trong** `Theme` (để toast có theme) và **bên ngoài** `AuthProvider`.

- [ ] **Step 1: Thêm import**

Thêm vào `main.tsx`:
```tsx
import {LayerProvider} from '@astryxdesign/core/Layer';
```

- [ ] **Step 2: Bọc cây app**

Đổi phần render trong `main.tsx` thành:

```tsx
<Theme theme={caulongdeeTheme} mode="light">
  <BrowserRouter>
    <LinkProvider component={AppLink}>
      <LayerProvider>
        <AuthProvider>
          <Routes>…</Routes>
        </AuthProvider>
      </LayerProvider>
    </LinkProvider>
  </BrowserRouter>
</Theme>
```

Giữ nguyên toàn bộ `Route` cũ, chỉ thêm wrapper.

- [ ] **Step 3: Kiểm tra type + build**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không có lỗi.

Run: `cd frontend && npm run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat(frontend): bọc app bằng LayerProvider cho hệ thống toast của Astryx"
```

---

## Task 8: Component Feed — container tổng hợp + lắp vào trang chủ

**Files:**
- Create: `frontend/src/components/feed/Feed.tsx`
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/Home.css`
- Test: `frontend/src/components/feed/Feed.test.tsx`

**Interfaces:**
- Consumes: mọi component feed từ Task 3–6; `useAuth()` từ `src/context/AuthContext.tsx`; `useToast` từ `@astryxdesign/core/Toast`; `useSearchParams` từ `react-router-dom`; `AppLink` từ `src/components/AppLink.tsx`.
- Produces: `export function Feed(): JSX.Element;` — component tự chứa state, dùng được độc lập (để test không cần `Home`).

  **Quyết định thiết kế quan trọng:** `Feed` dùng `useAuth()` → khi test phải bọc `<AuthProvider>`. `AuthProvider` đọc `localStorage` và gọi `authApi.me()` nếu có token — trong test không có token nên `isLoading` chuyển `false` ngay (không cần network). Ngoài ra `Feed` dùng `useSearchParams()` → cần `MemoryRouter` bao quanh trong test.

- [ ] **Step 1: Viết test tích hợp của `Feed`**

Tạo `frontend/src/components/feed/Feed.test.tsx`:

```tsx
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it} from 'vitest';
import {STORAGE_KEYS} from '../../api/config';
import {DEMO_POSTS} from '../../data/demoPosts';
import {AuthProvider} from '../../context/AuthContext';
import {Feed} from './Feed';

afterEach(() => {
  localStorage.clear();
});

function renderFeed() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Feed />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Feed', () => {
  it('render tất cả bài demo khi chưa lọc', async () => {
    renderFeed();
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(DEMO_POSTS.length);
    });
  });

  it('lọc theo tab chỉ còn bài đúng loại', async () => {
    const user = userEvent.setup();
    renderFeed();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('tab', {name: 'Xét kèo'}));
    for (const post of screen.getAllByRole('article')) {
      expect(post.textContent).toContain('XÉT KÈO');
    }
  });

  it('bấm Thích làm likeCount tăng 1, bấm lần hai trở về số cũ', async () => {
    const user = userEvent.setup();
    renderFeed();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    const likeButton = screen.getAllByRole('button', {name: /thích/i})[0];
    const before = screen.getAllByRole('article')[0].textContent ?? '';
    await user.click(likeButton);
    expect(screen.getAllByRole('article')[0].textContent).not.toBe(before);
    await user.click(likeButton);
    expect(screen.getAllByRole('article')[0].textContent).toBe(before);
  });

  it('bài mới đăng xuất hiện ở đầu feed', async () => {
    const user = userEvent.setup();
    // Mô phỏng đã đăng nhập: AuthProvider đọc user từ localStorage.
    localStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({
        id: 'u1',
        username: 'demo',
        email: 'demo@cau-long-dee.vn',
        fullName: 'Demo User',
        phoneNumber: null,
        role: 'CUSTOMER',
        createdAt: '2026-01-01',
      }),
    );
    renderFeed();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', {name: /bạn muốn xét kèo hay tuyển người đánh cùng/i}));
    await user.type(screen.getByRole('textbox'), 'Bài đăng thử nghiệm');
    await user.click(screen.getByRole('button', {name: /đăng bài/i}));
    await waitFor(() => {
      expect(screen.getAllByRole('article')[0].textContent).toContain('Bài đăng thử nghiệm');
    });
    expect(screen.getAllByRole('article')).toHaveLength(DEMO_POSTS.length + 1);
  });

  it('khách chưa đăng nhập bấm composer thì không mở modal đăng bài', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderFeed();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', {name: /bạn muốn xét kèo hay tuyển người đánh cùng/i}));
    // Modal đăng bài không mở → không có textbox nào trong trang.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('deep-link ?post=id-khong-ton-tai vẫn render feed bình thường', async () => {
    render(
      <MemoryRouter initialEntries={['/?post=khong-ton-tai']}>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(DEMO_POSTS.length);
    });
  });

  it('bấm Chia sẻ khi không có navigator.clipboard thì không throw', async () => {
    const user = userEvent.setup();
    // jsdom không có navigator.clipboard → code phải bắt lỗi, không ném ra.
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    renderFeed();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    const shareButton = screen.getAllByRole('button', {name: /chia sẻ/i})[0];
    await expect(user.click(shareButton)).resolves.not.toThrow();
  });
});
```

> **Lưu ý về test "bài mới đăng":** khách chưa đăng nhập sẽ bị chặn bởi toast đăng nhập. Vì vậy test này set `localStorage[STORAGE_KEYS.user]` **trước** khi render (đã viết sẵn trong test ở trên). Token không cần vì `AuthProvider` chỉ gọi `me()` khi có access token. `afterEach` đã `localStorage.clear()`.

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd frontend && npm run test`
Expected: FAIL — `Cannot find module './Feed'`

- [ ] **Step 3: Tạo `frontend/src/components/feed/Feed.tsx`**

Component chứa toàn bộ state:

```tsx
const [posts, setPosts] = useState<FeedPost[]>(DEMO_POSTS);
const [filter, setFilter] = useState<FeedFilter>('all');
const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(() => new Set<string>());
const [isModalOpen, setIsModalOpen] = useState(false);
const [composerCategory, setComposerCategory] = useState<PostCategory>('challenge');
const showToast = useToast();
const {isAuthenticated, user} = useAuth();
const [searchParams] = useSearchParams();
```

- `visiblePosts = filterPosts(posts, filter)`.
- `handleToggleLike(id)` → `setLikedIds(toggleLikedId)` + `setPosts(toggleLike(posts, likedIds, id))`.
- `handleShare(id)` → copy `${location.origin}/?post=${id}` vào clipboard, `showToast({body: 'Đã sao chép liên kết bài viết'})`; nếu clipboard bị chặn thì `showToast({body: 'Không sao chép được liên kết', type: 'error'})`.
- `handleUnavailableFeature(name)` → `showToast({body: \`Tính năng "${name}" sẽ có ở giai đoạn sau\`})`.
- `handleOpenComposer(category)` → **nếu `!isAuthenticated`**: `showToast({body: 'Hãy đăng nhập để đăng bài', endContent: <AppLink href="/dang-nhap" className="feed-toast__link">Đăng nhập</AppLink>})` và **return**; ngược lại set `composerCategory` + mở modal.
- `handleSubmit(post)` → `setPosts([post, ...posts])` (bài mới lên đầu) + toast "Đã đăng bài".
- Deep-link: dùng `searchParams.get('post')`; `useEffect` khi giá trị đổi → tìm bài trong `posts`, nếu có thì `document.getElementById(\`post-${id}\`)?.scrollIntoView({behavior: 'smooth'})`; nếu không có bài thì **không làm gì** (không throw).

Render:

```tsx
<div className="feed-shell">
  <div className="feed-col">
    <FeedStories onUnavailableFeature={handleUnavailableFeature} />
    <FeedComposer onOpenComposer={handleOpenComposer} onUnavailableFeature={handleUnavailableFeature} />
    <FeedTabs value={filter} onChange={setFilter} />
    {visiblePosts.map((p) => (
      <article key={p.id} id={`post-${p.id}`}>
        <FeedPostCard post={p} isLiked={likedIds.has(p.id)}
          onToggleLike={handleToggleLike} onShare={handleShare}
          onUnavailableFeature={handleUnavailableFeature} />
      </article>
    ))}
  </div>
  <div className="feed-side">
    <FeedSidebar onUnavailableFeature={handleUnavailableFeature} />
  </div>
</div>
<FeedComposerModal isOpen={isModalOpen} initialCategory={composerCategory}
  authorName={user?.fullName || user?.username || 'Khách'} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} />
```

Thẻ `<article>` bọc quanh `FeedPostCard` để có `role="article"` + `id` cho deep-link.

**Về `useToast`:** `useToast` của Astryx không cần provider (có fallback viewport), nhưng task 7 đã bọc `LayerProvider` nên toast sẽ dùng viewport chuẩn của app.

**Về `navigator.clipboard`:** trong test jsdom, `navigator.clipboard` không tồn tại → `handleShare` phải bọc `try/catch` và fallback sang `showToast({body: 'Không sao chép được liên kết', type: 'error'})` thay vì throw.

- [ ] **Step 4: Sửa `frontend/src/pages/Home.tsx`**

Thêm `import {Feed} from '../components/feed/Feed';` và bọc feed trong `<div className="home-feed">` render **trên** các section cũ, giữ nguyên thứ tự và toàn bộ import cũ:

```tsx
export function Home() {
  return (
    <>
      <div className="home-feed">
        <Feed />
      </div>
      <Hero />
      <FeaturedCourts />
      <PricingSection />
      <CitiesSection />
      <FaqSection />
    </>
  );
}
```

- [ ] **Step 5: Sửa `frontend/src/pages/Home.css`**

Thêm rule wrapper (đặt trong `@layer app` như các rule hiện có của file):

```css
.home-feed {
  width: 100%;
  background: var(--fb-bg);
  padding-top: var(--s-6);
}
```

Nền phần feed khác nền phần landing → dùng `background` riêng cho wrapper, **không** đổi nền body. Wrapper phải full-width (không `max-width`) — `.feed-shell` bên trong mới là lớp giới hạn 1280px.

- [ ] **Step 6: Chạy test để xác nhận pass**

Run: `cd frontend && npm run test`
Expected: tất cả test PASS, gồm cả `Feed.test.tsx`.

- [ ] **Step 7: Kiểm tra type + build**

Run: `cd frontend && .\node_modules\.bin\tsc --noEmit`
Expected: không có lỗi.

Run: `cd frontend && npm run build`
Expected: build thành công.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/feed/ frontend/src/pages/Home.tsx frontend/src/pages/Home.css
git commit -m "feat(frontend): lắp feed cộng đồng vào trang chủ"
```

---

## Task 9: Kiểm tra trên trình duyệt + cập nhật README

**Files:**
- Modify: `README.md` (mục "📈 Tiến trình dự án")

**Interfaces:**
- Consumes: mọi thứ đã xong.
- Produces: README phản ánh đúng trạng thái đã verify.

- [ ] **Step 1: Chạy dev server**

Run: `cd frontend && npm run dev`
Expected: Vite báo `Local: http://localhost:5173/`.

- [ ] **Step 2: Chụp ảnh ở 3 kích thước và đối chiếu mockup**

Script có sẵn: `frontend/scripts/shot.mjs <url> <out.png> [width] [height] [waitSelector]` (dùng Puppeteer + Chrome đã cài).

Run: `cd frontend && node scripts/shot.mjs http://localhost:5173/ feed-desktop.png 1440 1400`
Run: `cd frontend && node scripts/shot.mjs http://localhost:5173/ feed-tablet.png 1000 1400`
Run: `cd frontend && node scripts/shot.mjs http://localhost:5173/ feed-mobile.png 420 1400`

Mỗi lệnh in ra JSON `{ok: true, out, ..., errors: [...]}` — `errors` phải là mảng rỗng.

Đối chiếu với `frontend/mockup-v2-desktop.png` và `frontend/mockup-v2-mobile.png`:
- 1440px: 2 cột, feed 700px, sidebar 320px bám phải.
- 1000px: 1 cột, sidebar xuống dưới feed.
- 420px: card full-bleed, không tràn ngang.

- [ ] **Step 3: Kiểm tra thủ công trên trình duyệt**

- Click tab "Xét kèo" → chỉ còn bài XÉT KÈO.
- Click Thích → icon xanh, số +1; click lại → về số cũ.
- Mở modal, gõ nội dung → nút "Đăng bài" bật; bài mới lên đầu feed.
- Chưa đăng nhập: bấm composer → toast "Hãy đăng nhập để đăng bài" kèm nút "Đăng nhập".
- Bấm Chia sẻ → toast "Đã sao chép liên kết bài viết".
- Bấm Bình luận → toast "Tính năng ... sẽ có ở giai đoạn sau".
- Kiểm tra anchor `/#bang-gia` và `/#faq` (từ Header/Footer) vẫn cuộn tới đúng section.
- Console trình duyệt không có lỗi React.

- [ ] **Step 4: Cập nhật README**

Trong mục "📈 Tiến trình dự án", tìm giai đoạn **3 — Tìm & đặt sân (Khách)**. Thêm hàng:

```
| Trang chủ dạng feed cộng đồng (xét kèo · tuyển người · cảm nghĩ) | ✅ |
```

Chỉ đánh `✅` sau khi Step 2–3 đã chạy thật và khớp mockup.

Mục "🌐 API Endpoints" **không đổi** — giai đoạn 1 không thêm endpoint (dữ liệu demo, state cục bộ).

Mục "🚀 Công nghệ sử dụng": thêm `Vitest + Testing Library` vào danh sách công nghệ kiểm thử nếu mục đó có liệt kê.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: cập nhật tiến trình trang chủ feed cộng đồng"
```

---

## Ghi chú cho người thực thi

- **Đừng sửa `caulongdee.css` / `caulongdee.js` bằng tay** — hai file đó do `astryx theme build` sinh ra. Sửa `caulongdeeTheme.ts` rồi build lại.
- **Đừng thêm dependency runtime.** `lucide-react` đã có trong `package.json`.
- **`IconButton` của Astryx không nhận `aria-pressed`** (`ButtonProps extends BaseProps` → `React.HTMLAttributes`, không có `aria-*` props). Nút Thích phải là `<button>` HTML thuần.
- **Dùng `RadioList` của Astryx** cho bộ chọn loại bài — không tự chế `role="radio"`, vì Astryx đã render sẵn role đúng và test dựa vào đó.
- **`Dialog` của Astryx** gọi `HTMLDialogElement.showModal()` — jsdom chưa có, nhưng `src/test/setup.ts` đã polyfill sẵn. Không xoá polyfill.
- **Mọi test phải pass trước khi commit** — `npm run test` là cổng chặn, không phải hình thức.

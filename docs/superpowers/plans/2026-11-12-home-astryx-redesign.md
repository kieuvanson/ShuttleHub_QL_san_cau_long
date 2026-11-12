# Trang chủ Cầu Lông dee — Redesign bằng Astryx — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây lại toàn bộ giao diện web Cầu Lông dee trên design system Astryx, giữ bộ màu cam/teal và nội dung hiện tại, bỏ các mẫu cũ (slider tự chạy, form chồng hero, gradient tổng hợp, link chết) và thêm hiệu ứng nhẹ.

**Architecture:** Author một theme Astryx riêng (`caulongdee`) bằng `defineTheme` + palette sinh từ seed cam, build ra CSS production bằng `astryx theme build` rồi bọc app trong `<Theme>`. Toàn bộ layout chuyển sang component Astryx (`Card`, `ClickableCard`, `Button`, `Badge`, `Grid`, `VStack`, `HStack`, `Text`, `Heading`, `Section`, `AspectRatio`, `Collapsible`). CSS cũ được đưa vào cascade layer `app` và tách reset phổ quát ra file riêng để không xoá style của component Astryx.

**Tech Stack:** React 19, TypeScript, Vite 8, `@astryxdesign/core` 0.7.13, `@astryxdesign/cli` 0.7.13, `@astryxdesign/theme-neutral` 0.7.13, `@stylexjs/stylex` 0.19.1, framer-motion (đã có), lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-11-home-astryx-redesign-design.md`

---

## Global Constraints

Áp dụng cho **mọi** task, không lặp lại trong từng task:

- **Trả lời và comment bằng tiếng Việt.** Tên biến/hàm/class viết tiếng Anh.
- **Không dùng `any`** trong TypeScript. Không dùng `@ts-ignore` để né lỗi type.
- **Không hardcode giá trị mới trong JSX/CSS.** Dùng 2 hệ token:
  - **Token của project** (`src/styles/tokens.css`, trong `@layer app`): `--surface-*`, `--ink-*`, `--line`, `--cta-*`, `--cl-teal*`, `--s-*` (spacing), `--r-*` (radius), `--dur-*`, `--ease-*`, `--font-*`. Dùng cho **CSS của project** (Header, Hero, FeaturedCourts…).
  - **Token của theme Astryx** (`--color-*`, `--spacing-*`, `--radius-*`, `--font-size-*`, `--text-*`): dùng khi viết `components` override trong theme, và khi cần style component Astryx.
  - **Cấm** viết `#hex` lẻ hoặc `px` cố định cho màu/khoảng cách mới trong code mới. Ngoại lệ duy nhất: giá trị đã chốt trong Global Constraints (bảng màu brand) và `box-shadow` / `rgba()` dùng cho hiệu ứng hover.
- **Import path chính xác của Astryx** — mỗi component một entry riêng, KHÔNG import từ barrel `@astryxdesign/core`:

  ```ts
  import {Card} from '@astryxdesign/core/Card';
  import {ClickableCard} from '@astryxdesign/core/ClickableCard';
  import {Badge} from '@astryxdesign/core/Badge';
  import {Button} from '@astryxdesign/core/Button';
  import {Grid, GridSpan} from '@astryxdesign/core/Grid';
  import {VStack} from '@astryxdesign/core/VStack';
  import {HStack} from '@astryxdesign/core/HStack';
  import {Text, Heading} from '@astryxdesign/core/Text';
  import {Section} from '@astryxdesign/core/Section';
  import {AspectRatio} from '@astryxdesign/core/AspectRatio';
  import {Collapsible, CollapsibleGroup} from '@astryxdesign/core/Collapsible';
  import {Divider} from '@astryxdesign/core/Divider';
  import {Link} from '@astryxdesign/core/Link';
  import {Theme} from '@astryxdesign/core/theme';
  ```

  > `Text` và `Heading` **cùng** nằm ở entry `@astryxdesign/core/Text`. `VStack` và `HStack` là **hai entry riêng biệt**, không phải từ `Layout`.

- **Props của Astryx dùng số literal JSX, không phải string:** `gap={4}` chứ không phải `gap="4"`.
- **Variant hợp lệ đã đối chiếu type thật:**
  - `Button`: `primary | secondary | ghost | destructive`
  - `Badge`: `neutral | info | success | warning | error | blue | cyan | green | orange | pink | purple | red | teal | yellow`
  - `Card` / `ClickableCard`: `default | transparent | muted | blue | cyan | gray | green | orange | pink | purple | red | teal | yellow`
  - `Section`: `section | transparent | muted`
  - **Cấm dùng:** `variant="accent"` (không tồn tại).
- **Component Astryx không tồn tại — cấm dùng:** `CollapsibleShowcase`, `DividerVertical`, `Menu`, `Select`, `Popover` (đã đối chiếu `npx astryx component --list`).
- **Cascade layer bắt buộc.** `astryx.css` và theme CSS đã tự khai `@layer reset, astryx-base, astryx-theme;`. Ta thêm layer `app` ở **cuối** (thấp hơn 3 layer Astryx) trong file riêng `src/styles/layers.css`:
  ```css
  @layer reset, astryx-base, astryx-theme, app;
  ```
  Trong CSS cascade layer, layer **đứng sau** thì thấp hơn → `app` thua `astryx-theme`. Đây là chủ ý: style legacy của ta không được đè lên style component Astryx.
  > **Quan trọng:** CSS **unlayered** (không khai layer) thắng **mọi** named layer bất kể specificity. Vì vậy `tokens.css` (đang unlayered) sẽ đè lên `astryx-base`. Bắt buộc bọc `tokens.css` vào `@layer app` — nhưng như vậy nó lại thua `astryx-theme`… nên ta **không** dùng `tokens.css` cho style component, chỉ dùng cho `:root` token và CSS legacy của project. **Mọi file CSS component cũ (`Header.css`, `Hero.css`…) phải bọc trong `@layer app`** để không đè lên component Astryx.
- **Giá trị màu cố định của brand (đã chốt trong spec):**
  | Token | Giá trị | Contrast |
  |---|---|---|
  | accent (nền nút) | `#c2410c` | chữ trắng 5.0:1 ✅ |
  | accent hover | `#9a3412` | — |
  | on-accent | `#ffffff` | — |
  | teal nhấn (`--cl-teal`) | `#0f766e` | trên trắng 4.9:1 ✅ |
  | text secondary | `#475569` | trên trắng 7.0:1 ✅ |
  | body bg | `#ffffff` | — |
  | surface | `#f8f9fc` | — |
  | muted | `#eef0f6` | — |
  | border | `#e5e7eb` | — |
  | footer bg | `#0f172a` | chữ phụ `#94a3b8` → 5.6:1 ✅ |
- **Ảnh:** 9 ảnh minh hoạ từ Wikimedia đã tải sẵn ở `assets/img/`. Copy vào `frontend/public/img/`. Tên đích cố định: `court-01.jpg` … `court-04.jpg`, `city-hanoi.jpg`, `city-hcm.jpg`, `city-danang.jpg`, `city-haiphong.jpg`, `city-cantho.jpg`.
- **Không được bịa giá/số sân/đánh giá.** Giá trị bảng giá lấy từ `DEMO_COURTS` hiện có.
- **Không đụng backend.** Không đổi route. Không thêm dependency mới ngoài `@astryxdesign/*` đã cài.
- **Verify trước khi báo "xong":** mỗi task chạy `npx tsc --noEmit` (exit 0) và `npm run build` (build thành công). Không tự nhận — in output thật.

---

## Review Focus

Năm lớp rủi ro mà spec ngụ ý nhưng không task nào kiểm tra tự động — mỗi dòng được gắn vào task sở hữu code:

1. **Nút CTA trên nền cam ở trạng thái hover/press** — chữ trắng phải ≥4.5:1 với nền *sau khi* overlay hover được áp. → Task 2
2. **Reset cũ `button { background: none }` xoá style của `Button` Astryx** — nếu xảy ra, mọi nút trên web mất nền/bo góc. → Task 1
3. **Form tìm kiếm ở 320–390px** — 3 field + nút không được tràn ngang màn hình, label không bị cắt. → Task 4
4. **Tên sân dài ở cột hẹp** — phải cắt bằng ellipsis (`maxLines={1}`), không đè lên cột rating. → Task 5
5. **Thẻ thành phố ở 320px** — tag "120+ sân · Trung tâm & ngoại thành" phải xuống dòng được, không tràn. → Task 6

---

## File Structure

**Tạo mới:**

| File | Trách nhiệm |
|---|---|
| `frontend/src/styles/layers.css` | Khai thứ tự cascade layer. Import đầu tiên trong `main.tsx`. |
| `frontend/src/styles/reset-legacy.css` | Reset cũ tách riêng, giới hạn cho markup legacy. |
| `frontend/src/themes/caulongdee/caulongdeeTheme.ts` | `defineTheme()` — nguồn sự thật của toàn bộ token. |
| `frontend/src/themes/caulongdee/caulongdeeTheme.doc.mjs` | Descriptor cho CLI. |
| `frontend/src/themes/caulongdee/tokens/brand.palette.ts` | Palette 21 shade sinh từ seed cam (file sinh máy — không sửa tay). |
| `frontend/src/themes/caulongdee/tokens/brand.palette.receipt.json` | Receipt để regenerate palette. |
| `frontend/src/themes/caulongdee/palette.config.json` | Config đầu vào của `theme palette generate`. |
| `frontend/src/themes/caulongdee/caulongdee.css` | **Sinh máy** — output của `astryx theme build`. Không sửa tay. |
| `frontend/src/themes/caulongdee/caulongdee.js` | **Sinh máy** — theme đã resolve, dùng cho `<Theme theme={...}>`. |
| `frontend/src/themes/caulongdee/caulongdee.d.ts` | **Sinh máy** — type của theme. |
| `frontend/src/components/PricingSection.tsx` | Section "Bảng giá" (mới). |
| `frontend/src/components/PricingSection.css` | CSS hỗ trợ cho section giá. |

**Sửa:**

| File | Thay đổi |
|---|---|
| `frontend/src/main.tsx` | Import layer + theme CSS + bọc `<Theme>`. |
| `frontend/src/styles/tokens.css` | Bọc trong `@layer app`; tách reset ra file riêng; đổi `--cta-0` sang `#c2410c`. |
| `frontend/src/components/Layout.tsx` | Thêm skip link. |
| `frontend/src/components/Layout.css` | Bọc `@layer app`; style skip link. |
| `frontend/src/components/Header.tsx` | Nav link thật + `Button` Astryx. |
| `frontend/src/components/Header.css` | Bọc `@layer app`; đồng bộ token. |
| `frontend/src/components/Footer.tsx` | 6 link thật + tap target + credits `<details>`. |
| `frontend/src/components/Footer.css` | Bọc `@layer app`; tap target 44px + credits + contrast footer. |
| `frontend/src/components/Hero.tsx` | Bỏ slider, split layout, CTA. |
| `frontend/src/components/Hero.css` | Viết lại — split layout, không slider. Bọc `@layer app`. |
| `frontend/src/components/SearchBar.tsx` | Gộp vào hero, label luôn hiện. |
| `frontend/src/components/SearchBar.css` | Viết lại — form trong hero. Bọc `@layer app`. |
| `frontend/src/components/FeaturedCourts.tsx` | `ClickableCard` + ảnh thật. |
| `frontend/src/components/FeaturedCourts.css` | Viết lại. Bọc `@layer app`. |
| `frontend/src/components/CitiesSection.tsx` | `Grid` + ảnh + tiêu đề mới. |
| `frontend/src/components/CitiesSection.css` | Viết lại. Bọc `@layer app`. |
| `frontend/src/components/FaqSection.tsx` | `Collapsible` + ảnh + CTA + 2 khối điều khoản. |
| `frontend/src/components/FaqSection.css` | Viết lại. Bọc `@layer app`. |
| `frontend/src/data/demoCourts.ts` | Thêm field `image?: string` vào `Court`; thêm `image` vào `AREAS`. |
| `frontend/src/components/CourtCard.tsx` | Dùng `Card` + ảnh thật (trang `/tim-san`). |
| `frontend/src/components/CourtCard.css` | Viết lại. Bọc `@layer app`. |
| `frontend/src/pages/CourtDiscovery.tsx` | Đồng bộ sang token/component Astryx. |
| `frontend/src/pages/CourtDiscovery.css` | Bọc `@layer app`; đồng bộ token. |
| `frontend/src/pages/AuthPage.tsx` | Đồng bộ sang token/component Astryx. |
| `frontend/src/pages/AuthLayout.css` | Bọc `@layer app`; đồng bộ token. |
| `frontend/index.html` | meta / OG / twitter / theme-color / canonical. |
| `README.md` | Cập nhật tiến trình + công nghệ. |

---

## Task 1: Theme Astryx + cascade layer + smoke test

**Files:**
- Create: `frontend/src/styles/layers.css`
- Create: `frontend/src/styles/reset-legacy.css`
- Create: `frontend/src/themes/caulongdee/caulongdeeTheme.ts`
- Create: `frontend/src/themes/caulongdee/caulongdeeTheme.doc.mjs`
- Create: `frontend/src/themes/caulongdee/tokens/brand.palette.ts` (+ `.receipt.json`)
- Create: `frontend/src/themes/caulongdee/palette.config.json`
- Modify: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `@astryxdesign/core` 0.7.13, `@astryxdesign/theme-neutral` 0.7.13 (đã cài), `@astryxdesign/cli` 0.7.13 (devDependency).
- Produces:
  - `src/themes/caulongdee/caulongdee.js` — export `caulongdeeTheme: DefinedTheme` (sinh máy).
  - `src/themes/caulongdee/caulongdee.css` — CSS theme đã build (sinh máy).
  - `src/styles/layers.css` — khai `@layer reset, astryx-base, astryx-theme, app;`
  - Token cục bộ `--cl-teal` khả dụng trong mọi component (theme `localTokens`).

- [ ] **Step 1: Tạo config palette, strip BOM, sinh palette**

Tạo `frontend/src/themes/caulongdee/palette.config.json`:
```json
{
  "families": [
    { "id": "brand", "seed": "#c2410c" }
  ]
}
```

> ⚠️ **BẮT BUỘC:** file JSON phải **không có BOM**. PowerShell `Out-File -Encoding utf8` của Windows PowerShell 5.x **có** BOM → CLI sẽ báo `Could not parse palette config: Unexpected token '﻿'`. Dùng `Write` tool, hoặc sửa bằng:
> ```powershell
> node -e "const fs=require('fs');fs.writeFileSync('palette.config.json',fs.readFileSync('palette.config.json','utf8').replace(/^\uFEFF/,''),'utf8')"
> ```

Chạy:
```powershell
cd frontend
npx astryx theme palette generate src/themes/caulongdee/palette.config.json --out src/themes/caulongdee/tokens/brand.palette.ts
```
Expected:
```
[ok] Wrote src\themes\caulongdee\tokens\brand.palette.ts
[ok] Wrote src\themes\caulongdee\tokens\brand.palette.receipt.json
```
File sinh ra có cấu trúc: `export const palette = { brand: { name, light: {0,5,…,100}, dark: {…} } }`.

- [ ] **Step 2: Viết theme `caulongdeeTheme.ts`**

Tạo `frontend/src/themes/caulongdee/caulongdeeTheme.ts`:
```ts
import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

export const caulongdeeTheme = defineTheme({
  name: 'caulongdee',

  // Kế thừa toàn bộ token, component override, icon registry của Neutral,
  // rồi đè lại bằng bộ nhận diện Cầu Lông dee (cam + teal).
  extends: neutralTheme,

  typography: {
    scale: {base: 16, ratio: 1.2},
    body: {
      family: 'Inter',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    heading: {
      family: 'Bricolage Grotesque',
      fallbacks: 'Inter, -apple-system, sans-serif',
      weights: {1: 'bold', 2: 'bold'},
    },
    code: {family: 'JetBrains Mono', fallbacks: 'ui-monospace, monospace'},
  },

  radius: {base: 6, multiplier: 1.6},

  motion: {fast: 150, medium: 320, slow: 700, ratio: 0.75},

  localTokens: {
    '--cl-teal': '#0f766e',
    '--cl-teal-hover': '#115e59',
  },

  tokens: {
    '--color-accent': ['#c2410c', '#fb923c'],
    '--color-on-accent': ['#ffffff', '#1c1917'],
    '--color-background-body': ['#ffffff', '#111112'],
    '--color-background-surface': ['#f8f9fc', '#1a1a1c'],
    '--color-background-muted': ['#eef0f6', '#26262a'],
    '--color-text-primary': ['#0f172a', '#f5f5f6'],
    '--color-text-secondary': ['#475569', '#a1a1aa'],
    '--color-text-disabled': ['#94a3b8', '#71717a'],
    '--color-border': ['#e5e7eb', '#3f3f46'],
    '--focus-outline-color': 'var(--color-accent)',
  },

  components: {
    button: {
      base: {
        borderRadius: 'var(--radius-full)',
        fontWeight: 'var(--font-weight-semibold)',
      },
      'variant:primary': {
        backgroundColor: 'var(--color-accent)',
        color: 'var(--color-on-accent)',
        ':hover': {backgroundColor: '#9a3412'},
      },
    },
    card: {
      base: {
        borderRadius: 'var(--radius-container)',
      },
    },
    'clickable-card': {
      base: {borderRadius: 'var(--radius-container)'},
    },
    badge: {
      base: {borderRadius: 'var(--radius-full)'},
    },
  },
});
```

> **Tên component trong `components`** phải là key của `astryx theme targets`: `button`, `card`, `clickable-card`, `badge`, `heading`, `text`, `section`, `item`, `link`, `icon`. Sai tên → `theme build` báo lỗi validation.
>
> **Token lạ sẽ bị build validation chặn.** Danh sách token hợp lệ: `npx astryx docs tokens/tokens-color`. Cụ thể `--color-text-tertiary` **không tồn tại** — dùng `--color-text-secondary` cho chữ phụ và `--color-text-disabled` cho chữ rất nhạt (đã dùng ở trên).
>
> `localTokens` nhận **bất kỳ** tên CSS custom property hợp lệ (`--cl-teal`, `--cl-teal-hover`) — đây là chỗ dành cho token riêng của brand, không bị validate theo danh sách token chuẩn.

- [ ] **Step 3: Tạo descriptor theme**

Tạo `frontend/src/themes/caulongdee/caulongdeeTheme.doc.mjs`:
```js
/** @type {import('@astryxdesign/cli/authoring').ThemeDoc} */
export default {
  type: 'theme',
  name: 'caulongdee',
  displayName: 'Cầu Lông dee',
  description: 'Theme Cầu Lông dee — accent cam, nhấn teal, nền sạch.',
  maintained: false,
};
```

- [ ] **Step 4: Build theme**

```powershell
cd frontend
npx astryx theme build src/themes/caulongdee/caulongdeeTheme.ts
```
Expected (output thật đã kiểm chứng):
```
[ok] src\themes\caulongdee\caulongdee.css (27 KB, 199 token overrides, 14 component overrides)
[note] Fonts named but not loaded: "Inter", "Bricolage Grotesque". Load them in your app ...
```
Sinh ra 4 file cạnh source: `caulongdee.css`, `caulongdee.css.d.ts`, `caulongdee.js`, `caulongdee.d.ts`, `caulongdee.variants.d.ts`.

> `caulongdee.js` export `caulongdeeTheme: DefinedTheme` — dùng object này cho `<Theme theme={caulongdeeTheme}>`.
>
> Nếu build lỗi validation → sửa đúng tên rồi build lại. **Không bypass bằng `any` hay bằng cách xoá token hợp lệ.**
>
> **Không dùng `npx astryx theme add caulongdee`** — lệnh đó chỉ nhận slug theme có sẵn trong registry (`butter`, `chocolate`, `gothic`, `matcha`, `neutral`, `stone`, `y2k`) và sẽ báo `Error: Unknown theme "caulongdee"`.

- [ ] **Step 5: Tạo `layers.css` và `reset-legacy.css`**

Tạo `frontend/src/styles/layers.css`:
```css
/* Thứ tự cascade layer — file này PHẢI import đầu tiên trong main.tsx.
   astryx.css và theme CSS tự khai "reset, astryx-base, astryx-theme".
   Ta thêm "app" ở CUỐI ⇒ app thấp hơn cả 3 layer Astryx ⇒ style legacy
   của project không đè lên style component Astryx.
   Lưu ý: CSS unlayered thắng MỌI named layer → không được để file CSS
   component của project unlayered. */
@layer reset, astryx-base, astryx-theme, app;
```

Tạo `frontend/src/styles/reset-legacy.css`:
```css
/* Reset cho markup CŨ (không phải component Astryx).
   KHÔNG dùng selector phổ quát `button` / `img` — sẽ xoá style của
   Button/AspectRatio của Astryx. */
@layer app {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .legacy-btn {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
    color: inherit;
  }
}
```

> **Lý do tách:** `tokens.css` hiện có `button { border: none; background: none; }`. Nếu giữ nguyên ở unlayered, nó thắng `astryx-base` → **xoá** style gốc của `Button` Astryx → mọi nút mất nền và bo góc. Đây là Review Focus #2.
>
> `reset.css` của Astryx **đã** lo phần lớn việc này (`:where(button)` → `font: inherit`, `background-color: transparent`, `:where(img)` → `display:block; max-width:100%`), nên ta chỉ giữ lại phần thật sự cần.

- [ ] **Step 6: Sửa `tokens.css` — bọc layer + tách reset + đổi accent**

Trong `frontend/src/styles/tokens.css`:
1. Thêm `@layer app {` ngay sau comment đầu file, và `}` ở cuối file — bọc **toàn bộ** nội dung.
2. **Xoá** khối reset ở cuối file (`*`, `html, body, #root`, `a`, `button`, `img`) — chuyển sang `reset-legacy.css` ở Step 5. Giữ lại `::selection`, `:focus-visible`, `::-webkit-scrollbar*` (vô hại, không xung đột component).
3. Đổi giá trị accent để đạt WCAG AA:
   ```css
   --cta-0: #c2410c;   /* cam-700 — chữ trắng 5.0:1 ✅ */
   --cta-1: #9a3412;   /* cam-800 — hover */
   --cta-ink: #ffffff;
   ```
4. Thêm `--s-20: 80px` vào thang spacing (thiếu, `Hero.css` cũ dùng `var(--s-20)`).
5. Thêm token teal làm dự phòng:
   ```css
   --cl-teal: #0f766e;
   --cl-teal-hover: #115e59;
   ```
   > **Nguồn sự thật là theme** (`localTokens` trong `caulongdeeTheme.ts`). Bản trong `tokens.css` chỉ là dự phòng cho trường hợp theme chưa load; theme nằm ở layer `astryx-theme` (cao hơn `app`) nên luôn thắng. Hai giá trị phải **giống nhau**.

- [ ] **Step 7: Bọc `@layer app` cho toàn bộ CSS component hiện có**

Các file sau **phải** được bọc trong `@layer app` ở bước này (trước khi Task 3–9 viết lại chúng):
```
frontend/src/components/Layout.css
frontend/src/components/Header.css
frontend/src/components/Footer.css
frontend/src/components/Hero.css
frontend/src/components/SearchBar.css
frontend/src/components/FeaturedCourts.css
frontend/src/components/CitiesSection.css
frontend/src/components/FaqSection.css
frontend/src/components/CourtCard.css
frontend/src/components/QuickSearchBar.css
frontend/src/components/FilterPanel.css
frontend/src/components/Pagination.css
frontend/src/components/MapPanel.css
frontend/src/components/OtpInput.css
frontend/src/components/BookingHeader.css
frontend/src/pages/Home.css
frontend/src/pages/CourtDiscovery.css
frontend/src/pages/AuthLayout.css
frontend/src/pages/OAuthCallbackPage.css
frontend/src/pages/FacebookCompletePage.css
```

Với mỗi file, thêm `@layer app {` sau dòng comment đầu tiên và `}` ở cuối file.

> **Bắt buộc:** nếu bỏ qua bước này, các rule cũ (unlayered) sẽ đè lên `Button`/`Card` Astryx. Kiểm tra sau khi làm: chạy `npm run build`, mở DevTools → tab Layers, xác nhận các rule cũ nằm trong layer `app`.

- [ ] **Step 8: Sửa `main.tsx` — import + bọc `<Theme>`**

```tsx
// Inter font (self-hosted)
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './styles/layers.css';            // ĐẦU TIÊN — khai thứ tự layer
import './styles/tokens.css';
import './styles/reset-legacy.css';
import '@astryxdesign/core/reset.css';  // @layer reset
import '@astryxdesign/core/astryx.css'; // @layer astryx-base
import './themes/caulongdee/caulongdee.css'; // @layer astryx-theme (sinh máy)

import { Theme } from '@astryxdesign/core/theme';
import { caulongdeeTheme } from './themes/caulongdee/caulongdee';

import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CourtDiscovery } from './pages/CourtDiscovery';
import { AuthPage } from './pages/AuthPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { FacebookCompletePage } from './pages/FacebookCompletePage';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={caulongdeeTheme} mode="light">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/tim-san" element={<CourtDiscovery />} />
              <Route path="/dang-nhap" element={<AuthPage />} />
              <Route path="/dang-ky" element={<AuthPage />} />
              {/* OAuth: backend redirect về kèm ticket (không có JWT trong URL) */}
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/oauth/facebook" element={<FacebookCompletePage />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </Theme>
  </StrictMode>
);
```

> Giữ nguyên toàn bộ route hiện có (kể cả `/oauth/callback` và `/oauth/facebook`).
>
> `mode="light"` — trang thiết kế sáng. Nếu sau này muốn dark mode thì đổi sang `mode="system"`.

- [ ] **Step 9: Smoke test — xác nhận theme đúng màu**

Tạo tạm `frontend/src/pages/SmokeTest.tsx`:
```tsx
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Badge} from '@astryxdesign/core/Badge';
import {Heading, Text} from '@astryxdesign/core/Text';

export function SmokeTest() {
  return (
    <>
      <Heading level={1} type="display-2">Smoke test theme</Heading>
      <Text type="body">Nền trắng, chữ #0f172a.</Text>
      <Text type="supporting">Chữ phụ #475569.</Text>
      <Badge variant="teal" label="Badge teal" />
      <Badge variant="orange" label="Badge cam" />
      <Card>
        <Text type="body">Card nền trắng, viền #e5e7eb.</Text>
      </Card>
      <Button label="Tìm sân trống" variant="primary" />
      <Button label="Phụ" variant="secondary" />
      <Button label="Ghost" variant="ghost" />
    </>
  );
}
```
Thêm route tạm trong `main.tsx`: `<Route path="/__smoke" element={<SmokeTest />} />`.

Chạy:
```powershell
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/__smoke` và xác nhận bằng mắt:
- Nút chính **nền cam đậm** `#c2410c`, chữ trắng, **bo tròn pill** (`--radius-full`).
- Tiêu đề dùng **font Bricolage Grotesque** (font-family khác hẳn Inter của đoạn body).
- Card viền xám mảnh, nền trắng, bo góc mềm (≈20px = `--radius-container`).
- Badge teal có nền xanh nhạt, chữ xanh đậm.

Nếu nút bị mất nền → còn rule cũ unlayered đè → kiểm tra Step 7 đã bọc hết `@layer app`.
Nếu mọi thứ vẫn là màu xanh dương mặc định → theme chưa được áp → kiểm tra `caulongdee.css` có được import và `caulongdeeTheme` có `name: 'caulongdee'`.

- [ ] **Step 10: Xoá smoke test**

Xoá `frontend/src/pages/SmokeTest.tsx` và route `/__smoke` trong `main.tsx`.

- [ ] **Step 11: Verify + commit**

```powershell
npx tsc --noEmit
npm run build
npx astryx doctor
```
Expected: tsc exit 0, build thành công, `astryx doctor` **không có `fail`**. Cảnh báo `[warn] Theme package(s) installed but no theme appears wired` là **bình thường** — theme này là local fork, không do CLI quản lý qua `theme add`; đã xác nhận 0 fail.

```bash
git add frontend/src/styles frontend/src/themes frontend/src/main.tsx frontend/src/components/*.css frontend/src/pages/*.css
git commit -m "feat(frontend): thêm theme Astryx caulongdee + cascade layer app"
```

---

## Task 2: Ảnh minh hoạ + data model

**Files:**
- Create: `frontend/public/img/court-01.jpg` … `court-04.jpg`, `city-hanoi.jpg`, `city-hcm.jpg`, `city-danang.jpg`, `city-haiphong.jpg`, `city-cantho.jpg`
- Modify: `frontend/src/data/demoCourts.ts`

**Interfaces:**
- Consumes: ảnh ở `assets/img/` (đã tải sẵn, tên `photo-f139625978-960.jpg` …).
- Produces:
  - `Court.image?: string` — đường dẫn ảnh tương đối, ví dụ `'/img/court-01.jpg'`. `undefined` ⇒ dùng `imageGradient` làm fallback.
  - `AREAS` — mỗi phần tử có thêm `image: string`.

- [ ] **Step 1: Copy 9 ảnh vào `frontend/public/img/`**

```powershell
cd D:\hocHanh\project\QL_san_cau_long
Copy-Item assets\img\photo-f139625978-960.jpg frontend\public\img\court-01.jpg
Copy-Item assets\img\photo-f160121535-960.jpg frontend\public\img\court-02.jpg
Copy-Item assets\img\photo-f152558530-960.jpg  frontend\public\img\court-03.jpg
Copy-Item assets\img\photo-f20514494-960.jpg  frontend\public\img\court-04.jpg
Copy-Item assets\img\photo-f199967395-960.jpg frontend\public\img\city-hanoi.jpg
Copy-Item assets\img\photo-f76820497-960.jpg  frontend\public\img\city-hcm.jpg
Copy-Item assets\img\photo-f120168288-960.jpg frontend\public\img\city-danang.jpg
Copy-Item assets\img\photo-f25559977-960.jpg  frontend\public\img\city-haiphong.jpg
Copy-Item assets\img\photo-f125986121-960.jpg frontend\public\img\city-cantho.jpg
```
Expected: `frontend/public/img/` có 9 file jpg.

- [ ] **Step 2: Thêm field `image` vào type `Court`**

Trong `frontend/src/data/demoCourts.ts`, sửa type:
```ts
export type Court = {
  id: string;
  name: string;
  district: string;
  city: string;
  priceFrom: number;
  rating: number;
  reviewCount?: number;
  nextAvailable: string;
  nextAvailableDate: string;
  courtsCount: number;
  amenities: string[];
  image?: string;                    // ảnh minh hoạ trong /img; undefined ⇒ dùng imageGradient
  imageGradient: [string, string];  // fallback khi chưa có ảnh thật
  isNew?: boolean;
  isHot?: boolean;
  distanceKm?: number;
};
```

- [ ] **Step 3: Gán ảnh cho 8 sân**

Trong mảng `DEMO_COURTS`, thêm `image` cho từng phần tử — **phân bổ để 4 sân đầu (hiện ở trang chủ) dùng 4 ảnh khác nhau**:
- `c-001` → `image: '/img/court-01.jpg'`
- `c-002` → `image: '/img/court-02.jpg'`
- `c-003` → `image: '/img/court-03.jpg'`
- `c-004` → `image: '/img/court-04.jpg'`
- `c-005` → `image: '/img/court-02.jpg'`
- `c-006` → `image: '/img/court-03.jpg'`
- `c-007` → `image: '/img/court-04.jpg'`
- `c-008` → `image: '/img/court-01.jpg'`

> Trang chủ chỉ hiện `DEMO_COURTS.slice(0, 4)` → 4 ảnh khác nhau, không ảnh nào lặp trong cùng trang. `/tim-san` phân trang 4/trang → cũng không lặp trong trang.

- [ ] **Step 4: Thêm `image` vào `AREAS`**

```ts
export const AREAS = [
  { id: 'all',         label: 'Tất cả khu vực', count: 1248 },
  { id: 'hanoi',       label: 'Hà Nội',          count: 412, image: '/img/city-hanoi.jpg' },
  { id: 'hcm',         label: 'TP. Hồ Chí Minh', count: 538, image: '/img/city-hcm.jpg' },
  { id: 'danang',      label: 'Đà Nẵng',        count: 156, image: '/img/city-danang.jpg' },
  { id: 'haiphong',    label: 'Hải Phòng',      count: 89,  image: '/img/city-haiphong.jpg' },
  { id: 'cantho',      label: 'Cần Thơ',        count: 53,  image: '/img/city-cantho.jpg' },
] as const;
```

> `AREAS` là `as const` → kiểu `readonly` tự suy ra `image: string` literal. Phần tử `all` không có `image` — mọi nơi dùng `AREAS` phải xử lý `undefined` cho `all` (đã lọc ở Task 6).

- [ ] **Step 5: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
```
Expected: tsc exit 0, build thành công.

```bash
git add frontend/public/img frontend/src/data/demoCourts.ts
git commit -m "feat(frontend): thêm ảnh minh hoạ cho sân và thành phố"
```

---

## Task 3: Shell — Header, Footer, Layout, skip link

**Files:**
- Modify: `frontend/src/components/Header.tsx`, `Header.css`
- Modify: `frontend/src/components/Footer.tsx`, `Footer.css`
- Modify: `frontend/src/components/Layout.tsx`, `Layout.css`

**Interfaces:**
- Consumes: `Button` từ `@astryxdesign/core/Button`; `Link` từ `react-router-dom`.
- Produces: anchor id có sẵn cho các section sau: `#bang-gia` (Task 6), `#faq` (Task 7), `#dieu-khoan`, `#chinh-sach` (Task 7). Header/Footer chỉ trỏ link — **section đích tạo ở task sau**, link không được chết.

- [ ] **Step 1: Layout — thêm skip link**

`frontend/src/components/Layout.tsx`:
```tsx
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import './Layout.css';

/**
 * Layout — khung chung cho mọi trang: Header + nội dung + Footer.
 * React Router inject route con qua <Outlet />.
 */
export function Layout() {
  return (
    <div className="layout">
      <a className="skip-link" href="#main">Bỏ qua tới nội dung</a>
      <Header />
      <main className="layout__main" id="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

`frontend/src/components/Layout.css` — thêm vào trong `@layer app`:
```css
.skip-link {
  position: absolute;
  left: var(--s-4);
  top: var(--s-2);
  z-index: 100;
  padding: var(--s-2) var(--s-4);
  background: var(--surface-2);
  color: var(--ink-0);
  border-radius: var(--r-sm);
  transform: translateY(-200%);
  transition: transform var(--dur-fast) var(--ease-out);
}

.skip-link:focus {
  transform: translateY(0);
}
```

- [ ] **Step 2: Header — nav link thật**

`frontend/src/components/Header.tsx` — thay khối `<nav>`:
```tsx
<nav className="hdr__nav" aria-label="Chính">
  <Link to="/tim-san" className="hdr__navlink">Tìm sân cầu lông</Link>
  <Link to="/#bang-gia" className="hdr__navlink">Bảng giá</Link>
  <Link to="/#faq" className="hdr__navlink">Hỗ trợ</Link>
</nav>
```

> `Link to="/#bang-gia"` của React Router điều hướng về `/` rồi cuộn tới anchor — hoạt động khi đã ở trang chủ.

Thay khối nút chưa đăng nhập:
```tsx
<Link to="/dang-nhap" className="hdr__login">Đăng nhập</Link>
<Link to="/dang-ky" className="hdr__signup">Đăng ký</Link>
```
> **Giữ `Link` của react-router thay vì `Button` của Astryx** — `Button` cần prop `href`/`as` và sẽ render thẻ `<a>`; trong project này điều hướng đã do React Router quản lý, dùng `Link` tránh reload trang. Style nút giữ nguyên bằng CSS token.

Menu user (`hdr__user-menu`) — **giữ nguyên markup hiện tại**. Ghi rõ là ngoại lệ: `DropdownMenu` của Astryx có API khác và map không 1-1 với menu "thông tin user + đăng xuất".

- [ ] **Step 3: Header.css — đồng bộ token**

Đổi các giá trị hardcode sang token:
- `border-bottom: 1px solid #e5e7eb` → `border-bottom: 1px solid var(--line)`
- `.hdr__navlink:hover { color: #085041 }` → `var(--cl-teal-hover)`
- `.hdr__login:hover { color: #085041 }` → `var(--cl-teal-hover)`
- `.hdr__signup { background: var(--cta-0) }` — giữ `--cta-0` (đã đổi sang `#c2410c` ở Task 1 → đạt AA)
- `.hdr__user-menu { border-radius: var(--r-md, 12px) }` → `var(--r-md)` (bỏ fallback)
- `.hdr__user-menu { border: 1px solid rgba(15,23,42,.1) }` → `1px solid var(--line)`

- [ ] **Step 4: Footer.tsx — 6 link thật + credits**

`frontend/src/components/Footer.tsx`:
```tsx
import './Footer.css';

const PRODUCT_LINKS = [
  {label: 'Tìm sân cầu lông', href: '/tim-san'},
  {label: 'Hướng dẫn đặt sân', href: '/#faq'},
  {label: 'Cổng thanh toán', href: '/#faq'},
];

const SUPPORT_LINKS = [
  {label: 'Liên hệ', href: 'mailto:hotro@caulongdee.example'},
  {label: 'Điều khoản', href: '/#dieu-khoan'},
  {label: 'Chính sách', href: '/#chinh-sach'},
];

export function Footer() {
  return (
    <footer className="foot" aria-label="Chân trang">
      <div className="foot__inner">
        <div className="foot__col">
          <p className="foot__brand">Cầu Lông dee</p>
          <p className="foot__desc">Cầu Lông dee — Đặt sân trong 30 giây.</p>
        </div>

        <div className="foot__col">
          <p className="foot__heading">Sản phẩm</p>
          <ul className="foot__list">
            {PRODUCT_LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="foot__link">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="foot__col">
          <p className="foot__heading">Hỗ trợ</p>
          <ul className="foot__list">
            {SUPPORT_LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="foot__link">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="foot__base">
        <p>© Cầu Lông dee — Dữ liệu hiển thị là dữ liệu demo.</p>
        <details className="foot__credits">
          <summary>Ảnh minh hoạ từ Wikimedia Commons</summary>
          <p className="foot__credits-list">
            Ảnh trên trang là ảnh minh hoạ, không phải sân của Cầu Lông dee. Nguồn: Adhitya2048 (CC BY-SA 4.0),
            Chris Eason (CC BY 2.0), Herbert Nott (Public domain), Ian Patterson (CC BY 2.0),
            Santiago (CC0), Joelflorentinpereira (CC BY-SA 4.0), JoselínDoom (CC BY-SA 4.0),
            Peter (CC BY-SA 2.0), SwarmCheng (CC BY-SA 4.0).
          </p>
        </details>
      </div>
    </footer>
  );
}
```

> Nguồn ảnh lấy từ `assets/img/credits.json`. Đọc file đó để lấy **đúng** tên tác giả/giấy phép — nếu khác với danh sách viết tay ở trên thì lấy theo `credits.json`.

- [ ] **Step 5: Footer.css — tap target 44px + contrast + credits**

Sửa/thêm (trong `@layer app`):
```css
.foot {
  background: var(--ink-0);       /* #0f172a */
  color: #cbd5e1;
}

.foot__desc { color: #94a3b8; }   /* 5.6:1 trên nền tối */
.foot__link { color: #cbd5e1; }
.foot__link:hover { color: #67e8f9; }

.foot__base p { color: #94a3b8; }  /* đổi từ #64748b → 5.6:1 */

/* Tap target ≥ 44px trên điện thoại */
@media (max-width: 720px) {
  .foot__link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
}

.foot__credits {
  margin-top: var(--s-3);
  font-size: 12px;
  color: #94a3b8;
}

.foot__credits summary {
  cursor: pointer;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

.foot__credits-list {
  margin: var(--s-2) 0 0;
  line-height: 1.6;
  max-width: 90ch;
}
```

> `.foot__base p` hiện có `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` → bỏ `white-space: nowrap` để dòng credits xuống dòng được.

- [ ] **Step 6: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/` → click từng link Header/Footer: không link nào `href="#"` còn lại; "Bảng giá" / "Hỗ trợ" / "Điều khoản" / "Chính sách" tới anchor (anchor có thể chưa tồn tại — sẽ thêm ở Task 6/7, phải nhớ làm).

Kiểm tra tap target: ở viewport 390px, mỗi link footer cao ≥ 44px (DevTools đo `offsetHeight`).

```bash
git add frontend/src/components/Header.tsx frontend/src/components/Header.css frontend/src/components/Footer.tsx frontend/src/components/Footer.css frontend/src/components/Layout.tsx frontend/src/components/Layout.css
git commit -m "feat(frontend): link thật, tap target 44px, credits ảnh, skip link"
```

---

## Task 4: Hero — bỏ slider, split layout, CTA

**Files:**
- Modify: `frontend/src/components/Hero.tsx`
- Modify: `frontend/src/components/Hero.css` (viết lại toàn bộ)

**Interfaces:**
- Consumes: `Grid` từ `@astryxdesign/core/Grid`; `VStack` từ `@astryxdesign/core/VStack`; `HStack` từ `@astryxdesign/core/HStack`; `Heading`, `Text` từ `@astryxdesign/core/Text`; `Button` từ `@astryxdesign/core/Button`; `Badge` từ `@astryxdesign/core/Badge`; `AspectRatio` từ `@astryxdesign/core/AspectRatio`; `Section` từ `@astryxdesign/core/Section`; `framer-motion` (đã có).
- Produces: `<Hero />` không còn nhận prop nào.

- [ ] **Step 1: Viết `Hero.tsx` mới**

```tsx
import { motion } from 'framer-motion';
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Section } from '@astryxdesign/core/Section';
import { SearchBar } from './SearchBar';
import './Hero.css';

const HERO_STATS = [
  { value: '500+', label: 'sân đối tác' },
  { value: '30 giây', label: 'xác nhận' },
  { value: '4.8★', label: 'đánh giá trung bình' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function Hero() {
  return (
    <Section variant="transparent" padding={0} className="hero">
      <div className="hero__inner">
        <Grid columns={{minWidth: 320, max: 2}} gap={6} align="center">
          <VStack gap={4} className="hero__copy">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <Badge variant="teal" label="Cầu Lông dee" />
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
              <Heading level={1} type="display-2" textWrap="balance">
                Đặt sân cầu lông trong 30 giây
              </Heading>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
              <Text type="large" color="secondary" textWrap="pretty">
                Tìm sân trống gần bạn, xem giá và khung giờ, đặt ngay. Không gọi điện, không chờ tin nhắn.
              </Text>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
              <HStack gap={3} className="hero__actions">
                <Button label="Tìm sân trống" variant="primary" href="/tim-san" />
                <Button label="Xem bảng giá" variant="secondary" href="/#bang-gia" />
              </HStack>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
              <HStack gap={5} className="hero__stats">
                {HERO_STATS.map((s) => (
                  <VStack key={s.label} gap={0}>
                    <Text type="large" weight="bold">{s.value}</Text>
                    <Text type="supporting">{s.label}</Text>
                  </VStack>
                ))}
              </HStack>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
              <SearchBar />
            </motion.div>
          </VStack>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="hero__media"
          >
            <AspectRatio ratio={4 / 3} fit="cover">
              <img
                src="/banner_hero2.jpg"
                alt="Sân cầu lông trong nhà tại Cầu Lông dee"
                width={1200}
                height={738}
              />
            </AspectRatio>
          </motion.div>
        </Grid>
      </div>
    </Section>
  );
}
```

> **`Button` với `href`** render thẻ `<a>` → điều hướng bằng tải trang đầy đủ. Với app dùng React Router, ưu tiên bọc `<Link>`:
> ```tsx
> <Link to="/tim-san"><Button label="Tìm sân trống" variant="primary" /></Link>
> ```
> Nhưng `<a>` bọc `<button>` là HTML không hợp lệ. **Cách đúng:** dùng `Button` với `href` — Astryx `Button` có prop `href` và `as` (`LinkComponentType`), nên có thể truyền router:
> ```tsx
> <Button label="Tìm sân trống" variant="primary" href="/tim-san" as={RouterLink} />
> ```
> với `import {Link as RouterLink} from 'react-router-dom'`. Astryx sẽ truyền cả `href` và `to` cho component. **Chọn 1 cách và dùng nhất quán.**
>
> `AspectRatio` với `fit="cover"` tự co giãn child — không cần set `width/height/objectFit` cho ảnh (nhưng vẫn nên đặt `width`/`height` để tránh CLS).

- [ ] **Step 2: Viết `Hero.css` mới (thay toàn bộ)**

```css
/* ============================================================
   Hero — split: chữ trái, ảnh phải. Không slider, không dots.
   ============================================================ */

.hero {
  min-height: calc(100svh - 76px);
  background: var(--surface-0);
  overflow: hidden;
}

.hero__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--s-10) var(--s-6);
}

.hero__copy {
  max-width: 620px;
}

.hero__actions {
  flex-wrap: wrap;
}

.hero__stats {
  flex-wrap: wrap;
  padding-top: var(--s-2);
  border-top: 1px solid var(--line);
}

.hero__media {
  border-radius: var(--r-lg);
  overflow: hidden;
}

.hero__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 720px) {
  .hero {
    min-height: calc(100svh - 64px);
  }
  .hero__inner {
    padding: var(--s-6) var(--s-4);
  }
  .hero__copy {
    max-width: none;
  }
}
```

> 76px = chiều cao header desktop, 64px = mobile. Header phải `position: sticky` để hero không bị che.

- [ ] **Step 3: Sửa `SearchBar.tsx` — gộp vào hero**

Xoá `<section className="search">` và `<div className="search__inner">` bọc ngoài — `SearchBar` giờ trả về **chỉ form** để nhúng trong `VStack` của hero:

```tsx
import { useState } from 'react';
import { AREAS } from '../data/demoCourts';
import './SearchBar.css';

export function SearchBar() {
  const [city, setCity] = useState<string>('all');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>('18:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Future: navigate to /tim-san?city=...&date=...&time=...
    console.log('[search]', { city, date, time });
  };

  return (
    <form className="search__form" onSubmit={handleSubmit} role="search">
      <div className="search__field">
        <label className="search__label" htmlFor="search-city">Khu vực</label>
        <select
          id="search-city"
          className="search__input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>

      <div className="search__field">
        <label className="search__label" htmlFor="search-date">Ngày</label>
        <input
          id="search-date"
          className="search__input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="search__field">
        <label className="search__label" htmlFor="search-time">Giờ</label>
        <input
          id="search-time"
          className="search__input"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <button className="search__submit" type="submit">Tìm sân</button>
    </form>
  );
}
```

> Giữ `<select>` native — Astryx không có component `Select`. Label luôn hiện (không dùng placeholder làm label) → đáp ứng WCAG 3.3.2.

- [ ] **Step 4: Viết `SearchBar.css` mới (thay toàn bộ)**

```css
/* ============================================================
   SearchBar — nằm trong Hero, không overlap. Mobile xếp dọc.
   ============================================================ */

.search__form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: var(--s-3);
  align-items: end;
  background: var(--surface-2);
  border: var(--line);
  border-radius: var(--r-lg);
  padding: var(--s-4);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  width: 100%;
}

.search__field {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  min-width: 0;
}

.search__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-1);
}

.search__input {
  height: 48px;
  background: var(--surface-0);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  color: var(--ink-0);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 500;
  padding: 0 var(--s-3);
  width: 100%;
  min-width: 0;
}

.search__input:focus-visible {
  border-color: var(--cl-teal);
  outline: 2px solid var(--cl-teal);
  outline-offset: 1px;
}

.search__submit {
  height: 48px;
  background: var(--cta-0);
  color: var(--cta-ink);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 15px;
  padding: 0 var(--s-5);
  border-radius: var(--r-md);
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out);
}

.search__submit:hover {
  background: var(--cta-1);
}

@media (max-width: 720px) {
  .search__form {
    grid-template-columns: 1fr;
    gap: var(--s-3);
  }
  .search__submit {
    width: 100%;
  }
}
```

> **Review Focus #3:** ở 390px, `grid-template-columns: 1fr` → 4 hàng dọc, không tràn ngang.

- [ ] **Step 5: Xoá `SearchBar` khỏi `Home.tsx`**

`frontend/src/pages/Home.tsx` — `SearchBar` đã nằm trong `Hero` nên không import ở đây nữa:
```tsx
import { Hero } from '../components/Hero';
import { FeaturedCourts } from '../components/FeaturedCourts';
import { PricingSection } from '../components/PricingSection';
import { CitiesSection } from '../components/CitiesSection';
import { FaqSection } from '../components/FaqSection';
import './Home.css';

export function Home() {
  return (
    <>
      <Hero />
      <FeaturedCourts />
      <PricingSection />
      <CitiesSection />
      <FaqSection />
    </>
  );
}
```

> `PricingSection` chưa tồn tại ở Task 4 → import nó ở **Task 6**. Tạm thời bỏ dòng import đó và giữ nguyên danh sách section cũ cho tới Task 6.

- [ ] **Step 6: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/` và xác nhận:
- **Không còn slider** — ảnh tĩnh, không đổi sau 5 giây, không có dots.
- Tiêu đề **canh trái**, không căn giữa.
- Có nút "Tìm sân trống" (nền cam) và "Xem bảng giá".
- Form tìm kiếm nằm **dưới CTA, trong hero**, không tràn ra ngoài hero (không còn khoảng trắng overlap).
- Ở 390px: form xếp dọc, không tràn ngang, label "Khu vực"/"Ngày"/"Giờ" đều hiện.

```bash
git add frontend/src/components/Hero.tsx frontend/src/components/Hero.css frontend/src/components/SearchBar.tsx frontend/src/components/SearchBar.css frontend/src/pages/Home.tsx
git commit -m "feat(frontend): Hero split layout, bỏ slider, gộp form tìm kiếm vào hero"
```

---

## Task 5: FeaturedCourts — ảnh thật + ClickableCard

**Files:**
- Modify: `frontend/src/components/FeaturedCourts.tsx`
- Modify: `frontend/src/components/FeaturedCourts.css` (viết lại toàn bộ)

**Interfaces:**
- Consumes: `Court` type có `image?: string` (Task 2); `ClickableCard` từ `@astryxdesign/core/ClickableCard`; `Grid` từ `@astryxdesign/core/Grid`; `VStack` từ `@astryxdesign/core/VStack`; `HStack` từ `@astryxdesign/core/HStack`; `Heading`, `Text` từ `@astryxdesign/core/Text`; `Badge` từ `@astryxdesign/core/Badge`; `AspectRatio` từ `@astryxdesign/core/AspectRatio`.
- Produces: không.

- [ ] **Step 1: Viết `FeaturedCourts.tsx` mới**

```tsx
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Badge} from '@astryxdesign/core/Badge';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { DEMO_COURTS, formatPrice } from '../data/demoCourts';
import './FeaturedCourts.css';

export function FeaturedCourts() {
  const courts = DEMO_COURTS.slice(0, 4);

  return (
    <section className="featured" aria-labelledby="featured-title">
      <div className="featured__inner">
        <div className="featured__head">
          <div className="featured__head-text">
            <Heading level={2} id="featured-title">
              Sân cầu lông nổi bật hôm nay
            </Heading>
            <Text type="supporting">
              4 cụm sân có lượt đặt nhiều nhất trong ngày.
            </Text>
          </div>
          <a className="featured__more" href="/tim-san">
            Xem tất cả <span aria-hidden="true">→</span>
          </a>
        </div>

        <Grid columns={{minWidth: 250, max: 4}} gap={4} className="featured__grid">
          {courts.map((court) => (
            <ClickableCard
              key={court.id}
              label={`Đặt sân ${court.name}`}
              href="/tim-san"
              padding={0}
              className="featured__card"
            >
              <AspectRatio ratio={16 / 10} fit="cover" className="featured__media">
                {court.image ? (
                  <img
                    src={court.image}
                    alt={`Sân ${court.name}`}
                    width={960}
                    height={600}
                    loading="lazy"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${court.imageGradient[0]} 0%, ${court.imageGradient[1]} 100%)`,
                    }}
                  />
                )}
              </AspectRatio>

              <VStack gap={2} className="featured__body">
                <HStack gap={2} align="start">
                  <Heading level={3} maxLines={1} className="featured__name">
                    {court.name}
                  </Heading>
                  <Text type="supporting" weight="bold" className="featured__rating">
                    {court.rating}★
                  </Text>
                </HStack>

                <Text type="supporting" maxLines={1}>{court.district}</Text>

                <HStack gap={3} justify="between" className="featured__meta">
                  <Text type="supporting" weight="semibold" className="featured__avail">
                    Trống lúc {court.nextAvailable}
                  </Text>
                  <Text type="body" weight="semibold" className="featured__price">
                    từ {formatPrice(court.priceFrom)}/giờ
                  </Text>
                </HStack>

                <Badge variant="teal" label={`${court.courtsCount} sân`} />
              </VStack>
            </ClickableCard>
          ))}
        </Grid>
      </div>
    </section>
  );
}
```

> **Props `HStack` đã kiểm chứng:** `align` = cross-axis (vertical), `justify` = main-axis (horizontal). Dùng `justify="between"` để đẩy 2 phần sang 2 đầu. `align="start"` để canh đỉnh.
>
> **Review Focus #4:** `Heading maxLines={1}` cắt tên sân bằng ellipsis; cột rating là `Text` riêng trong `HStack` nên không thể đè lên tên.
>
> **Contrast:** `.featured__rating` dùng `--cl-teal` (4.9:1), không dùng cam `#f97316` (2.8:1). `.featured__avail` cũng dùng `--cl-teal`.
>
> `ClickableCard` `label` là bắt buộc (accessibility) — dùng "Đặt sân {tên}".

- [ ] **Step 2: Viết `FeaturedCourts.css` mới (thay toàn bộ)**

```css
/* ============================================================
   FeaturedCourts — ảnh thật, hover lift 2px, zoom ảnh 1.03.
   ============================================================ */

.featured {
  width: 100%;
  background: var(--surface-1);
}

.featured__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--s-12) var(--s-6);
}

.featured__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-4);
  margin-bottom: var(--s-6);
  flex-wrap: wrap;
}

.featured__head-text {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  min-width: 0;
}

.featured__more {
  font-size: 14px;
  font-weight: 600;
  color: var(--cl-teal);
  white-space: nowrap;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

.featured__more:hover {
  color: var(--cl-teal-hover);
}

.featured__grid {
  align-items: stretch;
}

.featured__card {
  overflow: hidden;
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.featured__media {
  overflow: hidden;
}

.featured__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.featured__body {
  padding: var(--s-4);
  gap: var(--s-2);
  flex: 1 1 auto;
}

.featured__name {
  min-width: 0;
  flex: 1 1 auto;
}

.featured__rating {
  color: var(--cl-teal);
  flex: 0 0 auto;
  white-space: nowrap;
}

.featured__avail {
  color: var(--cl-teal);
  min-width: 0;
}

.featured__price {
  color: var(--ink-0);
  white-space: nowrap;
  flex: 0 0 auto;
}

/* Hover: nâng card 2px + zoom ảnh trong khung */
@media (hover: hover) and (pointer: fine) {
  .featured__card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  }
  .featured__card:hover .featured__media img {
    transform: scale(1.03);
  }
}

@media (prefers-reduced-motion: reduce) {
  .featured__card:hover {
    transform: none;
  }
  .featured__media img {
    transition: none;
  }
}

@media (max-width: 560px) {
  .featured__inner {
    padding: var(--s-8) var(--s-4);
  }
}
```

- [ ] **Step 3: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/`:
- 4 thẻ sân có **ảnh thật** (không còn gradient tổng hợp).
- Tên sân dài bị cắt bằng "…", **không đè lên** cột rating.
- Số "4.7★" màu teal, đọc rõ trên nền trắng.
- Hover (desktop): card nâng lên 2px, ảnh zoom nhẹ.
- 4 ảnh **không trùng nhau**.

```bash
git add frontend/src/components/FeaturedCourts.tsx frontend/src/components/FeaturedCourts.css
git commit -m "feat(frontend): thẻ sân dùng ảnh thật + ClickableCard + hover lift"
```

---

## Task 6: CitiesSection + PricingSection (mới)

**Files:**
- Modify: `frontend/src/components/CitiesSection.tsx`
- Modify: `frontend/src/components/CitiesSection.css` (viết lại toàn bộ)
- Create: `frontend/src/components/PricingSection.tsx`
- Create: `frontend/src/components/PricingSection.css`
- Modify: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: `AREAS` có `image` (Task 2); `Grid` từ `@astryxdesign/core/Grid`; `Card` từ `@astryxdesign/core/Card`; `ClickableCard` từ `@astryxdesign/core/ClickableCard`; `VStack` từ `@astryxdesign/core/VStack`; `Heading`, `Text` từ `@astryxdesign/core/Text`; `Badge` từ `@astryxdesign/core/Badge`; `Button` từ `@astryxdesign/core/Button`; `AspectRatio` từ `@astryxdesign/core/AspectRatio`.
- Produces: `<section id="bang-gia">` — điểm neo cho link "Bảng giá" ở Header (Task 3) và nút "Xem bảng giá" ở Hero (Task 4).

- [ ] **Step 1: Viết `CitiesSection.tsx` mới**

```tsx
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { AREAS } from '../data/demoCourts';
import './CitiesSection.css';

const CITY_BLURBS: Record<string, { count: string; tag: string }> = {
  hanoi:    { count: '120+ sân', tag: 'Trung tâm & ngoại thành' },
  hcm:      { count: '180+ sân', tag: 'Quận trung tâm' },
  danang:   { count: '40+ sân',  tag: 'View biển Đà Nẵng' },
  haiphong: { count: '30+ sân',  tag: 'Hải Phòng' },
  cantho:   { count: '20+ sân',  tag: 'Miền Tây' },
};

export function CitiesSection() {
  const cities = AREAS.filter((a) => a.id !== 'all');

  return (
    <section className="cities" aria-labelledby="cities-title">
      <div className="cities__inner">
        <div className="cities__head">
          <Heading level={2} id="cities-title">
            Sân cầu lông ở Hà Nội, TP.HCM và Đà Nẵng
          </Heading>
          <Text type="supporting">
            Chọn khu vực để xem sân trống ngay.
          </Text>
        </div>

        <Grid columns={{minWidth: 190, max: 5}} gap={4}>
          {cities.map((city) => {
            const blurb = CITY_BLURBS[city.id];
            return (
              <ClickableCard
                key={city.id}
                label={`Tìm sân ở ${city.label}`}
                href="/tim-san"
                padding={0}
                className="cities__card"
              >
                <AspectRatio ratio={3 / 2} fit="cover" className="cities__media">
                  <img
                    src={city.image}
                    alt={`Sân cầu lông tại ${city.label}`}
                    width={960}
                    height={640}
                    loading="lazy"
                  />
                </AspectRatio>
                <VStack gap={1} className="cities__body">
                  <Text type="body" weight="semibold">{city.label}</Text>
                  {blurb && (
                    <Text type="supporting">{blurb.count} · {blurb.tag}</Text>
                  )}
                </VStack>
              </ClickableCard>
            );
          })}
        </Grid>
      </div>
    </section>
  );
}
```

> `AREAS` là `as const` → `city.image` có kiểu literal string, hợp lệ với `src` của `<img>`. Sau `filter(a => a.id !== 'all')`, TypeScript **không** tự thu hẹp union — nếu `tsc` báo lỗi `image` không tồn tại trên `all`, dùng:
> ```ts
> const cities = AREAS.filter((a) => a.id !== 'all') as ReadonlyArray<{
>   id: string; label: string; count: number; image: string;
> }>;
> ```

- [ ] **Step 2: Viết `CitiesSection.css` mới (thay toàn bộ)**

```css
/* ============================================================
   CitiesSection — ảnh 3:2 mỗi thẻ, tag được phép xuống dòng.
   ============================================================ */

.cities {
  width: 100%;
  background: var(--surface-0);
}

.cities__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--s-12) var(--s-6);
}

.cities__head {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  margin-bottom: var(--s-6);
}

.cities__card {
  overflow: hidden;
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cities__media {
  overflow: hidden;
}

.cities__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.cities__body {
  padding: var(--s-3) var(--s-4) var(--s-4);
  gap: 2px;
}

.cities__body > * {
  /* Tag phải xuống dòng được ở viewport hẹp — bỏ nowrap */
  white-space: normal;
  overflow-wrap: break-word;
}

@media (hover: hover) and (pointer: fine) {
  .cities__card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  }
  .cities__card:hover .cities__media img {
    transform: scale(1.03);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cities__card:hover { transform: none; }
  .cities__media img { transition: none; }
}

@media (max-width: 560px) {
  .cities__inner {
    padding: var(--s-8) var(--s-4);
  }
}
```

> **Review Focus #5:** `.cities__body > *` bỏ `white-space: nowrap` → tag "120+ sân · Trung tâm & ngoại thành" xuống dòng ở 320px, không tràn.

- [ ] **Step 3: Tạo `PricingSection.tsx`**

```tsx
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import './PricingSection.css';

type Slot = {
  id: string;
  name: string;
  range: string;
  price: string;
  perks: string[];
  badge?: string;
};

const SLOTS: Slot[] = [
  {
    id: 'morning',
    name: 'Ca sáng',
    range: '5:00 – 12:00',
    price: '55.000đ – 80.000đ',
    perks: ['Sân trống nhiều, ít kẹt', 'Phù hợp tập buổi sớm', 'Giá rẻ nhất trong ngày'],
  },
  {
    id: 'afternoon',
    name: 'Ca chiều',
    range: '12:00 – 17:00',
    price: '70.000đ – 100.000đ',
    perks: ['Ánh sáng tự nhiên', 'Hợp đặt cụm sân giữa tuần'],
    badge: 'Phổ biến',
  },
  {
    id: 'evening',
    name: 'Ca tối',
    range: '17:00 – 24:00',
    price: '90.000đ – 120.000đ',
    perks: ['Khung giờ được đặt nhiều nhất', 'Có sân trong nhà máy lạnh', 'Giá cao nhất trong ngày'],
  },
];

export function PricingSection() {
  return (
    <section className="pricing" aria-labelledby="pricing-title">
      <div className="pricing__inner">
        <div className="pricing__head">
          <Heading level={2} id="pricing-title">
            Bảng giá đặt sân theo khung giờ
          </Heading>
          <Text type="supporting">
            Giá tính theo giờ, mỗi cụm sân có thể có mức khác nhau.
          </Text>
        </div>

        <Grid columns={{minWidth: 220, max: 3}} gap={4}>
          {SLOTS.map((slot) => (
            <Card key={slot.id} className="pricing__card">
              <VStack gap={3}>
                <div className="pricing__card-head">
                  <VStack gap={0}>
                    <Heading level={3}>{slot.name}</Heading>
                    <Text type="supporting">{slot.range}</Text>
                  </VStack>
                  {slot.badge && <Badge variant="orange" label={slot.badge} />}
                </div>

                <Text type="display-3" weight="bold" className="pricing__price">
                  {slot.price}
                </Text>

                <ul className="pricing__perks">
                  {slot.perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>

                <Button label="Xem sân theo ca này" variant="secondary" href="/tim-san" />
              </VStack>
            </Card>
          ))}
        </Grid>
      </div>
    </section>
  );
}
```

> **Giá lấy từ dữ liệu thật:** `DEMO_COURTS` có `priceFrom` từ 55.000 (c-006) → 120.000 (c-003). Ba khoảng giá trên bám đúng min/max của dataset. Không bịa thêm mức nào ngoài dataset.

- [ ] **Step 4: Tạo `PricingSection.css`**

```css
/* ============================================================
   PricingSection — 3 thẻ khung giờ.
   ============================================================ */

.pricing {
  width: 100%;
  background: var(--surface-1);
}

.pricing__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--s-12) var(--s-6);
}

.pricing__head {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  margin-bottom: var(--s-6);
}

.pricing__card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pricing__card > * {
  flex: 1 1 auto;
}

.pricing__card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
}

.pricing__price {
  color: var(--cl-teal);
}

.pricing__perks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  font-size: 14px;
  color: var(--ink-1);
}

@media (max-width: 560px) {
  .pricing__inner {
    padding: var(--s-8) var(--s-4);
  }
}
```

- [ ] **Step 5: Ghép `PricingSection` vào `Home.tsx`**

Thêm `import { PricingSection } from '../components/PricingSection';` và `<PricingSection />` giữa `<FeaturedCourts />` và `<CitiesSection />`.

- [ ] **Step 6: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/`:
- Có section "Bảng giá đặt sân theo khung giờ" với 3 thẻ Sáng/Chiều/Tối.
- Mỗi thẻ có giá + 3 tiện ích + nút.
- Mỗi thẻ thành phố có ảnh 3:2, 5 ảnh không trùng nhau.
- Click "Xem sân theo ca này" → sang `/tim-san`.
- Ở 320px: tag thành phố xuống dòng, không tràn ngang.

```bash
git add frontend/src/components/CitiesSection.tsx frontend/src/components/CitiesSection.css frontend/src/components/PricingSection.tsx frontend/src/components/PricingSection.css frontend/src/pages/Home.tsx
git commit -m "feat(frontend): thêm section Bảng giá, CitiesSection dùng ảnh thật"
```

---

## Task 7: FaqSection — ảnh, CTA, 2 khối điều khoản

**Files:**
- Modify: `frontend/src/components/FaqSection.tsx`
- Modify: `frontend/src/components/FaqSection.css` (viết lại toàn bộ)

**Interfaces:**
- Consumes: `Collapsible`, `CollapsibleGroup` từ `@astryxdesign/core/Collapsible`; `Grid` từ `@astryxdesign/core/Grid`; `VStack` từ `@astryxdesign/core/VStack`; `Heading`, `Text` từ `@astryxdesign/core/Text`; `Button` từ `@astryxdesign/core/Button`; `AspectRatio` từ `@astryxdesign/core/AspectRatio`.
- Produces: anchor `#faq` (section), `#dieu-khoan`, `#chinh-sach` — điểm neo cho link Footer (Task 3).

- [ ] **Step 1: Viết `FaqSection.tsx` mới**

```tsx
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import './FaqSection.css';

const FAQS = [
  {
    q: 'Làm sao đặt sân trên Cầu Lông dee?',
    a: 'Chọn khu vực, ngày, giờ ở thanh tìm kiếm → chọn sân trống → điền thông tin → thanh toán online. Xác nhận trong vòng 30 giây.',
  },
  {
    q: 'Có thể hủy hoặc đổi lịch không?',
    a: 'Có. Hủy miễn phí trước 4 giờ so với giờ đã đặt. Đổi lịch 1 lần cho mỗi booking, không phụ thu.',
  },
  {
    q: 'Hình thức thanh toán nào được hỗ trợ?',
    a: 'VNPay, MoMo, thẻ ATM nội địa, Visa/Master và thanh toán tiền mặt tại sân (tùy chủ sân).',
  },
  {
    q: 'Sân có sẵn cho khách vãng lai không?',
    a: 'Tất cả sân trên Cầu Lông dee đều nhận khách vãng lai. Bạn chỉ cần tài khoản Cầu Lông dee để xác nhận đặt sân.',
  },
];

export function FaqSection() {
  return (
    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="faq__inner">
        <Grid columns={{minWidth: 300, max: 2}} gap={8} align="start">
          <VStack gap={5}>
            <div className="faq__head">
              <Heading level={2} id="faq-title">
                Cách đặt sân, đổi lịch và hoàn tiền
              </Heading>
              <Text type="supporting">
                Giải đáp nhanh những gì khách hỏi nhiều nhất.
              </Text>
            </div>

            <CollapsibleGroup type="single" hasDividers>
              {FAQS.map((item, idx) => (
                <Collapsible
                  key={item.q}
                  value={item.q}
                  defaultIsOpen={idx === 0}
                  trigger={<Text type="body" weight="semibold">{item.q}</Text>}
                >
                  <Text type="supporting" className="faq__a">
                    {item.a}
                  </Text>
                </Collapsible>
              ))}
            </CollapsibleGroup>

            <div className="faq__terms" id="dieu-khoan">
              <Heading level={3}>Điều khoản đặt sân</Heading>
              <Text type="supporting">
                Giá hiển thị là giá theo giờ và chưa gồm phí dịch vụ. Khung giờ đặt sân giữ nguyên trong
                vòng 15 phút sau giờ bắt đầu. Nếu sân bị đóng hoặc không thể phục vụ vì lý do bất khả kháng,
                bạn được hoàn lại toàn bộ số tiền đã thanh toán trong 24 giờ.
              </Text>
            </div>

            <div className="faq__terms" id="chinh-sach">
              <Heading level={3}>Chính sách bảo mật</Heading>
              <Text type="supporting">
                Cầu Lông dee chỉ dùng thông tin bạn cung cấp để xác nhận đặt sân và gửi thông báo liên quan.
                Mật khẩu được lưu ở dạng mã hóa và không bao giờ chia sẻ cho chủ sân. Bạn có thể yêu cầu
                xoá tài khoản bất kỳ lúc nào qua mục Hỗ trợ.
              </Text>
            </div>

            <Button label="Tìm sân trống" variant="primary" href="/tim-san" />
          </VStack>

          <div className="faq__media">
            <AspectRatio ratio={3 / 4} fit="cover">
              <img
                src="/img/court-04.jpg"
                alt="Sân cầu lông trong nhà thi đấu"
                width={960}
                height={1280}
                loading="lazy"
              />
            </AspectRatio>
          </div>
        </Grid>
      </div>
    </section>
  );
}
```

> **Props `CollapsibleGroup` đã kiểm chứng:** `type: 'single' | 'multiple'`, `hasDividers?: boolean`, `defaultValue?: string | string[]`.
>
> `hasDividers` = danh sách FAQ phẳng có hairline, **không** bọc `Card` (docs: "Pair with bare Collapsible children"). `type="single"` = accordion (mở 1 → đóng 1), khớp hành vi hiện tại (`openIdx` chỉ giữ 1).
>
> `Collapsible` cần `trigger` (bắt buộc) và `value` để group điều phối. `defaultIsOpen` bị group bỏ qua khi `value` được set — để mở mặc định câu đầu, dùng `defaultValue={FAQS[0].q}` trên `CollapsibleGroup` **thay vì** `defaultIsOpen` trên `Collapsible`.

- [ ] **Step 2: Viết `FaqSection.css` mới (thay toàn bộ)**

```css
/* ============================================================
   FaqSection — split: FAQ trái, ảnh phải. Có CTA ở cuối.
   ============================================================ */

.faq {
  width: 100%;
  background: var(--surface-1);
}

.faq__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--s-12) var(--s-6);
}

.faq__head {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

.faq__a {
  padding-bottom: var(--s-3);
  max-width: 70ch;
}

.faq__terms {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding-top: var(--s-4);
  border-top: 1px solid var(--line);
  scroll-margin-top: 96px;
}

.faq__media {
  border-radius: var(--r-lg);
  overflow: hidden;
  position: sticky;
  top: 96px;
}

.faq__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 900px) {
  .faq__media {
    position: static;
    order: -1;
  }
}

@media (max-width: 560px) {
  .faq__inner {
    padding: var(--s-8) var(--s-4);
  }
}
```

> `scroll-margin-top: 96px` trên `.faq__terms` để anchor `#dieu-khoan` / `#chinh-sach` không bị header sticky che.

- [ ] **Step 3: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/`:
- FAQ accordion: mở 1 → đóng 1 (accordion đúng như cũ).
- Có ảnh ở cột phải, CTA "Tìm sân trống" ở cuối section.
- Click link "Điều khoản" / "Chính sách" ở footer → nhảy tới đúng 2 khối khác nhau, không bị header che.
- Tiêu đề đã đổi sang "Cách đặt sân, đổi lịch và hoàn tiền".

```bash
git add frontend/src/components/FaqSection.tsx frontend/src/components/FaqSection.css
git commit -m "feat(frontend): FAQ split có ảnh, accordion, CTA và khối điều khoản"
```

---

## Task 8: Đồng bộ `/tim-san` — CourtCard + CourtDiscovery

**Files:**
- Modify: `frontend/src/components/CourtCard.tsx`
- Modify: `frontend/src/components/CourtCard.css` (viết lại toàn bộ)
- Modify: `frontend/src/pages/CourtDiscovery.tsx`
- Modify: `frontend/src/pages/CourtDiscovery.css`

**Interfaces:**
- Consumes: `Court.image?: string` (Task 2); `Card` từ `@astryxdesign/core/Card`; `Badge` từ `@astryxdesign/core/Badge`; `VStack` từ `@astryxdesign/core/VStack`; `HStack` từ `@astryxdesign/core/HStack`; `Heading`, `Text` từ `@astryxdesign/core/Text`; `Button` từ `@astryxdesign/core/Button`; `AspectRatio` từ `@astryxdesign/core/AspectRatio`.
- Produces: không.

> Vì theme áp dụng cả website, trang này phải dùng cùng token/component, nếu không hai trang sẽ trông khác nhau. **Giữ nguyên logic**: filter, phân trang, bản đồ, toast — chỉ đổi lớp trình bày.

- [ ] **Step 1: Viết `CourtCard.tsx` mới**

```tsx
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Court, formatPrice } from '../data/demoCourts';
import './CourtCard.css';

type Props = {
  court: Court;
  onBook: (court: Court) => void;
};

export function CourtCard({ court, onBook }: Props) {
  const isGoldenHour = (() => {
    const [h] = court.nextAvailable.split(':').map(Number);
    return h >= 5 && h <= 7;
  })();

  return (
    <Card className="card">
      <AspectRatio ratio={16 / 10} fit="cover" className="card__media">
        {court.image ? (
          <img
            src={court.image}
            alt={`Sân ${court.name}`}
            width={960}
            height={600}
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${court.imageGradient[0]} 0%, ${court.imageGradient[1]} 100%)`,
            }}
          />
        )}
      </AspectRatio>

      <VStack gap={3} className="card__body">
        <VStack gap={1}>
          <Heading level={3} maxLines={1}>{court.name}</Heading>
          <Text type="supporting" maxLines={1}>{court.district}</Text>
        </VStack>

        <HStack gap={2} align="start">
          <Badge variant="teal" label={`${court.rating.toFixed(1)}★`} />
          {court.isHot && <Badge variant="orange" label="Hot" />}
          {court.isNew && <Badge variant="blue" label="Mới" />}
          {isGoldenHour && <Badge variant="yellow" label="Giờ vàng" />}
        </HStack>

        <HStack gap={3} justify="between" className="card__meta">
          <Text type="supporting"><strong>{court.courtsCount}</strong> sân</Text>
          <Text type="supporting">Trống <strong>{court.nextAvailable}</strong></Text>
        </HStack>

        <Text type="supporting" maxLines={2}>
          {court.amenities.slice(0, 3).join(' · ')}
        </Text>

        <HStack gap={3} justify="between" className="card__foot">
          <VStack gap={0}>
            <Text type="body" weight="bold">{formatPrice(court.priceFrom)}</Text>
            <Text type="supporting">/giờ</Text>
          </VStack>
          <Button
            label="Đặt sân"
            variant="primary"
            onClick={() => onBook(court)}
          />
        </HStack>
      </VStack>
    </Card>
  );
}
```

> `Badge` variant hợp lệ: `neutral | info | success | warning | error | blue | cyan | green | orange | pink | purple | red | teal | yellow`. `teal` dùng cho rating (đạt contrast), `orange` cho "Hot" (nổi bật, có chủ ý).
>
> Không dùng `variant="accent"` — không tồn tại.
>
> `Text` không hỗ trợ HTML `<strong>` bên trong qua prop children kiểu string — `children` là `ReactNode` nên `<strong>` bên trong hoạt động.

- [ ] **Step 2: Viết `CourtCard.css` mới (thay toàn bộ)**

```css
/* ============================================================
   CourtCard — dùng Card + AspectRatio của Astryx, ảnh thật.
   ============================================================ */

.card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.card__media {
  overflow: hidden;
}

.card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.card__body {
  padding: var(--s-4);
  gap: var(--s-3);
  flex: 1 1 auto;
}

.card__meta {
  padding-top: var(--s-3);
  border-top: 1px solid var(--line);
}

.card__foot {
  margin-top: auto;
  padding-top: var(--s-3);
  border-top: 1px solid var(--line);
}

@media (hover: hover) and (pointer: fine) {
  .card:hover .card__media img {
    transform: scale(1.03);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card__media img {
    transition: none;
  }
}
```

- [ ] **Step 3: Đồng bộ `CourtDiscovery.tsx`**

Giữ nguyên toàn bộ logic (`useMemo`, filter, phân trang, `handleBook`, `handleFilterChange`, toast). Chỉ đổi phần trình bày:
- Tiêu đề kết quả: `<h2 className="cd__results-title">` → `<Heading level={2}>`
- Tiêu đề bản đồ: `<h2 className="cd__map-title">` → `<Heading level={2}>`
- Nút "Xem tất cả sân" trong empty state → `<Button label="Xem tất cả sân" variant="primary" onClick={...} />`
- Toast giữ nguyên, nhưng đổi class sang dùng token.

Không thay đổi `QuickSearchBar`, `FilterPanel`, `Pagination`, `MapPanel` trong task này — chúng đã được bọc `@layer app` ở Task 1 Step 7.

- [ ] **Step 4: Đồng bộ `CourtDiscovery.css`**

Thay các giá trị hardcode:
- `background: #f8f9fc` → `var(--surface-1)`
- `border: 1px solid #e5e7eb` → `var(--line)`
- `color: #64748b` → `var(--ink-2)`
- `color: #0f172a` → `var(--ink-0)`
- giữ `transition: ... var(--dur-fast) var(--ease-out)` (token đã có).

- [ ] **Step 5: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/tim-san`:
- Thẻ sân có ảnh thật, badge màu, nút "Đặt sân" nền cam.
- Filter, phân trang, bản đồ vẫn hoạt động như cũ.
- Click "Đặt sân" → toast hiện như cũ.

```bash
git add frontend/src/components/CourtCard.tsx frontend/src/components/CourtCard.css frontend/src/pages/CourtDiscovery.tsx frontend/src/pages/CourtDiscovery.css
git commit -m "feat(frontend): đồng bộ trang tìm sân sang component Astryx"
```

---

## Task 9: Đồng bộ `/dang-nhap`, `/dang-ky` + ảnh OG + index.html

**Files:**
- Modify: `frontend/src/pages/AuthPage.tsx`
- Modify: `frontend/src/pages/AuthLayout.css`
- Modify: `frontend/index.html`

**Interfaces:**
- Consumes: `Button` từ `@astryxdesign/core/Button`; `Text`, `Heading` từ `@astryxdesign/core/Text`; `Card` từ `@astryxdesign/core/Card`; `VStack` từ `@astryxdesign/core/VStack`.
- Produces: không.

> Giữ nguyên **toàn bộ logic auth**: tab login/register, validate, OTP, social buttons, submit. Chỉ đổi lớp trình bày.

- [ ] **Step 1: Đồng bộ `AuthPage.tsx`**

- Form card: `<div className="auth__card">` → `<Card className="auth__card">`
- Tiêu đề: `<h1 className="auth__title">` → `<Heading level={1}>`
- Sub: `<p className="auth__sub">` → `<Text type="supporting">`
- Nút submit: `<button className="auth__submit">` → `<Button label={...} type="submit" variant="primary" isDisabled={...} />`
- Nút gửi OTP: giữ `<button>` vì cần trạng thái disabled riêng + `aria-busy`; chỉ đổi CSS sang token.
- Social buttons: giữ `<a>`/`<button>` vì cần icon từ `lucide-react`; đổi CSS sang token.
- Tabs: giữ `<button>` vì cần `role="tab"` tự quản lý; đổi CSS sang token.

**Không** thay đổi: tên hàm `handleSubmit`, `handleSendOtp`, state, `useAuth`, gọi API.

> `Button` của Astryx có prop `type?: 'button' | 'submit' | 'reset'` và `isDisabled?: boolean` → dùng được cho form submit.

- [ ] **Step 2: Đồng bộ `AuthLayout.css`**

Thay hardcode:
- `background: var(--surface-1)` giữ.
- `border: 1px solid #e5e7eb` → `var(--line)`
- `color: var(--ink-2)` giữ (đã là token).
- `box-shadow: 0 12px 32px rgba(15,23,42,.1)` giữ.
- `.auth__submit { background: var(--cta-0) }` — giữ, token đã đạt AA sau Task 1.
- Gradient nền `.auth` dùng `rgba(5,150,105,.08)` / `rgba(6,182,212,.08)` → giữ (rất nhạt, không gây vấn đề contrast).

- [ ] **Step 3: `index.html` — meta + OG + theme-color + canonical**

Đọc file hiện tại trước. Thêm vào `<head>`:
```html
<meta name="description" content="Cầu Lông dee — tìm sân cầu lông trống gần bạn, xem giá và khung giờ, đặt sân xác nhận trong 30 giây." />
<meta name="theme-color" content="#ffffff" />

<meta property="og:type" content="website" />
<meta property="og:title" content="Cầu Lông dee — Đặt sân cầu lông trong 30 giây" />
<meta property="og:description" content="Tìm sân trống gần bạn, xem giá và khung giờ, đặt ngay. Không gọi điện, không chờ tin nhắn." />
<meta property="og:image" content="/banner_hero2.jpg" />
<meta property="og:locale" content="vi_VN" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Cầu Lông dee — Đặt sân cầu lông trong 30 giây" />
<meta name="twitter:description" content="Tìm sân trống gần bạn, xem giá và khung giờ, đặt ngay." />
<meta name="twitter:image" content="/banner_hero2.jpg" />

<link rel="canonical" href="https://caulongdee.example/" />
```

- Bỏ `theme-color` cũ (`#0d0e10`) nếu có — trang giờ nền sáng.
- Giữ `<title>` và `lang="vi"`.

- [ ] **Step 4: Verify + commit**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npm run dev
```
Mở `http://localhost:5173/dang-nhap`:
- Form hoạt động: chuyển tab, validate lỗi hiện đúng, gửi OTP mock chạy, social button render.
- Card dùng style Astryx (bo góc mềm, viền mảnh).
- Nút submit nền cam, chữ trắng, ≥4.5:1.

```bash
git add frontend/src/pages/AuthPage.tsx frontend/src/pages/AuthLayout.css frontend/index.html
git commit -m "feat(frontend): đồng bộ trang đăng nhập + meta OG và canonical"
```

---

## Task 10: Verify tổng thể + README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tất cả task trước.
- Produces: không.

- [ ] **Step 1: Type-check + build + doctor**

```powershell
cd frontend
npx tsc --noEmit
npm run build
npx astryx doctor
```
Expected: tsc exit 0, build thành công, `astryx doctor` **không có `fail`**.

- [ ] **Step 2: Chạy audit `consistency.mjs`**

Chrome có sẵn tại `C:\Program Files\Google\Chrome\Application\chrome.exe`. Cần `npm run dev` đang chạy ở terminal khác.

```powershell
cd D:\hocHanh\project\QL_san_cau_long
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
node .agents\skills\design-taste-frontend\scripts\consistency.mjs http://localhost:5173/ --quick --no-rhythm --profile .taste-skill\chrome-profile
```
Expected: báo cáo với **0 FAIL** ngoài các FAIL đã được liệt kê là ngoại lệ có chủ ý trong spec §9 (`section-height` / `one-section`).

Đối chiếu từng FAIL/WARN còn lại với spec §9 — **mọi FAIL còn lại phải nằm trong bảng ngoại lệ đó**. Nếu có FAIL mới → sửa rồi chạy lại, không bỏ qua.

> Nếu script không tồn tại ở đường dẫn trên, kiểm tra `.agents/skills/design-taste-frontend/scripts/` trước khi chạy.

- [ ] **Step 3: Kiểm tra thủ công các điểm chưa có test tự động**

Mở `http://localhost:5173/` và kiểm tra lần lượt:
- Hero không còn slider (đợi 6 giây, ảnh không đổi).
- Form tìm kiếm không overlap hero.
- Ở 390px: form xếp dọc, không tràn ngang.
- Ở 320px: tag thành phố xuống dòng.
- Tên sân dài cắt bằng ellipsis, không đè lên rating.
- Link Header/Footer: không có `href="#"` nào còn lại; click thử từng link.
- Anchor `#bang-gia`, `#faq`, `#dieu-khoan`, `#chinh-sach` nhảy đúng vị trí, không bị header sticky che.
- DevTools → Layers: rule cũ nằm trong layer `app`, không có rule unlayered đè lên component Astryx.

- [ ] **Step 4: Cập nhật `README.md`**

Trong mục **"📈 Tiến trình dự án"**: tìm hạng mục liên quan giao diện ở giai đoạn 3 (Tìm & đặt sân) và đánh `✅` cho "Trang chủ" nếu đã ở trạng thái xong.

Trong mục **"🚀 Công nghệ sử dụng"**, thêm vào mục frontend:
- `@astryxdesign/core` — design system component (174 component, React 19)
- `@astryxdesign/cli` — CLI docs/component/theme
- `@astryxdesign/theme-neutral` — theme nền tảng (theme riêng `caulongdee` extends từ đây)

Không thêm mục vào "🌐 API Endpoints" — không có endpoint mới.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: cập nhật tiến trình và công nghệ sau redesign Astryx"
```

---

## Appendix: Dependency đã có (không cần cài thêm)

Các package sau **đã được cài và có trong `frontend/package.json`** — task này chỉ dùng, không cài lại:

```
"@astryxdesign/core": "^0.7.13"
"@astryxdesign/theme-neutral": "^0.7.13"
"@astryxdesign/cli": "^0.7.13"        (devDependency)
"@stylexjs/stylex": "^0.19.1"
"framer-motion": "^14.1.0"
"lucide-react": "^1.55.0"
```

Script CLI đã có trong `package.json`:
```json
"astryx": "node node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs"
```
Dùng `npm run astryx -- <cmd>` thay vì `npx astryx <cmd>` (tránh lỗi path khi chạy trong project).

## Appendix: Facts đã kiểm chứng (không cần tra lại khi thực thi)

| Điều | Kết quả kiểm chứng |
|---|---|
| `npx astryx theme palette generate` | Cần config JSON **không BOM**, nếu có BOM sẽ lỗi `Unexpected token '﻿'` |
| `npx astryx theme build <file.ts>` | Sinh `<name>.css`, `<name>.css.d.ts`, `<name>.js`, `<name>.d.ts`, `<name>.variants.d.ts` cạnh source |
| `npx astryx theme add caulongdee` | **Lỗi** `Unknown theme` — lệnh này chỉ nhận slug có sẵn trong registry |
| Theme CSS output | Tự khai `@layer reset, astryx-base, astryx-theme;` → ta thêm `app` ở cuối |
| `astryx.css` | Ở `@layer astryx-base` |
| `reset.css` của Astryx | Đã reset `button` (font inherit, background transparent), `img` (block, max-width 100%), `a` (inherit) |
| `Heading` / `Text` | `className` và `id` đều nhận qua `BaseProps` (đã kiểm chứng `BaseProps` giữ `className`, `style`, `id`) |
| `Badge` | `label` bắt buộc, `variant` trong danh sách đã liệt kê ở Global Constraints |
| `Button` | `label` bắt buộc; có `href`, `as`, `type`, `isDisabled`; variants: primary/secondary/ghost/destructive |
| `HStack` | `align` = cross-axis (dọc), `justify` = main-axis (ngang) |
| `VStack` | `gap`/`hAlign`/`vAlign`/`justify`/`align`; `width`/`maxWidth` |
| `Grid` | `columns: number \| {minWidth, max?}`, `gap`, `align`, `justify`, `rowGap`, `columnGap` |
| `AspectRatio` | `ratio` (number), `fit: 'cover' \| 'contain' \| 'center'`, `shape` |
| `CollapsibleGroup` | `type: 'single' \| 'multiple'`, `hasDividers`, `defaultValue`, `density` |
| `Collapsible` | `trigger` bắt buộc, `value`, `defaultIsOpen`, `chevronPosition` |
| `Text` | `type` (không phải `variant`): body/large/label/supporting/code/display-1..3/inherit; `color`, `weight`, `maxLines`, `textWrap` |
| `Section` | `variant: section \| transparent \| muted`, `padding` |
| Theme tokens | `--color-text-tertiary` **không tồn tại** — dùng `--color-text-secondary` / `--color-text-disabled` |
| Theme `localTokens` | Nhận **bất kỳ** tên CSS custom property hợp lệ (`--cl-teal`) — không bị validate theo danh sách token chuẩn |
| Theme CSS output | Token đặt trong `@scope ([data-astryx-theme="caulongdee"]) to ([data-astryx-theme]) { :scope { … } }` → kế thừa xuống toàn bộ cây DOM. Theme component set `data-astryx-theme` lên `<html>` khi là root theme |
| Theme components key | `button`, `card`, `clickable-card`, `badge`, `heading`, `text`, `section`, `item`, `link`, `icon` |
| `astryx doctor` | 0 fail; warn "no theme appears wired" là bình thường với local fork |

# Trang cá nhân phong cách Facebook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi `/tai-khoan` từ form tối giản thành trang profile phong cách Facebook: ảnh bìa + avatar, 4 tab (Bài viết · Kèo đã đặt · Khoảnh khắc · Cài đặt), toàn bộ dữ liệu là demo, không đụng backend.

**Architecture:** `AccountPage.tsx` giữ vai trò container: đọc `useAuth()`, quản lý tab qua `useSearchParams` (`?tab=`), và giữ state ảnh preview. 4 component con trong `src/components/profile/` mỗi component một tab. Dữ liệu demo nằm ở file riêng `src/data/demoProfile.ts`, tái dùng nguyên xi `FeedPostCard` / `FeedComposerModal` / `feedUtils` của feed trang chủ để giao diện đồng bộ.

**Tech Stack:** React 19 · TypeScript · React Router 7 (`useSearchParams`) · `@astryxdesign/core` 0.7.13 (`Card`, `Badge`, `TabList`/`Tab`, `Dialog`, `EmptyState`, `Button`, `Avatar`) · `lucide-react` · Vitest + Testing Library · CSS thuần trong `@layer app`.

**Spec:** `docs/superpowers/specs/2026-11-17-facebook-style-profile-design.md`

---

## Global Constraints

- **Chỉ frontend.** Không tạo bảng DB, entity, migration, endpoint. Backend không đổi.
- **Trả lời + comment tiếng Việt.** Tên biến/hàm/component tiếng Anh.
- **Không dùng `any`.** Mọi payload có type riêng.
- **CSS cùng file component:** `X.tsx` + `X.css`, toàn bộ trong `@layer app`.
- **Màu lấy từ token**, không hardcode. Có sẵn: `--fb-blue`, `--fb-blue-soft`, `--fb-green`, `--fb-green-soft`, `--fb-orange`, `--fb-orange-soft`, `--fb-slate`, `--fb-slate-soft`, `--fb-bg`, `--fb-line`, `--fb-ink-0`, `--fb-ink-1`, `--fb-ink-2`, `--fb-radius-card`, `--fb-radius-ctl` (định nghĩa trong `src/themes/caulongdee/caulongdee.css`).
- **`Card` của Astryx áp padding bằng StyleX** → padding phải đặt ở wrapper `div` bên trong, không set padding trực tiếp lên `Card`.
- **`Badge` của Astryx** hỗ trợ variant: `neutral`, `info`, `success`, `warning`, `error`, `blue`, `cyan`, `green`, `orange`, `pink`, `purple`, `red`, `teal`, `yellow`. Theme `caulongdee` đã khai báo `--color-background-*` / `--color-text-*` tương ứng.
- **`Avatar` của Astryx**: size `'xsm'|'sm'|'md'|'lg'|'xl'` → 20/24/36/48/**128** px, hoặc số px chấp nhận trong union `16|20|24|32|36|40|48|60|64|72|96|128|144|180`.
- **`TabList` của Astryx** có 2 pattern: navigation (mặc định → `<nav>` + `data-tab-value` + `aria-current`) và tabs (truyền `role="tablist"` → `<div role="tablist">` + `role="tab"` + `aria-selected` + `panelId`).
- **`Dialog` của Astryx** cần polyfill `HTMLDialogElement.showModal/close` — đã có trong `src/test/setup.ts`.
- **`useToast` của Astryx** cần `LayerProvider` — đã bọc ở `src/main.tsx`.
- **Không đọc/ghi `localStorage` token trong component** — dùng `useAuth()`.
- **`?tab=`** lưu tab trong URL để F5 không mất trạng thái.
- **Test:** `npm test` (vitest run). Type-check: `.\node_modules\.bin\tsc --noEmit`. Build: `npm run build`.

---

## Review Focus

Năm trường hợp input / điều kiện mà spec nhắc tới nhưng không task nào test trực tiếp — mỗi dòng dưới đây được gắn test vào task sở hữu code:

1. **Avatar vỡ khi `avatarUrl` là URL Facebook hết hạn** (link `graph.facebook.com` có thời hạn) → phải fallback về chữ cái đầu, không vỡ layout. *(Task 2 — `ProfileHeader`)*
2. **User đăng ký bằng email/mật khẩu thì `avatarUrl` là `null`** → header phải hiện chữ cái đầu, không hiện ảnh rỗng. *(Task 2)*
3. **`?tab=` chứa giá trị rác** (vd `?tab=xyz`, hoặc user gõ tay) → phải rơi về tab `posts`, không render trang trắng. *(Task 5 — `AccountPage`)*
4. **Chọn ảnh preview rồi chuyển tab rồi quay lại** → ảnh preview vẫn còn (state nâng lên `AccountPage`, không nằm trong component tab). *(Task 5)*
5. **`URL.createObjectURL` không được rò rỉ** → phải `revokeObjectURL` khi ảnh bị thay thế hoặc unmount. *(Task 5)*

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `frontend/src/data/demoProfile.ts` | **Mới.** Types + dữ liệu demo cho profile: bài của tôi, kèo, khoảnh khắc, trình độ. |
| `frontend/src/components/UserAvatar.tsx` | **Sửa.** Thêm size `'xl'` + prop `srcOverride`. |
| `frontend/src/components/feed/FeedPostCard.tsx` | **Sửa.** Thêm prop tuỳ chọn `authorAvatarSrc`. |
| `frontend/src/components/profile/ProfileHeader.tsx` + `.css` | **Mới.** Ảnh bìa, avatar, tên, username, badge, thống kê, nút hành động. |
| `frontend/src/components/profile/ProfileTabs.tsx` | **Mới.** Dải 4 tab (`role="tablist"`). |
| `frontend/src/components/profile/ProfilePosts.tsx` | **Mới.** Tab bài viết. |
| `frontend/src/components/profile/ProfileBookings.tsx` + `.css` | **Mới.** Tab kèo đã đặt. |
| `frontend/src/components/profile/ProfileMoments.tsx` + `.css` | **Mới.** Tab khoảnh khắc. |
| `frontend/src/components/profile/ProfileSettings.tsx` + `.css` | **Mới.** Tab cài đặt (chứa form OTP chuyển từ `AccountPage`). |
| `frontend/src/components/profile/profile.css` | **Mới.** Style dùng chung (shell, panel, empty state). |
| `frontend/src/pages/AccountPage.tsx` + `.css` | **Sửa.** Container: tab state, ảnh preview, render 4 panel. |

---

## Task 1: Dữ liệu demo của trang cá nhân

**Files:**
- Create: `frontend/src/data/demoProfile.ts`
- Test: `frontend/src/data/demoProfile.test.ts`

**Interfaces:**
- Consumes: `FeedPost`, `PostCategory` từ `frontend/src/data/demoPosts.ts`.
- Produces:
  ```ts
  export type ProfileBookingType = 'booking' | 'challenge' | 'recruit';
  export type ProfileBookingStatus = 'upcoming' | 'done';
  export type ProfileBooking = {
    id: string;
    type: ProfileBookingType;
    title: string;
    timeLabel: string;
    area: string;
    priceLabel: string;
    status: ProfileBookingStatus;
    note?: string;
  };
  export type ProfileMoment = {
    id: string;
    image: string;
    caption: string;
    timeLabel: string;
    place: string;
  };
  export const DEMO_MY_POSTS: FeedPost[];
  export const DEMO_MY_BOOKINGS: ProfileBooking[];
  export const DEMO_MY_MOMENTS: ProfileMoment[];
  export const DEMO_SKILL_LEVEL: string;
  export const PROFILE_ROLE_LABEL: Record<string, string>;
  ```

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/data/demoProfile.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {
  DEMO_MY_BOOKINGS,
  DEMO_MY_MOMENTS,
  DEMO_MY_POSTS,
  DEMO_SKILL_LEVEL,
  PROFILE_ROLE_LABEL,
} from './demoProfile';

describe('demoProfile', () => {
  it('có bài viết của tôi, mỗi bài có id khác nhau', () => {
    expect(DEMO_MY_POSTS.length).toBeGreaterThan(0);
    expect(new Set(DEMO_MY_POSTS.map((p) => p.id)).size).toBe(DEMO_MY_POSTS.length);
  });

  it('bài của tôi có đủ 4 loại bài', () => {
    const categories = new Set(DEMO_MY_POSTS.map((p) => p.category));
    expect(categories.size).toBe(4);
  });

  it('có cả 3 loại kèo và cả 2 trạng thái', () => {
    expect(new Set(DEMO_MY_BOOKINGS.map((b) => b.type)).size).toBe(3);
    expect(new Set(DEMO_MY_BOOKINGS.map((b) => b.status)).size).toBe(2);
  });

  it('kèo sắp tới đứng trước kèo đã hoàn thành', () => {
    const firstDone = DEMO_MY_BOOKINGS.findIndex((b) => b.status === 'done');
    const lastUpcoming = DEMO_MY_BOOKINGS.map((b) => b.status).lastIndexOf('upcoming');
    expect(lastUpcoming).toBeLessThan(firstDone);
  });

  it('mọi khoảnh khắc có ảnh và ghi chú', () => {
    for (const m of DEMO_MY_MOMENTS) {
      expect(m.image).toMatch(/^\/img\//);
      expect(m.caption.length).toBeGreaterThan(0);
    }
  });

  it('có nhãn vai trò cho CUSTOMER / ADMIN / EMPLOYEE', () => {
    expect(PROFILE_ROLE_LABEL.CUSTOMER).toBe('Khách');
    expect(PROFILE_ROLE_LABEL.ADMIN).toBe('Chủ sân');
    expect(PROFILE_ROLE_LABEL.EMPLOYEE).toBe('Nhân viên');
  });

  it('trình độ là chuỗi không rỗng', () => {
    expect(DEMO_SKILL_LEVEL.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/data/demoProfile.test.ts
```
Expected: FAIL — `Cannot find module './demoProfile'`.

- [ ] **Step 3: Tạo `frontend/src/data/demoProfile.ts`**

Nội dung phải thỏa các ràng buộc của test ở Step 1:
- `DEMO_MY_POSTS`: **6 bài**, `id` khác nhau, đủ cả 4 `category` (`challenge`, `recruit`, `thought`, `court`). `authorName` đặt tên tạm `"Kieu Văn Sơn"` — `AccountPage` sẽ override bằng tên user thật khi render (xem Task 5). `createdAtLabel` dạng `"2 giờ"`, `"Hôm qua"`, `"3 ngày"`. `image` chỉ dùng ảnh có thật: `/img/court-01.jpg` … `/img/court-04.jpg`, `/img/city-hcm.jpg`.
- `DEMO_MY_BOOKINGS`: **6 kèo**, đủ 3 `type`, đủ 2 `status`. **Sắp xếp `upcoming` trước `done`** (test bắt buộc thứ tự này). Giá trị mẫu:
  - `booking` / `upcoming` — title `"Sân Cầu Lông Quận 1"`, timeLabel `"19:00 – 20:00 · Thứ 7, 22/11"`, area `"Quận 1"`, priceLabel `"80.000đ/giờ"`.
  - `challenge` / `upcoming` — title `"Kèo đôi 21h tối thứ 7"`, note `"Chờ đối thủ"`.
  - `recruit` / `upcoming` — title `"Cần thêm 1 bạn nữ đánh đôi"`, note `"Đã đủ 2/3 người"`.
  - 3 kèo `done` (mỗi type 1 kèo).
- `DEMO_MY_MOMENTS`: **5 khoảnh khắc**, `image` bắt đầu bằng `/img/`, `caption` khác rỗng, có `timeLabel` + `place`.
- `DEMO_SKILL_LEVEL = 'Trình độ B'`.
- `PROFILE_ROLE_LABEL: Record<string, string>` = `{CUSTOMER: 'Khách', ADMIN: 'Chủ sân', EMPLOYEE: 'Nhân viên'}`.

Mọi bài/kèo/khoảnh khắc có `id` duy nhất, tiền tố `mp-` (post), `mb-` (booking), `mm-` (moment).

- [ ] **Step 4: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/data/demoProfile.test.ts
```
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/data/demoProfile.ts frontend/src/data/demoProfile.test.ts
git commit -m "feat(profile): them du lieu demo cho trang ca nhan"
```

---

## Task 2: `UserAvatar` hỗ trợ size lớn + ảnh preview

**Files:**
- Modify: `frontend/src/components/UserAvatar.tsx`
- Modify: `frontend/src/components/UserAvatar.test.tsx`

**Interfaces:**
- Consumes: `Avatar` của `@astryxdesign/core/Avatar`; `shortDisplayName` từ `../utils/displayName`.
- Produces:
  ```ts
  export type UserAvatarProps = {
    user: {
      fullName?: string | null;
      avatarUrl?: string | null;
      username?: string | null;
    } | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Ảnh preview tạm (objectURL) — ghi đè avatarUrl khi có. */
    srcOverride?: string | null;
    className?: string;
  };
  export function UserAvatar(props: UserAvatarProps): JSX.Element;
  ```
  `size="xl"` → 128px. `srcOverride` có giá trị → dùng làm `src`; `null`/`undefined` → fallback về `user.avatarUrl`.

- [ ] **Step 1: Viết test fail**

Thêm vào `frontend/src/components/UserAvatar.test.tsx`:

```tsx
it("size='xl' dựng avatar 128px", () => {
  const { container } = render(
    <UserAvatar user={{ fullName: 'Kieu Van Son' }} size="xl" />,
  );
  const root = container.firstElementChild as HTMLElement;
  expect(root.getBoundingClientRect().width).toBe(128);
});

it('srcOverride ghi đè avatarUrl', () => {
  const { container } = render(
    <UserAvatar
      user={{ fullName: 'Kieu Van Son', avatarUrl: 'https://cdn.fb/son.jpg' }}
      srcOverride="blob:preview"
    />,
  );
  const img = container.querySelector('img');
  expect(img).toHaveAttribute('src', 'blob:preview');
});

it('srcOverride rỗng thì vẫn dùng avatarUrl', () => {
  const { container } = render(
    <UserAvatar
      user={{ fullName: 'Kieu Van Son', avatarUrl: 'https://cdn.fb/son.jpg' }}
      srcOverride={null}
    />,
  );
  const img = container.querySelector('img');
  expect(img).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
});

it('user không có avatarUrl thì không render thẻ img', () => {
  const { container } = render(<UserAvatar user={{ fullName: 'Kieu Van Son' }} />);
  expect(container.querySelector('img')).not.toBeInTheDocument();
});
```

> ⚠️ Nếu `getBoundingClientRect().width` trả `0` trong jsdom (không có layout engine), đổi assertion sang kiểm tra style/size attribute mà `Avatar` render ra; **đừng xoá test** — hãy assert bằng cách khác (ví dụ `container.querySelector('[style*="128"]')` hoặc kiểm tra `data-size`).

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/UserAvatar.test.tsx
```
Expected: FAIL — TS error về `size="xl"` / `srcOverride` chưa tồn tại, hoặc assertion fail.

- [ ] **Step 3: Sửa `frontend/src/components/UserAvatar.tsx`**

Đổi `size?: 'sm' | 'md' | 'lg'` → `size?: 'sm' | 'md' | 'lg' | 'xl'`.
Thêm prop `srcOverride?: string | null`.
Trong JSX: `src={srcOverride ?? user?.avatarUrl ?? undefined}`.

Giữ nguyên phần còn lại: `name={shortDisplayName(user?.fullName) ?? user?.username ?? 'Khách'}` — chữ cái fallback phải khớp tên hiển thị ở header.

- [ ] **Step 4: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/UserAvatar.test.tsx
```
Expected: PASS — cả test cũ lẫn test mới.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/UserAvatar.tsx frontend/src/components/UserAvatar.test.tsx
git commit -m "feat(profile): UserAvatar ho tro size 128px va anh preview"
```

---

## Task 3: `FeedPostCard` hiện avatar tác giả

**Files:**
- Modify: `frontend/src/components/feed/FeedPostCard.tsx`
- Modify: `frontend/src/components/feed/FeedPostCard.test.tsx`

**Interfaces:**
- Consumes: `FeedPost` từ `../../data/demoPosts`.
- Produces: prop mới **tuỳ chọn** trên `FeedPostCardProps`:
  ```ts
  authorAvatarSrc?: string | null;
  ```
  Không truyền → hành vi cũ (avatar chữ cái). Truyền → `<Avatar src={authorAvatarSrc} name={post.authorName} size="md" />`.

- [ ] **Step 1: Viết test fail**

Thêm vào `frontend/src/components/feed/FeedPostCard.test.tsx`:

```tsx
it('truyền authorAvatarSrc thì avatar tác giả dùng ảnh đó', () => {
  const { container } = renderCard({
    post: DEMO_POSTS[0],
    authorAvatarSrc: 'https://cdn.fb/son.jpg',
  });
  const img = container.querySelector('img');
  expect(img).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
});

it('không truyền authorAvatarSrc thì không có thẻ img trong avatar tác giả', () => {
  const { container } = renderCard({ post: DEMO_POSTS[0] });
  expect(container.querySelector('.feed-post__head img')).not.toBeInTheDocument();
});
```

> Nếu `renderCard` helper trong file không nhận props tuỳ chọn, sửa helper để nhận và spread `authorAvatarSrc` xuống `FeedPostCard`.

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/feed/FeedPostCard.test.tsx
```
Expected: FAIL — TS error: `authorAvatarSrc` không có trong `FeedPostCardProps`.

- [ ] **Step 3: Sửa `frontend/src/components/feed/FeedPostCard.tsx`**

1. Thêm `authorAvatarSrc?: string | null;` vào `FeedPostCardProps`.
2. Destructure trong signature: `authorAvatarSrc,`.
3. Đổi `<Avatar name={post.authorName} size="md" />` → `<Avatar src={authorAvatarSrc ?? undefined} name={post.authorName} size="md" />`.

**Không** sửa gì khác trong file này → feed trang chủ giữ nguyên hành vi (spec A4).

- [ ] **Step 4: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/feed/FeedPostCard.test.tsx src/components/feed/Feed.test.tsx
```
Expected: PASS — cả hai file. `Feed.test.tsx` phải vẫn xanh (feed trang chủ không đổi).

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/feed/FeedPostCard.tsx frontend/src/components/feed/FeedPostCard.test.tsx
git commit -m "feat(profile): FeedPostCard ho tro avatar tac gia tuy chon"
```

---

## Task 4: `ProfileHeader` — ảnh bìa, avatar, tên, badge, nút

**Files:**
- Create: `frontend/src/components/profile/ProfileHeader.tsx`
- Create: `frontend/src/components/profile/ProfileHeader.css`
- Create: `frontend/src/components/profile/ProfileHeader.test.tsx`

**Interfaces:**
- Consumes: `UserAvatar` (Task 2), `Badge` của `@astryxdesign/core/Badge`, `Button` của `@astryxdesign/core/Button`, `Heading`/`Text` của `@astryxdesign/core/Text`, `PROFILE_ROLE_LABEL` + `DEMO_SKILL_LEVEL` (Task 1).
- Produces:
  ```ts
  export type ProfileHeaderProps = {
    user: User;                    // từ `../../api/types`
    avatarPreviewUrl?: string | null;
    coverPreviewUrl?: string | null;
    stats: { posts: number; bookings: number; moments: number };
    onEditProfile: () => void;
    onPickAvatar: () => void;
    onPickCover: () => void;
  };
  export function ProfileHeader(props: ProfileHeaderProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/components/profile/ProfileHeader.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {ProfileHeader} from './ProfileHeader';

const user = {
  id: 'u-1',
  username: 'kieu.van.son',
  email: 'son@cau-long-dee.vn',
  fullName: 'Kieu Văn Sơn',
  phoneNumber: '0912345678',
  role: 'CUSTOMER',
  createdAt: '2026-01-01T00:00:00Z',
  avatarUrl: 'https://cdn.fb/son.jpg',
};

function renderHeader(overrides: Partial<React.ComponentProps<typeof ProfileHeader>> = {}) {
  const props = {
    user,
    avatarPreviewUrl: null,
    coverPreviewUrl: null,
    stats: { posts: 6, bookings: 6, moments: 5 },
    onEditProfile: vi.fn(),
    onPickAvatar: vi.fn(),
    onPickCover: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ProfileHeader {...props} />) };
}

describe('ProfileHeader', () => {
  it('hiện họ tên đầy đủ và username', () => {
    renderHeader();
    expect(screen.getByRole('heading', {name: 'Kieu Văn Sơn'})).toBeInTheDocument();
    expect(screen.getByText('@kieu.van.son')).toBeInTheDocument();
  });

  it('hiện badge vai trò lấy từ role', () => {
    renderHeader();
    expect(screen.getByText('Khách')).toBeInTheDocument();
  });

  it('hiện thống kê bài / kèo / khoảnh khắc', () => {
    renderHeader();
    expect(screen.getByText('6 bài đã đăng')).toBeInTheDocument();
    expect(screen.getByText('6 kèo')).toBeInTheDocument();
    expect(screen.getByText('5 khoảnh khắc')).toBeInTheDocument();
  });

  it('bấm Chỉnh sửa hồ sơ gọi onEditProfile', async () => {
    const user_ = userEvent.setup();
    const { props } = renderHeader();
    await user_.click(screen.getByRole('button', {name: /Chỉnh sửa hồ sơ/i}));
    expect(props.onEditProfile).toHaveBeenCalled();
  });

  it('bấm Đổi ảnh bìa gọi onPickCover', async () => {
    const user_ = userEvent.setup();
    const { props } = renderHeader();
    await user_.click(screen.getByRole('button', {name: /Đổi ảnh bìa/i}));
    expect(props.onPickCover).toHaveBeenCalled();
  });

  it('bấm nút camera trên avatar gọi onPickAvatar', async () => {
    const user_ = userEvent.setup();
    const { props } = renderHeader();
    await user_.click(screen.getByRole('button', {name: /Đổi ảnh đại diện/i}));
    expect(props.onPickAvatar).toHaveBeenCalled();
  });

  it('avatarPreviewUrl ghi đè ảnh avatar', () => {
    const { container } = renderHeader({ avatarPreviewUrl: 'blob:avatar-preview' });
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:avatar-preview');
  });

  it('coverPreviewUrl ghi đè ảnh bìa', () => {
    const { container } = renderHeader({ coverPreviewUrl: 'blob:cover-preview' });
    expect(container.querySelector('.profile-header__cover img')).toHaveAttribute(
      'src',
      'blob:cover-preview',
    );
  });

  it('user không có avatarUrl → không render thẻ img cho avatar', () => {
    const { container } = renderHeader({
      user: {...user, avatarUrl: null},
    });
    expect(container.querySelector('.profile-header__avatar img')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/profile/ProfileHeader.test.tsx
```
Expected: FAIL — `Cannot find module './ProfileHeader'`.

- [ ] **Step 3: Tạo `frontend/src/components/profile/ProfileHeader.tsx`**

Cấu trúc JSX (dùng class như test tham chiếu):

```
<section className="profile-header">
  <div className="profile-header__cover">
    <img src={coverPreviewUrl ?? '/img/court-01.jpg'} alt="Ảnh bìa trang cá nhân" />
    <Button label="Đổi ảnh bìa" variant="secondary" size="sm" onClick={onPickCover}
            className="profile-header__cover-btn" icon={<Camera size={14} />} />
  </div>
  <div className="profile-header__body">
    <div className="profile-header__avatar">
      <UserAvatar user={user} size="xl" srcOverride={avatarPreviewUrl} />
      <button type="button" className="profile-header__avatar-btn"
              aria-label="Đổi ảnh đại diện" onClick={onPickAvatar}>
        <Camera size={16} />
      </button>
    </div>
    <div className="profile-header__info">
      <Heading level={1} className="profile-header__name">{user.fullName || user.username}</Heading>
      <Text type="supporting" className="profile-header__username">@{user.username}</Text>
      <div className="profile-header__badges">
        <Badge variant="teal" label={PROFILE_ROLE_LABEL[user.role] ?? 'Khách'} />
        <Badge variant="orange" label={DEMO_SKILL_LEVEL} />
      </div>
      <Text type="supporting" className="profile-header__stats">
        {stats.posts} bài đã đăng · {stats.bookings} kèo · {stats.moments} khoảnh khắc
      </Text>
    </div>
    <Button label="Chỉnh sửa hồ sơ" variant="primary" onClick={onEditProfile}
            icon={<Pencil size={15} />} className="profile-header__edit" />
  </div>
</section>
```

Lưu ý cài đặt:
- Import: `Camera`, `Pencil` từ `lucide-react`; `Badge` từ `@astryxdesign/core/Badge`; `Button` từ `@astryxdesign/core/Button`; `Heading`, `Text` từ `@astryxdesign/core/Text`; `UserAvatar` từ `../UserAvatar`; `User` từ `../../api/types`; `PROFILE_ROLE_LABEL`, `DEMO_SKILL_LEVEL` từ `../../data/demoProfile`.
- **Nút "Đổi ảnh bìa" là `<Button>` của Astryx** (test tìm theo `role="button"` + tên) — không phải `IconButton` (IconButton cần `label` riêng và tên accessible sẽ khác).
- **Nút camera trên avatar là `<button>` HTML thuần** với `aria-label="Đổi ảnh đại diện"` để test tìm được theo tên.
- Nếu `Button` của Astryx không nhận prop `size` kiểu `"sm"` mà dùng tên khác, kiểm tra `node_modules/@astryxdesign/core/src/Button/Button.tsx` và dùng đúng tên.
- Nút "Đổi ảnh bìa" phải nằm **ngoài** ảnh, trong wrapper `position: relative` (spec D3).

- [ ] **Step 4: Tạo `frontend/src/components/profile/ProfileHeader.css`**

Trong `@layer app`:

```css
.profile-header { position: relative; }
.profile-header__cover { position: relative; height: 240px; overflow: hidden; background: var(--fb-bg); }
.profile-header__cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.profile-header__cover-btn { position: absolute; right: 16px; bottom: 16px; }
.profile-header__body {
  display: flex; align-items: flex-end; gap: var(--s-4);
  padding: 0 var(--s-6) var(--s-4);
  margin-top: -64px;
}
.profile-header__avatar { position: relative; flex: 0 0 auto; }
.profile-header__avatar-btn {
  position: absolute; right: 4px; bottom: 4px;
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--fb-bg); border: 1px solid var(--fb-line);
  color: var(--fb-ink-1); cursor: pointer;
}
.profile-header__info { flex: 1 1 auto; min-width: 0; padding-top: var(--s-8); }
.profile-header__name { margin: 0; }
.profile-header__username { display: block; margin: 2px 0 6px; }
.profile-header__badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.profile-header__stats { display: block; }
.profile-header__edit { flex: 0 0 auto; margin-bottom: 4px; }

@media (max-width: 720px) {
  .profile-header__cover { height: 160px; }
  .profile-header__body { margin-top: -48px; gap: var(--s-3); padding: 0 var(--s-4) var(--s-3); }
  .profile-header__edit { width: 100%; }
}
```

Ghi chú: avatar 128px = `size="xl"`. Ở mobile dùng `size={96}` → cần prop truyền size vào `ProfileHeader` hoặc dùng CSS `transform: scale()`. **Chọn cách đơn giản:** thêm prop `avatarSize?: 'xl' | number` vào `ProfileHeaderProps`, mặc định `'xl'`, và trong CSS mobile đặt `.profile-header__avatar { width: 96px; height: 96px; }` + `.profile-header__avatar > * { width: 96px !important; height: 96px !important; }`. Nếu `!important` xấu, dùng media query để set size qua prop — nhưng prop không đổi theo viewport trong React. **Quyết định cuối:** dùng CSS `zoom`-free approach — wrap avatar trong `.profile-header__avatar` có `width/height` cố định (128px desktop / 96px mobile) và `overflow: hidden; border-radius: 50%`, con `<UserAvatar>` dùng `size="xl"` với CSS `width:100%; height:100%`. Avatar của Astryx nhận `width`/`height` qua className → style được.

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/profile/ProfileHeader.test.tsx
```
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/profile/ProfileHeader.tsx frontend/src/components/profile/ProfileHeader.css frontend/src/components/profile/ProfileHeader.test.tsx
git commit -m "feat(profile): them ProfileHeader voi anh bia va avatar"
```

---

## Task 5: `ProfileTabs` — dải 4 tab

**Files:**
- Create: `frontend/src/components/profile/ProfileTabs.tsx`
- Create: `frontend/src/components/profile/ProfileTabs.test.tsx`

**Interfaces:**
- Consumes: `TabList`, `Tab` từ `@astryxdesign/core/TabList`.
- Produces:
  ```ts
  export type ProfileTabValue = 'posts' | 'bookings' | 'moments' | 'settings';
  export type ProfileTabsProps = {
    value: ProfileTabValue;
    onChange: (value: ProfileTabValue) => void;
  };
  export function ProfileTabs(props: ProfileTabsProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/components/profile/ProfileTabs.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {ProfileTabs} from './ProfileTabs';

describe('ProfileTabs', () => {
  it('hiện đủ 4 tab', () => {
    render(<ProfileTabs value="posts" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', {name: 'Bài viết'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Kèo đã đặt'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Khoảnh khắc'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Cài đặt'})).toBeInTheDocument();
  });

  it('tab đang chọn có aria-selected=true', () => {
    render(<ProfileTabs value="bookings" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', {name: 'Kèo đã đặt'})).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', {name: 'Bài viết'})).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('bấm tab khác gọi onChange với giá trị mới', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProfileTabs value="posts" onChange={onChange} />);
    await user.click(screen.getByRole('tab', {name: 'Khoảnh khắc'}));
    expect(onChange).toHaveBeenCalledWith('moments');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/profile/ProfileTabs.test.tsx
```
Expected: FAIL — `Cannot find module './ProfileTabs'`.

- [ ] **Step 3: Tạo `frontend/src/components/profile/ProfileTabs.tsx`**

```tsx
import {Tab, TabList} from '@astryxdesign/core/TabList';

export type ProfileTabValue = 'posts' | 'bookings' | 'moments' | 'settings';

const TABS: {value: ProfileTabValue; label: string}[] = [
  {value: 'posts', label: 'Bài viết'},
  {value: 'bookings', label: 'Kèo đã đặt'},
  {value: 'moments', label: 'Khoảnh khắc'},
  {value: 'settings', label: 'Cài đặt'},
];

export type ProfileTabsProps = {
  value: ProfileTabValue;
  onChange: (value: ProfileTabValue) => void;
};

export function ProfileTabs({value, onChange}: ProfileTabsProps) {
  return (
    <TabList
      role="tablist"
      value={value}
      onChange={(next) => onChange(next as ProfileTabValue)}
      aria-label="Nội dung trang cá nhân"
    >
      {TABS.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={tab.label}
          panelId={`profile-panel-${tab.value}`}
        />
      ))}
    </TabList>
  );
}
```

Lưu ý: truyền `role="tablist"` để `Tab` render `role="tab"` + `aria-selected` (spec D2). `panelId` khớp `id` của panel trong Task 7.

- [ ] **Step 4: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/profile/ProfileTabs.test.tsx
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/profile/ProfileTabs.tsx frontend/src/components/profile/ProfileTabs.test.tsx
git commit -m "feat(profile): them dai 4 tab cho trang ca nhan"
```

---

## Task 6: `ProfileBookings` — tab kèo đã đặt

**Files:**
- Create: `frontend/src/components/profile/ProfileBookings.tsx`
- Create: `frontend/src/components/profile/ProfileBookings.css`
- Create: `frontend/src/components/profile/ProfileBookings.test.tsx`

**Interfaces:**
- Consumes: `Badge` từ `@astryxdesign/core/Badge`, `Card` từ `@astryxdesign/core/Card`, `Button` từ `@astryxdesign/core/Button`, `EmptyState` từ `@astryxdesign/core/EmptyState`, `ProfileBooking` + `DEMO_MY_BOOKINGS` (Task 1).
- Produces:
  ```ts
  export type ProfileBookingsProps = {
    bookings?: ProfileBooking[];
    onUnavailableFeature: (featureName: string) => void;
  };
  export function ProfileBookings(props: ProfileBookingsProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/components/profile/ProfileBookings.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {DEMO_MY_BOOKINGS} from '../../data/demoProfile';
import {ProfileBookings} from './ProfileBookings';

describe('ProfileBookings', () => {
  it('render danh sách kèo demo', () => {
    render(<ProfileBookings onUnavailableFeature={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(DEMO_MY_BOOKINGS.length);
  });

  it('mỗi loại kèo có badge nhãn riêng', () => {
    render(<ProfileBookings onUnavailableFeature={vi.fn()} />);
    expect(screen.getByText('Đã đặt sân')).toBeInTheDocument();
    expect(screen.getByText('Xét kèo')).toBeInTheDocument();
    expect(screen.getByText('Tuyển người đánh')).toBeInTheDocument();
  });

  it('kèo đã hoàn thành có badge Đã hoàn thành', () => {
    render(<ProfileBookings onUnavailableFeature={vi.fn()} />);
    expect(screen.getAllByText('Đã hoàn thành').length).toBeGreaterThan(0);
  });

  it('bấm nút hành động gọi onUnavailableFeature', async () => {
    const user = userEvent.setup();
    const onUnavailableFeature = vi.fn();
    render(<ProfileBookings onUnavailableFeature={onUnavailableFeature} />);
    await user.click(screen.getAllByRole('button', {name: 'Hủy kèo'})[0]);
    expect(onUnavailableFeature).toHaveBeenCalled();
  });

  it('danh sách rỗng hiện EmptyState', () => {
    render(<ProfileBookings bookings={[]} onUnavailableFeature={vi.fn()} />);
    expect(screen.getByText('Chưa có kèo nào')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/profile/ProfileBookings.test.tsx
```
Expected: FAIL — `Cannot find module './ProfileBookings'`.

- [ ] **Step 3: Tạo `frontend/src/components/profile/ProfileBookings.tsx`**

- Map type → badge: `booking` → `{variant: 'blue', label: 'Đã đặt sân'}`, `challenge` → `{variant: 'purple', label: 'Xét kèo'}`, `recruit` → `{variant: 'orange', label: 'Tuyển người đánh'}`. Trạng thái `done` → badge `{variant: 'neutral', label: 'Đã hoàn thành'}`.
- Mỗi kèo là `<article className="profile-booking">` chứa `<Card padding={0}>`; **padding đặt ở wrapper div** bên trong `Card` (spec C7).
- Nội dung: `title` (Heading level 3), `timeLabel` + `area` + `priceLabel` (Text supporting), `note` nếu có, badge, và nút hành động:
  - `status === 'upcoming'` → `<Button label="Hủy kèo" variant="secondary" size="sm" />` → `onUnavailableFeature('Hủy kèo')`.
  - `status === 'done'` → `<Button label="Xem lại" variant="secondary" size="sm" />` → `onUnavailableFeature('Xem lại')`.
- `bookings` mặc định = `DEMO_MY_BOOKINGS`.
- Rỗng → `<EmptyState title="Chưa có kèo nào" description="Khi bạn đặt sân hoặc rủ người đánh, các kèo sẽ hiện ở đây." />`.

- [ ] **Step 4: Tạo `frontend/src/components/profile/ProfileBookings.css`**

Trong `@layer app`: `.profile-bookings` (grid 2 cột, `gap: var(--s-4)`), `.profile-booking__body` (padding `var(--s-4)`), `.profile-booking__meta` (flex, gap 8px, wrap), `.profile-booking__note` (màu `--fb-ink-1`). Media query ≤720px → 1 cột.

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/profile/ProfileBookings.test.tsx
```
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/profile/ProfileBookings.tsx frontend/src/components/profile/ProfileBookings.css frontend/src/components/profile/ProfileBookings.test.tsx
git commit -m "feat(profile): them tab Keo da dat"
```

---

## Task 7: `ProfileMoments` — tab khoảnh khắc (vòng tròn story)

**Files:**
- Create: `frontend/src/components/profile/ProfileMoments.tsx`
- Create: `frontend/src/components/profile/ProfileMoments.css`
- Create: `frontend/src/components/profile/ProfileMoments.test.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogHeader` từ `@astryxdesign/core/Dialog`, `Layout`, `LayoutContent` từ `@astryxdesign/core/Layout`, `Button` từ `@astryxdesign/core/Button`, `ProfileMoment` + `DEMO_MY_MOMENTS` (Task 1).
- Produces:
  ```ts
  export type ProfileMomentsProps = {
    moments?: ProfileMoment[];
  };
  export function ProfileMoments(props: ProfileMomentsProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/components/profile/ProfileMoments.test.tsx`:

```tsx
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {DEMO_MY_MOMENTS} from '../../data/demoProfile';
import {ProfileMoments} from './ProfileMoments';

describe('ProfileMoments', () => {
  it('render ô Thêm khoảnh khắc cộng mỗi khoảnh khắc demo', () => {
    render(<ProfileMoments />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(DEMO_MY_MOMENTS.length + 1);
    expect(screen.getByText('Thêm khoảnh khắc')).toBeInTheDocument();
  });

  it('bấm vào khoảnh khắc mở dialog xem ảnh lớn', async () => {
    const user = userEvent.setup();
    render(<ProfileMoments />);
    await user.click(screen.getByRole('button', {name: DEMO_MY_MOMENTS[0].caption}));
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog').textContent).toContain(
      DEMO_MY_MOMENTS[0].caption,
    );
  });

  it('dialog có nút khoảnh khắc trước và sau', async () => {
    const user = userEvent.setup();
    render(<ProfileMoments />);
    await user.click(screen.getByRole('button', {name: DEMO_MY_MOMENTS[0].caption}));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByRole('button', {name: 'Khoảnh khắc trước'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Khoảnh khắc sau'})).toBeInTheDocument();
  });

  it('bấm khoảnh khắc sau chuyển sang khoảnh khắc kế tiếp', async () => {
    const user = userEvent.setup();
    render(<ProfileMoments />);
    await user.click(screen.getByRole('button', {name: DEMO_MY_MOMENTS[0].caption}));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await user.click(screen.getByRole('button', {name: 'Khoảnh khắc sau'}));
    await waitFor(() =>
      expect(screen.getByRole('dialog').textContent).toContain(
        DEMO_MY_MOMENTS[1].caption,
      ),
    );
  });

  it('ô Thêm khoảnh khắc mở file picker', async () => {
    const user = userEvent.setup();
    const { container } = render(<ProfileMoments />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input).toHaveAttribute('accept', 'image/*');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/profile/ProfileMoments.test.tsx
```
Expected: FAIL — `Cannot find module './ProfileMoments'`.

- [ ] **Step 3: Tạo `frontend/src/components/profile/ProfileMoments.tsx`**

- State: `moments` (khởi tạo từ prop `moments ?? DEMO_MY_MOMENTS`), `selectedIndex: number | null`, `newMomentUrl: string | null`.
- Vòng tròn: mỗi khoảnh khắc là `<button type="button" className="profile-moment" aria-label={moment.caption}>` chứa `<img src={moment.image} alt={moment.caption} />`.
- Ô đầu tiên: `<button type="button" className="profile-moment profile-moment--add" aria-label="Thêm khoảnh khắc">` chứa icon `Plus`; kèm `<input type="file" accept="image/*" hidden>` trong component để test query được.
- Bấm ô "Thêm khoảnh khắc" → `input.click()`.
- `input` có `onChange` → đọc `e.target.files?.[0]`, tạo `URL.createObjectURL(file)`, **thêm vào đầu `moments`** với `caption: 'Khoảnh khắc mới'`, `timeLabel: 'Vừa xong'`, `place: ''` (spec D4: ảnh mới vào list).
- Bấm 1 khoảnh khắc → set `selectedIndex` → mở `Dialog` (pattern `FeedStories.tsx`: `Dialog` + `Layout` + `DialogHeader` + `LayoutContent`).
  - `DialogHeader title={moment.caption}`.
  - Trong `LayoutContent`: `<img src={moment.image} alt={moment.caption} className="profile-moment__full" />`, dòng `${moment.timeLabel} · ${moment.place}`.
  - Nút `aria-label="Khoảnh khắc trước"` (icon `ChevronLeft`) → `setSelectedIndex(i => (i - 1 + n) % n)`.
  - Nút `aria-label="Khoảnh khắc sau"` (icon `ChevronRight`) → `setSelectedIndex(i => (i + 1) % n)`.
- `URL.revokeObjectURL` — revoke mọi objectURL do component tạo khi unmount. Dùng `useRef` giữ danh sách URL đã tạo + `useEffect` cleanup.

- [ ] **Step 4: Tạo `frontend/src/components/profile/ProfileMoments.css`**

Trong `@layer app`: `.profile-moments` (flex, gap 12px, `overflow-x: auto`), `.profile-moment` (flex 0 0 auto, width 96px, không border/background), `.profile-moment__ring` (padding 3px, `border-radius: 50%`, `background: linear-gradient(...)` gradient 3 màu cho kiểu Facebook), `.profile-moment__img` (`width/height: 90px`, `border-radius: 50%`, `object-fit: cover`, `border: 2px solid var(--surface-0)`), `.profile-moment__name` (font-size 12px, ellipsis), `.profile-moment--add` (nền `--fb-bg`, icon `Plus` tròn), `.profile-moment__full` (max-height 70dvh, object-fit contain).

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/profile/ProfileMoments.test.tsx
```
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/profile/ProfileMoments.tsx frontend/src/components/profile/ProfileMoments.css frontend/src/components/profile/ProfileMoments.test.tsx
git commit -m "feat(profile): them tab Khoanh khac dang vong tron story"
```

---

## Task 8: `ProfilePosts` — tab bài viết

**Files:**
- Create: `frontend/src/components/profile/ProfilePosts.tsx`
- Create: `frontend/src/components/profile/ProfilePosts.css`
- Create: `frontend/src/components/profile/ProfilePosts.test.tsx`

**Interfaces:**
- Consumes: `FeedPostCard` từ `../feed/FeedPostCard`, `FeedComposerModal` từ `../feed/FeedComposerModal`, `FeedTabs` từ `../feed/FeedTabs`, `filterPosts`, `toggleLike`, `toggleLikedId` từ `../feed/feedUtils`, `FeedFilter` từ `../feed/feedUtils`, `DEMO_MY_POSTS` (Task 1), `User` từ `../../api/types`.
- Produces:
  ```ts
  export type ProfilePostsProps = {
    user: User;
    posts?: FeedPost[];
  };
  export function ProfilePosts(props: ProfilePostsProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/components/profile/ProfilePosts.test.tsx`:

```tsx
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {DEMO_MY_POSTS} from '../../data/demoProfile';
import {ProfilePosts} from './ProfilePosts';

const user = {
  id: 'u-1',
  username: 'kieu.van.son',
  email: 'son@cau-long-dee.vn',
  fullName: 'Kieu Văn Sơn',
  phoneNumber: '0912345678',
  role: 'CUSTOMER',
  createdAt: '2026-01-01T00:00:00Z',
  avatarUrl: 'https://cdn.fb/son.jpg',
};

describe('ProfilePosts', () => {
  it('render tất cả bài demo của tôi', () => {
    render(<ProfilePosts user={user} />);
    expect(screen.getAllByRole('article')).toHaveLength(DEMO_MY_POSTS.length);
  });

  it('tên tác giả hiện là tên đầy đủ của user', () => {
    render(<ProfilePosts user={user} />);
    expect(screen.getAllByText('Kieu Văn Sơn').length).toBeGreaterThan(0);
  });

  it('lọc theo loại bài qua tab lọc', async () => {
    const userEvent_ = userEvent.setup();
    const { container } = render(<ProfilePosts user={user} />);
    const challengeTab = container.querySelector('[data-tab-value="challenge"]');
    expect(challengeTab).not.toBeNull();
    await userEvent_.click(challengeTab as Element);
    await waitFor(() => {
      for (const post of screen.getAllByRole('article')) {
        expect(post.textContent).toContain('XÉT KÈO');
      }
    });
  });

  it('bấm nút Đăng bài mới mở modal và bài mới chèn lên đầu', async () => {
    const userEvent_ = userEvent.setup();
    render(<ProfilePosts user={user} />);
    await userEvent_.click(screen.getByRole('button', {name: /Đăng bài mới/i}));
    await userEvent_.type(screen.getByRole('textbox'), 'Bài của tôi trên hồ sơ');
    await userEvent_.click(screen.getByRole('button', {name: 'Đăng bài'}));
    await waitFor(() => {
      expect(screen.getAllByRole('article')[0].textContent).toContain(
        'Bài của tôi trên hồ sơ',
      );
    });
  });

  it('bấm Thích làm likeCount tăng 1', async () => {
    const userEvent_ = userEvent.setup();
    render(<ProfilePosts user={user} />);
    const likeButton = screen.getAllByRole('button', {name: 'Thích'})[0];
    const before = screen.getAllByRole('article')[0].textContent ?? '';
    await userEvent_.click(likeButton);
    expect(screen.getAllByRole('article')[0].textContent).not.toBe(before);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/profile/ProfilePosts.test.tsx
```
Expected: FAIL — `Cannot find module './ProfilePosts'`.

- [ ] **Step 3: Tạo `frontend/src/components/profile/ProfilePosts.tsx`**

- State: `posts` (khởi tại `posts ?? DEMO_MY_POSTS`), `filter` (`FeedFilter`, mặc định `'all'`), `likedIds` (`ReadonlySet<string>`), `isComposerOpen` (boolean), `composerCategory` (`PostCategory`, mặc định `'challenge'`).
- **Override tên tác giả:** khi render, map mỗi post thành `{...post, authorName: user.fullName || user.username}` → bài của tôi luôn hiện tên user thật (spec R1).
- Render `<FeedPostCard post={...} isLiked={likedIds.has(post.id)} onToggleLike={handleToggleLike} onShare={handleShare} onUnavailableFeature={onUnavailableFeature} authorAvatarSrc={user.avatarUrl} />` bọc trong `<article id={`post-${post.id}`}>`.
- `onShare` → copy `${window.location.origin}/tai-khoan?tab=posts` (spec D7), bắt lỗi clipboard như `Feed.tsx`; dùng `useToast` của Astryx để báo.
- `onUnavailableFeature` → `useToast` báo `"Tính năng \"X\" sẽ có ở giai đoạn sau"`.
- Nút "Đăng bài mới" → `setIsComposerOpen(true)`.
- `<FeedComposerModal isOpen={isComposerOpen} initialCategory={composerCategory} authorName={user.fullName || user.username || 'Khách'} onClose={() => setIsComposerOpen(false)} onSubmit={handleSubmit} />`.
- `handleSubmit(post)` → `setPosts(current => [post, ...current])` + toast "Đã đăng bài".
- Thanh lọc: dùng `FeedTabs` (`../feed/FeedTabs`) với `value={filter}` `onChange={setFilter}` — pattern navigation (`data-tab-value`), khác dải tab profile.

- [ ] **Step 4: Tạo `frontend/src/components/profile/ProfilePosts.css`**

Trong `@layer app`: `.profile-posts` (flex column, gap `var(--s-4)`), `.profile-posts__head` (flex, space-between, align center), `.profile-posts__list` (flex column, gap `var(--s-4)`).

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/profile/ProfilePosts.test.tsx
```
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/profile/ProfilePosts.tsx frontend/src/components/profile/ProfilePosts.css frontend/src/components/profile/ProfilePosts.test.tsx
git commit -m "feat(profile): them tab Bai viet cho trang ca nhan"
```

---

## Task 9: `ProfileSettings` — tab cài đặt (di chuyển form OTP)

**Files:**
- Create: `frontend/src/components/profile/ProfileSettings.tsx`
- Create: `frontend/src/components/profile/ProfileSettings.css`
- Create: `frontend/src/components/profile/ProfileSettings.test.tsx`
- Read (không sửa): `frontend/src/pages/AccountPage.tsx` — nguồn để di chuyển logic form.

**Interfaces:**
- Consumes: `useAuth()` từ `../../context/AuthContext`, `OtpInput` từ `../OtpInput`, `Button` từ `@astryxdesign/core/Button`, `Card` từ `@astryxdesign/core/Card`, `Badge` từ `@astryxdesign/core/Badge`, `authApi` từ `../../api/auth`, `ApiError` từ `../../api/types`, `isValidPhone`, `normalizePhone` từ `../../utils/phone`, `UserAvatar` từ `../UserAvatar`.
- Produces:
  ```ts
  export type ProfileSettingsProps = {
    user: User;
    avatarPreviewUrl?: string | null;
    onPickAvatar: () => void;
    onPickCover: () => void;
  };
  export function ProfileSettings(props: ProfileSettingsProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/components/profile/ProfileSettings.test.tsx`:

```tsx
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it} from 'vitest';
import {STORAGE_KEYS} from '../../api/config';
import {AuthProvider} from '../../context/AuthContext';
import {ProfileSettings} from './ProfileSettings';

afterEach(() => localStorage.clear());

const user = {
  id: 'u-1',
  username: 'kieu.van.son',
  email: 'son@cau-long-dee.vn',
  fullName: 'Kieu Văn Sơn',
  phoneNumber: '0912345678',
  role: 'CUSTOMER',
  createdAt: '2026-01-01T00:00:00Z',
  avatarUrl: 'https://cdn.fb/son.jpg',
};

function renderSettings() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProfileSettings
          user={user}
          avatarPreviewUrl={null}
          onPickAvatar={() => {}}
          onPickCover={() => {}}
        />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProfileSettings', () => {
  it('hiện thông tin hiện tại của user', () => {
    renderSettings();
    expect(screen.getByText('son@cau-long-dee.vn')).toBeInTheDocument();
    expect(screen.getByText('0912345678')).toBeInTheDocument();
  });

  it('có ô nhập email và số điện thoại', () => {
    renderSettings();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Số điện thoại')).toBeInTheDocument();
  });

  it('bấm Gửi mã hiện ô nhập OTP', async () => {
    const u = userEvent.setup();
    renderSettings();
    await u.type(screen.getByLabelText('Số điện thoại'), '0909999999');
    await u.click(screen.getByRole('button', {name: /Gửi mã/i}));
    await waitFor(() => expect(screen.getByLabelText('Mã xác nhận')).toBeInTheDocument());
  });

  it('email sai định dạng thì báo lỗi, không gọi API', async () => {
    const u = userEvent.setup();
    renderSettings();
    await u.type(screen.getByLabelText('Email'), 'khong-hop-le');
    await u.click(screen.getByRole('button', {name: /Lưu thay đổi/i}));
    await waitFor(() =>
      expect(screen.getByText('Email chưa đúng định dạng.')).toBeInTheDocument(),
    );
  });

  it('có nút đổi ảnh đại diện và ảnh bìa', () => {
    renderSettings();
    expect(screen.getByRole('button', {name: /Đổi ảnh đại diện/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Đổi ảnh bìa/i})).toBeInTheDocument();
  });

  it('có mục bảo mật với nút đặt lại mật khẩu', () => {
    renderSettings();
    expect(screen.getByRole('button', {name: /Đặt lại mật khẩu/i})).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/components/profile/ProfileSettings.test.tsx
```
Expected: FAIL — `Cannot find module './ProfileSettings'`.

- [ ] **Step 3: Tạo `frontend/src/components/profile/ProfileSettings.tsx``**

Di chuyển **nguyên vẹn** logic form từ `AccountPage.tsx` (dòng ~28-135 và ~190-290): state `email`, `phone`, `otp`, `otpSent`, `otpSending`, `devOtp`, `resendIn`, `errors`, `submitting`, `saved`; `handleSendOtp`; `handleSubmit`; effect đếm ngược resend.

**Giữ nguyên hành vi validation** (rất quan trọng — không hồi quy):
- `emailChanged = emailInput !== '' && emailInput !== (user?.email ?? '').toLowerCase()`
- `phoneChanged = phoneInput !== null && phoneInput !== (user?.phoneNumber ?? '')`
- Ô trống = "không đổi", KHÔNG phải "đổi thành rỗng".
- Đổi SĐT → bắt buộc có OTP 6 ký tự.
- Email sai định dạng → message đúng `"Email chưa đúng định dạng."`.

Bố cục (2 cột ở ≥900px):
- **Cột trái** — card "Thông tin hiện tại": họ tên, email (kèm badge "Chưa xác minh" nếu email kết thúc bằng `@facebook.local`), số điện thoại, username. Hằng `TEMP_EMAIL_SUFFIX = '@facebook.local'`.
- **Cột phải** — 3 card:
  1. "Ảnh hồ sơ": hiện avatar nhỏ (`<UserAvatar user={user} size="lg" srcOverride={avatarPreviewUrl} />`) + 2 nút "Đổi ảnh đại diện" / "Đổi ảnh bìa" → gọi `onPickAvatar` / `onPickCover`.
  2. "Thông tin liên hệ": form đổi email/SĐT (copy từ `AccountPage`).
  3. "Bảo mật": dòng "Mật khẩu" + nút "Đặt lại mật khẩu" → `useToast` báo "Tính năng sẽ có ở giai đoạn sau".

Dùng `updateProfile` từ `useAuth()` — không gọi API trực tiếp cho phần cập nhật (giữ nguyên như `AccountPage` hiện tại).

Import `useToast` từ `@astryxdesign/core/Toast`.

- [ ] **Step 4: Tạo `frontend/src/components/profile/ProfileSettings.css`**

Trong `@layer app`: `.profile-settings` (grid 2 cột `1fr 1.4fr`, gap `var(--s-5)`), `.profile-settings__col` (flex column, gap `var(--s-4)`), `.profile-settings__row` (flex, space-between), `.profile-settings__field` (flex column, gap 6px), `.profile-settings__input` (copy style từ `.account__input` trong `AccountPage.css`), `.profile-settings__phone-wrap`, `.profile-settings__send-otp`, `.profile-settings__err`, `.profile-settings__alert`, `.profile-settings__alert--ok`, `.profile-settings__dev`. Media query ≤900px → 1 cột.

**Sau khi tạo xong**, style form có thể tái dùng các class `.account__*` cũ — nhưng file CSS đó sẽ bị xoá ở Task 10. Vì vậy **copy style vào `ProfileSettings.css` với tiền tố `.profile-settings__`**, đừng phụ thuộc `.account__*`.

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/components/profile/ProfileSettings.test.tsx
```
Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/profile/ProfileSettings.tsx frontend/src/components/profile/ProfileSettings.css frontend/src/components/profile/ProfileSettings.test.tsx
git commit -m "feat(profile): them tab Cai dat voi form doi email va so dien thoai"
```

---

## Task 10: `AccountPage` — container của trang profile

**Files:**
- Modify: `frontend/src/pages/AccountPage.tsx`
- Modify: `frontend/src/pages/AccountPage.css`
- Create: `frontend/src/pages/AccountPage.test.tsx`

**Interfaces:**
- Consumes: tất cả component Task 4-9, `useAuth()`, `useSearchParams` từ `react-router-dom`, `AppLink` từ `../components/AppLink`, `useToast` từ `@astryxdesign/core/Toast`.
- Produces: route `/tai-khoan` (giữ nguyên path trong `src/main.tsx` — không đổi).

- [ ] **Step 1: Viết test fail**

Tạo `frontend/src/pages/AccountPage.test.tsx`:

```tsx
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it} from 'vitest';
import {STORAGE_KEYS} from '../api/config';
import {AuthProvider} from '../context/AuthContext';
import {AccountPage} from './AccountPage';

afterEach(() => localStorage.clear());

const loggedInUser = {
  id: 'u-1',
  username: 'kieu.van.son',
  email: 'son@cau-long-dee.vn',
  fullName: 'Kieu Văn Sơn',
  phoneNumber: '0912345678',
  role: 'CUSTOMER',
  createdAt: '2026-01-01T00:00:00Z',
  avatarUrl: 'https://cdn.fb/son.jpg',
};

function loginAs(user: unknown = loggedInUser) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.accessToken, 'test-token');
}

function renderPage(entry = '/tai-khoan') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <AccountPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AccountPage', () => {
  it('chưa đăng nhập → hiện nút Đăng nhập', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('link', {name: 'Đăng nhập'})).toBeInTheDocument(),
    );
  });

  it('đã đăng nhập → hiện hồ sơ với 4 tab', async () => {
    loginAs();
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', {name: 'Kieu Văn Sơn'})).toBeInTheDocument(),
    );
    expect(screen.getByRole('tab', {name: 'Bài viết'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Kèo đã đặt'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Khoảnh khắc'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Cài đặt'})).toBeInTheDocument();
  });

  it('?tab=bookings mở đúng tab Kèo đã đặt', async () => {
    loginAs();
    renderPage('/tai-khoan?tab=bookings');
    await waitFor(() =>
      expect(screen.getByRole('tab', {name: 'Kèo đã đặt'})).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });

  it('?tab=xyz (giá trị rác) → rơi về tab Bài viết', async () => {
    loginAs();
    renderPage('/tai-khoan?tab=xyz');
    await waitFor(() =>
      expect(screen.getByRole('tab', {name: 'Bài viết'})).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });

  it('bấm tab Cài đặt đổi nội dung hiển thị', async () => {
    loginAs();
    const u = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('tab', {name: 'Cài đặt'})).toBeInTheDocument());
    await u.click(screen.getByRole('tab', {name: 'Cài đặt'}));
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
  });

  it('nút Chỉnh sửa hồ sơ chuyển sang tab Cài đặt', async () => {
    loginAs();
    const u = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', {name: /Chỉnh sửa hồ sơ/i})).toBeInTheDocument(),
    );
    await u.click(screen.getByRole('button', {name: /Chỉnh sửa hồ sơ/i}));
    await waitFor(() =>
      expect(screen.getByRole('tab', {name: 'Cài đặt'})).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```powershell
cd frontend
npm test -- src/pages/AccountPage.test.tsx
```
Expected: FAIL — trang hiện tại không có tab / không có nút Đăng nhập.

- [ ] **Step 3: Viết lại `frontend/src/pages/AccountPage.tsx`**

Cấu trúc:

```tsx
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useToast} from '@astryxdesign/core/Toast';
import {Card} from '@astryxdesign/core/Card';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {AppLink} from '../components/AppLink';
import {useAuth} from '../context/AuthContext';
import {DEMO_MY_BOOKINGS, DEMO_MY_MOMENTS, DEMO_MY_POSTS} from '../data/demoProfile';
import {ProfileBookings} from '../components/profile/ProfileBookings';
import {ProfileHeader} from '../components/profile/ProfileHeader';
import {ProfileMoments} from '../components/profile/ProfileMoments';
import {ProfilePosts} from '../components/profile/ProfilePosts';
import {ProfileSettings} from '../components/profile/ProfileSettings';
import {ProfileTabs, type ProfileTabValue} from '../components/profile/ProfileTabs';
import './AccountPage.css';

const TAB_VALUES: ProfileTabValue[] = ['posts', 'bookings', 'moments', 'settings'];
```

Logic:

1. `const {user, isLoading} = useAuth();`
2. `const [searchParams, setSearchParams] = useSearchParams();`
3. Đọc tab:
   ```ts
   const rawTab = searchParams.get('tab');
   const activeTab: ProfileTabValue =
     TAB_VALUES.includes(rawTab as ProfileTabValue)
       ? (rawTab as ProfileTabValue)
       : 'posts';
   ```
   → **Review Focus #3** (giá trị rác → `posts`).
4. `handleTabChange(next)` → `setSearchParams({tab: next})`.
5. State preview ảnh ở **cấp trang** (Review Focus #4):
   ```ts
   const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
   const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
   const avatarUrlRef = useRef<string | null>(null);
   const coverUrlRef = useRef<string | null>(null);
   ```
   Khi đổi ảnh → revoke URL cũ trong ref trước khi set URL mới (Review Focus #5):
   ```ts
   const applyAvatarPreview = useCallback((url: string | null) => {
     if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
     avatarUrlRef.current = url;
     setAvatarPreviewUrl(url);
   }, []);
   ```
   Cleanup khi unmount:
   ```ts
   useEffect(() => () => {
     if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
     if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
   }, []);
   ```
6. File picker ẩn cho avatar và cover:
   ```tsx
   <input ref={avatarInputRef} type="file" accept="image/*" hidden
          aria-label="Chọn ảnh đại diện"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) applyAvatarPreview(URL.createObjectURL(file));
            e.target.value = '';
          }} />
   ```
   (tương tự cho cover). Nút "Đổi ảnh bìa" / "Đổi ảnh đại diện" → `inputRef.current?.click()`.
7. Render:
   - `isLoading` → hiện `<Text type="supporting">Đang tải hồ sơ…</Text>` (tránh nháy — Review Focus trong spec §6).
   - `!user` → `<Card>` + Heading "Vui lòng đăng nhập" + `<AppLink to="/dang-nhap">Đăng nhập</AppLink>`.
   - Ngược lại:
     ```tsx
     <div className="account">
       <ProfileHeader
         user={user}
         avatarPreviewUrl={avatarPreviewUrl}
         coverPreviewUrl={coverPreviewUrl}
         stats={{
           posts: DEMO_MY_POSTS.length,
           bookings: DEMO_MY_BOOKINGS.length,
           moments: DEMO_MY_MOMENTS.length,
         }}
         onEditProfile={handleEditProfile}
         onPickAvatar={() => avatarInputRef.current?.click()}
         onPickCover={() => coverInputRef.current?.click()}
       />
       <ProfileTabs value={activeTab} onChange={handleTabChange} />
       <div className="account__panel" id={`profile-panel-${activeTab}`} role="tabpanel"
            aria-label={TAB_LABEL[activeTab]}>
         {activeTab === 'posts' && <ProfilePosts user={user} />}
         {activeTab === 'bookings' && <ProfileBookings onUnavailableFeature={handleUnavailable} />}
         {activeTab === 'moments' && <ProfileMoments />}
         {activeTab === 'settings' && (
           <ProfileSettings
             user={user}
             avatarPreviewUrl={avatarPreviewUrl}
             onPickAvatar={() => avatarInputRef.current?.click()}
             onPickCover={() => coverInputRef.current?.click()}
           />
         )}
       </div>
     </div>
     ```
   - `handleEditProfile` → `handleTabChange('settings')` + `window.scrollTo({top: 0, behavior: 'smooth'})`.
   - `handleUnavailable(name)` → `useToast` báo `"Tính năng \"X\" sẽ có ở giai đoạn sau"`.
8. **Xoá** toàn bộ logic form cũ khỏi `AccountPage.tsx` (đã chuyển sang `ProfileSettings`). Không xoá import `OtpInput`/`authApi`/`phone` nếu không dùng.

- [ ] **Step 4: Viết lại `frontend/src/pages/AccountPage.css`**

- Giữ lại các rule `.account__*` **chỉ khi** còn dùng. Phần lớn đã sang `ProfileSettings.css` → xoá các rule không còn dùng.
- Thêm:
  ```css
  .account { max-width: 1080px; margin: 0 auto; padding: var(--s-6) var(--s-4) var(--s-12); background: var(--fb-bg); min-height: calc(100vh - 76px); }
  .account__panel { margin-top: var(--s-4); }
  ```
- Ảnh bìa + header bo góc: `.account > *` bo góc `--fb-radius-card`, nền trắng.

- [ ] **Step 5: Chạy test để xác nhận PASS**

```powershell
cd frontend
npm test -- src/pages/AccountPage.test.tsx
```
Expected: PASS — 6 tests.

- [ ] **Step 6: Chạy toàn bộ test + type-check + build**

```powershell
cd frontend
npm test
.\node_modules\.bin\tsc --noEmit
npm run build
```
Expected: tất cả PASS; `tsc` không có lỗi; build thành công.

> Nếu `AccountPage.css` còn thừa rule `.account__*` cũ không ai dùng → xoá (giữ file gọn). Nếu `AccountPage.tsx` còn import không dùng → `tsc` sẽ báo, phải xoá.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/pages/AccountPage.tsx frontend/src/pages/AccountPage.css frontend/src/pages/AccountPage.test.tsx
git commit -m "feat(profile): AccountPage thanh trang ca nhan phong cach Facebook"
```

---

## Task 11: Kiểm tra trực quan + cập nhật README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: không có.

- [ ] **Step 1: Chạy dev server và kiểm tra bằng trình duyệt**

```powershell
cd frontend
npm run dev
```

Mở `http://localhost:5173/tai-khoan` → đăng nhập (nếu cần) → kiểm tra:
- [ ] Ảnh bìa hiện đúng, avatar 128px đè góc, tên đầy đủ, username, badge vai trò.
- [ ] 4 tab bấm được, đổi nội dung.
- [ ] `?tab=bookings` mở đúng tab khi F5.
- [ ] Chọn ảnh đại diện → avatar trong header **và** tab Cài đặt cùng đổi.
- [ ] Tab Khoảnh khắc: bấm vòng tròn → mở ảnh lớn, nút ‹ › chuyển ảnh.
- [ ] Tab Cài đặt: đổi email/SĐT vẫn chạy (kiểm tra validation lỗi email).
- [ ] Thu nhỏ cửa sổ 375px → không tràn ngang.

Chụp ảnh màn hình từng tab để đối chiếu với design doc.

- [ ] **Step 2: Cập nhật README**

Trong `README.md`:
1. Mục **"📈 Tiến trình dự án"** → tìm bảng giai đoạn 3 (Tìm & đặt sân). Thêm hàng mới:
   ```
   | 3.13 | **Trang cá nhân phong cách Facebook** `/tai-khoan` — ảnh bìa + avatar, 4 tab (Bài viết · Kèo đã đặt · Khoảnh khắc · Cài đặt), dữ liệu demo | ✅ |
   ```
   Chỉ đánh dấu `✅` sau khi đã verify ở Step 1.
2. Mục **"🌐 API Endpoints"** → **không** thay đổi (tính năng này không thêm endpoint).
3. Mục **"🚀 Công nghệ sử dụng"** → **không** thay đổi (không thêm dependency).

- [ ] **Step 3: Chạy verify cuối**

```powershell
cd frontend
npm test
.\node_modules\.bin\tsc --noEmit
npm run build
```
Expected: PASS / không lỗi / build thành công.

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m "docs: cap nhat README voi trang ca nhan phong cach Facebook"
```

---

## Self-Review

**1. Spec coverage:**

| Yêu cầu spec | Task |
|---|---|
| Ảnh bìa + avatar 128px đè góc | Task 4, Task 10 |
| Tên đầy đủ + username + badge vai trò + trình độ | Task 4 |
| 4 tab, `?tab=` giữ qua F5 | Task 5, Task 10 |
| Tab Bài viết (tái dùng `FeedPostCard`, lọc, đăng bài mới) | Task 8 |
| Tab Kèo đã đặt (3 loại badge, trạng thái) | Task 6 |
| Tab Khoảnh khắc (vòng tròn story, ‹ ›) | Task 7 |
| Tab Cài đặt (form OTP cũ, ảnh hồ sơ, bảo mật) | Task 9 |
| Preview ảnh tại chỗ, không lưu | Task 10 |
| Review Focus #1, #2 (avatar vỡ / null) | Task 4 (test `avatarUrl` null) |
| Review Focus #3 (`?tab=` rác) | Task 10 |
| Review Focus #4 (preview sống qua đổi tab) | Task 10 |
| Review Focus #5 (revoke objectURL) | Task 10 |
| D1 `UserAvatar` size xl + `srcOverride` | Task 2 |
| D2 `role="tablist"` | Task 5 |
| D3 ảnh bìa không dùng `AspectRatio` | Task 4 |
| D4 ảnh mới vào list moments | Task 7 |
| D5 nút Đăng nhập + chờ `isLoading` | Task 10 |
| D6 `authorAvatarSrc` | Task 3 |
| D7 link chia sẻ → `/tai-khoan?tab=posts` | Task 8 |
| Không đụng backend | Không task nào sửa `backend/` |
| Không sửa `demoPosts.ts` | Không task nào sửa file đó |
| README | Task 11 |

→ Không có khoảng trống.

**2. Step scan:** Mỗi task có 5-7 step, mỗi step là 1 hành động kiểm chứng được (viết test → chạy fail → implement → chạy pass → commit). Task 4 và Task 9 có bước CSS tách riêng vì CSS là phần việc thực sự, không phải bản chép lại.

**3. Type consistency:**
- `ProfileTabValue = 'posts' | 'bookings' | 'moments' | 'settings'` — Task 5 định nghĩa, Task 10 dùng. Khớp.
- `ProfileBooking`, `ProfileMoment`, `PROFILE_ROLE_LABEL`, `DEMO_SKILL_LEVEL`, `DEMO_MY_POSTS/BOOKINGS/MOMENTS` — Task 1 định nghĩa, Task 4/6/7/8/9 dùng. Khớp.
- `UserAvatar` size `'xl'` + `srcOverride` — Task 2 định nghĩa, Task 4/9 dùng. Khớp.
- `FeedPostCard` prop `authorAvatarSrc` — Task 3 định nghĩa, Task 8 dùng. Khớp.
- `ProfileHeaderProps.stats` shape `{posts, bookings, moments}` — Task 4 định nghĩa, Task 10 truyền. Khớp.

**4. Review Focus:** 5 dòng, mỗi dòng có test ở đúng task sở hữu code (Task 4, Task 10). Đã kiểm tra — không có dòng nào trống.

**5. Proportion:** Plan dài hơn spec vì có 11 task với TDD cycle đầy đủ, nhưng phần lớn là test code + tên hàm chữ ký, không phải chép lại toàn bộ implementation. Tỷ lệ code-block/implementation ≈ hợp lý cho TDD plan.

---

## Ghi chú kỹ thuật cho implementer

1. **Ưu tiên `AppLink` từ `../components/AppLink`** khi cần link nội bộ — link thuần sẽ reload trang.
2. **`Button` của Astryx dùng `aria-disabled`**, không phải attribute `disabled` → test phải assert `aria-disabled`.
3. **`TabList` navigation pattern** dùng `data-tab-value` + `aria-current`; **tabs pattern** (`role="tablist"`) dùng `role="tab"` + `aria-selected`. Đừng trộn hai cách trong cùng một test.
4. **Nút camera trên avatar** phải là `<button>` HTML thuần có `aria-label` — `IconButton` của Astryx cần prop `label` riêng và sẽ cho accessible name khác.
5. **`Card` của Astryx áp padding bằng StyleX** → luôn bọc `Card` trong `<div className="...__body">` để đặt padding.
6. **Mọi CSS mới** trong `@layer app` để không đè lên component Astryx (thứ tự layer: `reset, app, astryx-base, astryx-theme`).
7. **Không** sửa `frontend/src/data/demoPosts.ts` — feed trang chủ dùng riêng.
8. **Không** sửa `frontend/src/main.tsx` — route `/tai-khoan` đã trỏ đúng `AccountPage`.

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

function renderHeader(
  overrides: Partial<React.ComponentProps<typeof ProfileHeader>> = {},
) {
  const props = {
    user,
    avatarPreviewUrl: null,
    coverPreviewUrl: null,
    stats: {posts: 6, bookings: 6, moments: 5},
    onEditProfile: vi.fn(),
    onPickAvatar: vi.fn(),
    onPickCover: vi.fn(),
    ...overrides,
  };
  return {props, ...render(<ProfileHeader {...props} />)};
}

describe('ProfileHeader', () => {
  it('hiện họ tên đầy đủ và username', () => {
    renderHeader();
    expect(
      screen.getByRole('heading', {name: 'Kieu Văn Sơn'}),
    ).toBeInTheDocument();
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
    const u = userEvent.setup();
    const {props} = renderHeader();
    await u.click(screen.getByRole('button', {name: /Chỉnh sửa hồ sơ/i}));
    expect(props.onEditProfile).toHaveBeenCalled();
  });

  it('bấm Đổi ảnh bìa gọi onPickCover', async () => {
    const u = userEvent.setup();
    const {props} = renderHeader();
    await u.click(screen.getByRole('button', {name: /Đổi ảnh bìa/i}));
    expect(props.onPickCover).toHaveBeenCalled();
  });

  it('bấm nút camera trên avatar gọi onPickAvatar', async () => {
    const u = userEvent.setup();
    const {props} = renderHeader();
    await u.click(screen.getByRole('button', {name: /Đổi ảnh đại diện/i}));
    expect(props.onPickAvatar).toHaveBeenCalled();
  });

  it('avatarPreviewUrl ghi đè ảnh avatar', () => {
    const {container} = renderHeader({avatarPreviewUrl: 'blob:avatar-preview'});
    expect(
      container.querySelector('.profile-header__avatar img'),
    ).toHaveAttribute('src', 'blob:avatar-preview');
  });

  it('coverPreviewUrl ghi đè ảnh bìa', () => {
    const {container} = renderHeader({coverPreviewUrl: 'blob:cover-preview'});
    expect(
      container.querySelector('.profile-header__cover img'),
    ).toHaveAttribute('src', 'blob:cover-preview');
  });

  it('user không có avatarUrl → không render thẻ img cho avatar', () => {
    const {container} = renderHeader({user: {...user, avatarUrl: null}});
    expect(
      container.querySelector('.profile-header__avatar img'),
    ).not.toBeInTheDocument();
  });

  it('avatar dùng size 128px khi không có preview', () => {
    const {container} = renderHeader();
    const root = container.querySelector(
      '.profile-header__avatar [role="img"]',
    ) as HTMLElement;
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-size', 'xl');
  });
});

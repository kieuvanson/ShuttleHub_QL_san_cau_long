import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from './UserAvatar';

/**
 * ⚠️ `Avatar` của Astryx vẽ chữ cái đầu bằng CSS `::before` (generated
 * content) → KHÔNG nằm trong DOM text. Vì vậy test kiểm tra ảnh qua
 * `container.querySelector('img')` và kiểm tra tên hiển thị qua
 * `aria-label` của root (`role="img"`), không dùng `getByText`.
 */
describe('UserAvatar', () => {
  it('có avatarUrl → render ảnh với src đó', () => {
    const { container } = render(
      <UserAvatar
        user={{ fullName: 'Kieu Van Son', avatarUrl: 'https://cdn.fb/son.jpg' }}
      />,
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
  });

  it('không có avatarUrl → KHÔNG render ảnh (fallback chữ cái đầu)', () => {
    const { container } = render(
      <UserAvatar user={{ fullName: 'Kieu Van Son', avatarUrl: null }} />,
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('user null → vẫn render, không vỡ', () => {
    const { container } = render(<UserAvatar user={null} />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('tên rỗng → fallback sang username', () => {
    render(
      <UserAvatar
        user={{ fullName: '', avatarUrl: null, username: 'sonvankieu' }}
      />,
    );

    expect(screen.getByRole('img', { name: 'sonvankieu' })).toBeInTheDocument();
  });

  it('accessible name lấy từ tên rút gọn ("Kieu Van Son" → "Son")', () => {
    render(
      <UserAvatar
        user={{ fullName: 'Kieu Van Son', avatarUrl: 'https://cdn.fb/son.jpg' }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Son' })).toBeInTheDocument();
  });

  it('user không có fullName → dùng username làm accessible name', () => {
    render(
      <UserAvatar user={{ fullName: null, avatarUrl: null, username: 'sonvk' }} />,
    );

    expect(screen.getByRole('img', { name: 'sonvk' })).toBeInTheDocument();
  });
});

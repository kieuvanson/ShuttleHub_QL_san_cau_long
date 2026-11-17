import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from './UserAvatar';

/**
 * ⚠️ `Avatar` của Astryx vẽ chữ cái đầu bằng CSS `::before` (generated
 * content) → KHÔNG nằm trong DOM text. Vì vậy test kiểm tra ảnh qua
 * `container.querySelector('img')` và kiểm tra tên hiển thị qua
 * `aria-label` của root (`role="img"`), không dùng `getByText`.
    10| */
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

  it("size='xl' dựng avatar 128px", () => {
    const { container } = render(
      <UserAvatar user={{ fullName: 'Kieu Van Son' }} size="xl" />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeInTheDocument();
    // `Avatar` của Astryx đánh dấu size bằng `data-size` và đặt kích thước
    // thật qua custom property `--x-width` (StyleX) — jsdom không tính
    // layout nên `getComputedStyle` trả "auto".
    expect(root).toHaveAttribute('data-size', 'xl');
    expect(root.style.getPropertyValue('--x-width')).toBe('128px');
  });

  it('fill → avatar chiếm 100% khung cha (để responsive theo CSS)', () => {
    const { container } = render(
      <UserAvatar user={{ fullName: 'Kieu Van Son' }} size="xl" fill />,
    );

    const root = container.firstElementChild as HTMLElement;
    // `Avatar` của Astryx đặt kích thước qua inline `--x-width/--x-height`
    // → ghi đè bằng `width/height: 100%` để avatar co theo khung cha.
    expect(root.style.width).toBe('100%');
    expect(root.style.height).toBe('100%');
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
});

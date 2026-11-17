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
    const u = userEvent.setup();
    const {container} = render(<ProfilePosts user={user} />);
    const challengeTab = container.querySelector('[data-tab-value="challenge"]');
    expect(challengeTab).not.toBeNull();
    await u.click(challengeTab as Element);
    await waitFor(() => {
      for (const post of screen.getAllByRole('article')) {
        expect(post.textContent).toContain('XÉT KÈO');
      }
    });
  });

  it('bấm nút Đăng bài mới mở modal và bài mới chèn lên đầu', async () => {
    const u = userEvent.setup();
    render(<ProfilePosts user={user} />);
    await u.click(screen.getByRole('button', {name: /Đăng bài mới/i}));
    await u.type(screen.getByRole('textbox'), 'Bài của tôi trên hồ sơ');
    await u.click(screen.getByRole('button', {name: 'Đăng bài'}));
    await waitFor(() => {
      expect(screen.getAllByRole('article')[0].textContent).toContain(
        'Bài của tôi trên hồ sơ',
      );
    });
  });

  it('bấm Thích làm likeCount tăng 1', async () => {
    const u = userEvent.setup();
    render(<ProfilePosts user={user} />);
    const likeButton = screen.getAllByRole('button', {name: 'Thích'})[0];
    const before = screen.getAllByRole('article')[0].textContent ?? '';
    await u.click(likeButton);
    expect(screen.getAllByRole('article')[0].textContent).not.toBe(before);
  });

  it('avatar tác giả dùng ảnh thật của user', () => {
    const {container} = render(<ProfilePosts user={user} />);
    const img = container.querySelector('.feed-post__head img');
    expect(img).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
  });
});

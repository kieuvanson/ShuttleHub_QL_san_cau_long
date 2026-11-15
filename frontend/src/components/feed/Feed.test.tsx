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

function renderFeed(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
    const {container} = renderFeed();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    // Tab của Astryx đánh dấu bằng `data-tab-value` (không dùng role="tab"),
    // nên phải truy vấn theo attribute để không nhầm với nút "Xét kèo" ở composer.
    const challengeTab = container.querySelector('[data-tab-value="challenge"]');
    expect(challengeTab).not.toBeNull();
    await user.click(challengeTab as Element);
    await waitFor(() => {
      for (const post of screen.getAllByRole('article')) {
        expect(post.textContent).toContain('XÉT KÈO');
      }
    });
  });

  it('bấm Thích làm likeCount tăng 1, bấm lần hai trở về số cũ', async () => {
    const user = userEvent.setup();
    renderFeed();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    const likeButton = screen.getAllByRole('button', {name: 'Thích'})[0];
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
    await user.click(
      screen.getByRole('button', {
        name: 'Bạn muốn xét kèo hay tuyển người đánh cùng?',
      }),
    );
    await user.type(screen.getByRole('textbox'), 'Bài đăng thử nghiệm');
    await user.click(screen.getByRole('button', {name: 'Đăng bài'}));
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
    await user.click(
      screen.getByRole('button', {
        name: 'Bạn muốn xét kèo hay tuyển người đánh cùng?',
      }),
    );
    // Modal đăng bài không mở → không có textbox nào trong trang.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('deep-link ?post=id-khong-ton-tai vẫn render feed bình thường', async () => {
    renderFeed('/?post=khong-ton-tai');
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
    const shareButton = screen.getAllByRole('button', {name: 'Chia sẻ'})[0];
    await expect(user.click(shareButton)).resolves.not.toThrow();
  });
});

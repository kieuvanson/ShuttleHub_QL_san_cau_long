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
  // ⚠️ Chỉ set `user`, KHÔNG set access token.
  //   `AuthProvider` bootstrap gọi `authApi.me()` khi có access token → trong
  //   test không có backend nên lệnh đó fail → token bị xoá và user bị set
  //   null → trang rơi về trạng thái "chưa đăng nhập".
  //   (Đây cũng là cách `Feed.test.tsx` mô phỏng user đã đăng nhập.)
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
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
      expect(
        screen.getByRole('heading', {name: 'Kieu Văn Sơn'}),
      ).toBeInTheDocument(),
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

  it('mọi tab đều trỏ aria-controls tới panel có thật trong DOM', async () => {
    loginAs();
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('tab', {name: 'Bài viết'})).toBeInTheDocument(),
    );
    // ⚠️ `aria-controls` trỏ tới id không tồn tại là giá trị không hợp lệ
    //   (WCAG / axe `aria-valid-attr-value`) → screen reader không tìm được
    //   panel mà tab điều khiển.
    for (const tab of screen.getAllByRole('tab')) {
      const controls = tab.getAttribute('aria-controls');
      expect(controls).toBeTruthy();
      expect(document.getElementById(controls as string)).not.toBeNull();
    }
  });

  it('bấm tab Cài đặt đổi nội dung hiển thị', async () => {
    loginAs();
    const u = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('tab', {name: 'Cài đặt'})).toBeInTheDocument(),
    );
    await u.click(screen.getByRole('tab', {name: 'Cài đặt'}));
    await waitFor(() => {
      const panel = document.getElementById('profile-panel-settings');
      expect(panel).not.toBeNull();
      expect(panel).not.toHaveAttribute('hidden');
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
    // Panel không chọn phải bị ẩn đi khỏi cây truy cập.
    expect(document.getElementById('profile-panel-posts')).toHaveAttribute(
      'hidden',
    );
  });

  it('nút Chỉnh sửa hồ sơ chuyển sang tab Cài đặt', async () => {
    loginAs();
    const u = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: /Chỉnh sửa hồ sơ/i}),
      ).toBeInTheDocument(),
    );
    await u.click(screen.getByRole('button', {name: /Chỉnh sửa hồ sơ/i}));
    await waitFor(() =>
      expect(screen.getByRole('tab', {name: 'Cài đặt'})).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });

  it('chọn ảnh đại diện → preview hiện ở header', async () => {
    loginAs();
    const u = userEvent.setup();
    const {container} = renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: /Đổi ảnh đại diện/i}),
      ).toBeInTheDocument(),
    );

    const input = container.querySelector(
      'input[type="file"][aria-label="Chọn ảnh đại diện"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();

    const file = new File(['x'], 'me.jpg', {type: 'image/jpeg'});
    await u.upload(input, file);

    await waitFor(() => {
      const img = container.querySelector('.profile-header__avatar img');
      expect(img).toHaveAttribute('src', expect.stringContaining('blob:'));
    });
  });
});

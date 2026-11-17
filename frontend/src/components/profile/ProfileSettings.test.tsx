import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it} from 'vitest';
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
    expect(
      screen.getByRole('button', {name: /Đổi ảnh đại diện/i}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: /Đổi ảnh bìa/i}),
    ).toBeInTheDocument();
  });

  it('có mục bảo mật với nút đặt lại mật khẩu', () => {
    renderSettings();
    expect(
      screen.getByRole('button', {name: /Đặt lại mật khẩu/i}),
    ).toBeInTheDocument();
  });

  it('đổi SĐT mà chưa có OTP thì báo thiếu mã xác nhận', async () => {
    const u = userEvent.setup();
    renderSettings();
    await u.type(screen.getByLabelText('Số điện thoại'), '0909999999');
    await u.click(screen.getByRole('button', {name: /Lưu thay đổi/i}));
    await waitFor(() =>
      expect(
        screen.getByText('Vui lòng nhập đủ mã xác nhận.'),
      ).toBeInTheDocument(),
    );
  });
});

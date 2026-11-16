import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../api/config';
import { AuthProvider } from '../context/AuthContext';
import { Header } from './Header';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="loc">{`${location.pathname}${location.hash}`}</span>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Header />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Header — link tới anchor', () => {
  it('"Bảng giá" điều hướng tới /tim-san#bang-gia', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('link', { name: 'Bảng giá' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#bang-gia');
  });

  it('"Hỗ trợ" điều hướng tới /tim-san#faq', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('link', { name: 'Hỗ trợ' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#faq');
  });
});

describe('Header — tên & avatar khi đã đăng nhập', () => {
  /** localStorage phải sạch giữa các test — AuthProvider đọc lúc mount. */
  beforeEach(() => {
    localStorage.clear();
  });

  /** Mô phỏng user đã đăng nhập — AuthProvider đọc user từ localStorage. */
  function loginAs(user: Record<string, unknown>) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }

  const facebookUser = {
    id: 'u-1',
    username: 'sonvk',
    email: 'sonvk@x.com',
    fullName: 'Kieu Van Son',
    phoneNumber: null,
    role: 'CUSTOMER',
    createdAt: '2026-01-01T00:00:00Z',
    avatarUrl: 'https://cdn.fb/son.jpg',
  };

  it('header hiện tên rút gọn, không phải tên đầy đủ', async () => {
    loginAs(facebookUser);
    renderHeader();

    const btn = await screen.findByRole('button', { name: /Son/ });
    expect(btn).toHaveTextContent('Son');
    expect(btn).not.toHaveTextContent('Kieu Van Son');
  });

  it('header hiện avatar Facebook', async () => {
    loginAs(facebookUser);
    const { container } = renderHeader();

    await screen.findByRole('button', { name: /Son/ });
    const img = container.querySelector('img[src="https://cdn.fb/son.jpg"]');
    expect(img).not.toBeNull();
  });

  it('mở menu → vẫn hiện tên ĐẦY ĐỦ (chỗ kiểm tra thông tin)', async () => {
    const user = userEvent.setup();
    loginAs(facebookUser);
    renderHeader();

    await user.click(await screen.findByRole('button', { name: /Son/ }));

    expect(await screen.findByText('Kieu Van Son')).toBeInTheDocument();
  });
});

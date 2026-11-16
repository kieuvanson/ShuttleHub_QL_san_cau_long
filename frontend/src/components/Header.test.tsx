import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
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

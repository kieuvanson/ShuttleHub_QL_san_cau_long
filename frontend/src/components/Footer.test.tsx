import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="loc">{`${location.pathname}${location.hash}`}</span>;
}

function renderFooter() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Footer />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Footer — link tới anchor', () => {
  it('"Hướng dẫn đặt sân" điều hướng tới /tim-san#faq', async () => {
    const user = userEvent.setup();
    renderFooter();
    await user.click(screen.getByRole('link', { name: 'Hướng dẫn đặt sân' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#faq');
  });

  it('"Điều khoản" điều hướng tới /tim-san#dieu-khoan', async () => {
    const user = userEvent.setup();
    renderFooter();
    await user.click(screen.getByRole('link', { name: 'Điều khoản' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#dieu-khoan');
  });
});

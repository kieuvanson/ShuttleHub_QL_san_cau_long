import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Hero } from './Hero';

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
}

describe('Hero', () => {
  it('tiêu đề ở mức h2 vì h1 thuộc về tiêu đề trang', () => {
    renderHero();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Đặt sân cầu lông trong 30 giây' }),
    ).toBeInTheDocument();
  });

  it('không còn ô tìm kiếm trùng với thanh tìm nhanh của trang tìm sân', () => {
    renderHero();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });
});

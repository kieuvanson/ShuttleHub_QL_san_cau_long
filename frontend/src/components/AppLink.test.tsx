import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLink } from './AppLink';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="loc">{`${location.pathname}${location.hash}`}</span>;
}

/**
 * `AppLink` là component mọi link anchor của app đi qua — nó giữ vai trò
 * cuộn tới section (React Router tự nó KHÔNG cuộn tới hash khi điều hướng
 * SPA). Vì vậy hành vi này phải có test riêng, không được dựa vào
 * `verify-split.mjs` (cần dev server + Chrome thật).
 */
describe('AppLink — cuộn tới anchor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Danh sách `id` của các element đã được cuộn tới. */
  const scrolledIds = () =>
    vi.mocked(Element.prototype.scrollIntoView).mock.contexts.map(
      (ctx) => (ctx as HTMLElement).id,
    );

  const flush = async () => {
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
  };

  it('cuộn tới element có id tương ứng sau khi điều hướng tới anchor', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLink to="/tim-san#bang-gia">Bảng giá</AppLink>
        <div id="bang-gia">Bảng giá</div>
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Bảng giá' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/tim-san#bang-gia');

    await flush();

    expect(scrolledIds()).toContain('bang-gia');
  });

  it('cuộn ngay khi mở trang đã có sẵn hash trong URL', async () => {
    render(
      <MemoryRouter initialEntries={['/tim-san#faq']}>
        <AppLink to="/tim-san#faq">FAQ</AppLink>
        <div id="faq">FAQ</div>
        <LocationProbe />
      </MemoryRouter>,
    );

    await flush();

    expect(scrolledIds()).toContain('faq');
  });

  it('bấm lại CÙNG một anchor khi đang đứng ở trang đó vẫn cuộn', async () => {
    render(
      <MemoryRouter initialEntries={['/tim-san#bang-gia']}>
        <AppLink to="/tim-san#bang-gia">Bảng giá</AppLink>
        <div id="bang-gia">Bảng giá</div>
        <LocationProbe />
      </MemoryRouter>,
    );

    await flush();
    const callsBefore = vi.mocked(Element.prototype.scrollIntoView).mock.calls.length;

    fireEvent.click(screen.getByRole('link', { name: 'Bảng giá' }));
    await flush();

    // `location.key` đổi mỗi lần điều hướng → effect chạy lại dù
    // pathname + hash không đổi.
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });

  it('không cuộn tới anchor khi link không có hash', async () => {
    render(
      <MemoryRouter initialEntries={['/tim-san']}>
        <AppLink to="/">Trang chủ</AppLink>
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Trang chủ' }));
    await flush();

    expect(vi.mocked(Element.prototype.scrollIntoView)).not.toHaveBeenCalled();
  });
});

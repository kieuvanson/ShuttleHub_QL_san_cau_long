import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CourtDiscovery } from './CourtDiscovery';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tim-san']}>
      <CourtDiscovery />
    </MemoryRouter>,
  );
}

describe('CourtDiscovery — trang tìm sân', () => {
  it('có tiêu đề chính h1 và khối kết quả', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tìm sân cầu lông' }),
    ).toBeInTheDocument();
    expect(document.getElementById('ket-qua')).not.toBeNull();
  });

  it('chứa đủ các section landing và anchor của chúng', () => {
    renderPage();
    expect(document.getElementById('bang-gia')).not.toBeNull();
    expect(document.getElementById('faq')).not.toBeNull();
    expect(document.getElementById('dieu-khoan')).not.toBeNull();
    expect(document.getElementById('chinh-sach')).not.toBeNull();
    expect(screen.getByText('Sân cầu lông nổi bật hôm nay')).toBeInTheDocument();
  });

  it('chỉ có MỘT công cụ tìm kiếm trên trang', () => {
    renderPage();
    // `QuickSearchBar` dùng role="search"; form cũ của Hero đã bị bỏ.
    expect(screen.getAllByRole('search')).toHaveLength(1);
  });

  it('không còn link nào tới /tim-san mà thiếu hash', () => {
    const {container} = renderPage();
    // Link `to="/tim-san"` khi đang đứng ở `/tim-san` là no-op của React
    // Router: URL không đổi, trang không cuộn → người dùng bấm mà không có
    // gì xảy ra. Mọi link nội bộ tới trang tìm sân phải kèm hash.
    const anchors = Array.from(container.querySelectorAll('a[href*="/tim-san"]'));
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(a.getAttribute('href')).toMatch(/#/);
    }
  });

  it('có link đi tới kết quả tìm sân', () => {
    const {container} = renderPage();
    const toResults = Array.from(
      container.querySelectorAll('a[href*="/tim-san#ket-qua"]'),
    );
    expect(toResults.length).toBeGreaterThan(0);
  });
});

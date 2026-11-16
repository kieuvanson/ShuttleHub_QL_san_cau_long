import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { DEMO_POSTS } from '../data/demoPosts';
import { Home } from './Home';

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Home — trang chủ chỉ có bảng tin', () => {
  it('render feed cộng đồng', async () => {
    renderHome();
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(DEMO_POSTS.length);
    });
  });

  it('không còn section landing nào', async () => {
    renderHome();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    expect(document.getElementById('bang-gia')).toBeNull();
    expect(document.getElementById('faq')).toBeNull();
    expect(screen.queryByText('Đặt sân cầu lông trong 30 giây')).not.toBeInTheDocument();
    expect(screen.queryByText('Sân cầu lông nổi bật hôm nay')).not.toBeInTheDocument();
  });

  it('có h1 cho trình đọc màn hình', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bảng tin cộng đồng cầu lông' }),
    ).toBeInTheDocument();
  });
});

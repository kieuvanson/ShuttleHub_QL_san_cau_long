import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {DEMO_PLAYERS, DEMO_SUGGESTED} from '../../data/demoPosts';
import {FeedSidebar} from './FeedSidebar';

function renderSidebar() {
  return render(
    <MemoryRouter>
      <FeedSidebar onUnavailableFeature={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('FeedSidebar', () => {
  it('hiện đủ 4 người đang tuyển', () => {
    renderSidebar();
    for (const player of DEMO_PLAYERS) {
      expect(screen.getAllByText(player.name).length).toBeGreaterThan(0);
    }
  });

  it('hiện đủ 3 gợi ý kết bạn', () => {
    renderSidebar();
    for (const person of DEMO_SUGGESTED) {
      expect(screen.getAllByText(person.name).length).toBeGreaterThan(0);
    }
  });

  it('có link tới trang tìm sân', () => {
    renderSidebar();
    expect(screen.getByRole('link', {name: /tìm sân nhanh/i})).toHaveAttribute('href', '/tim-san');
  });
});

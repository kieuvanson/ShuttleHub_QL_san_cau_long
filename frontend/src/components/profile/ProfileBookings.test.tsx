import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {DEMO_MY_BOOKINGS} from '../../data/demoProfile';
import {ProfileBookings} from './ProfileBookings';

describe('ProfileBookings', () => {
  it('render danh sách kèo demo', () => {
    render(<ProfileBookings onUnavailableFeature={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(
      DEMO_MY_BOOKINGS.length,
    );
  });

  it('mỗi loại kèo có badge nhãn riêng', () => {
    render(<ProfileBookings onUnavailableFeature={vi.fn()} />);
    // Mỗi loại kèo có thể xuất hiện nhiều lần (vd 2 kèo "Đã đặt sân") →
    // dùng getAllByText thay vì getByText.
    expect(screen.getAllByText('Đã đặt sân').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Xét kèo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tuyển người đánh').length).toBeGreaterThan(0);
  });

  it('kèo đã hoàn thành có badge Đã hoàn thành', () => {
    render(<ProfileBookings onUnavailableFeature={vi.fn()} />);
    expect(screen.getAllByText('Đã hoàn thành').length).toBeGreaterThan(0);
  });

  it('bấm nút hành động gọi onUnavailableFeature', async () => {
    const u = userEvent.setup();
    const onUnavailableFeature = vi.fn();
    render(<ProfileBookings onUnavailableFeature={onUnavailableFeature} />);
    await u.click(screen.getAllByRole('button', {name: 'Hủy kèo'})[0]);
    expect(onUnavailableFeature).toHaveBeenCalled();
  });

  it('danh sách rỗng hiện EmptyState', () => {
    render(<ProfileBookings bookings={[]} onUnavailableFeature={vi.fn()} />);
    expect(screen.getByText('Chưa có kèo nào')).toBeInTheDocument();
  });
});

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {ProfileTabs} from './ProfileTabs';

describe('ProfileTabs', () => {
  it('hiện đủ 4 tab', () => {
    render(<ProfileTabs value="posts" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', {name: 'Bài viết'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Kèo đã đặt'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Khoảnh khắc'})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Cài đặt'})).toBeInTheDocument();
  });

  it('tab đang chọn có aria-selected=true', () => {
    render(<ProfileTabs value="bookings" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', {name: 'Kèo đã đặt'})).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', {name: 'Bài viết'})).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('bấm tab khác gọi onChange với giá trị mới', async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<ProfileTabs value="posts" onChange={onChange} />);
    await u.click(screen.getByRole('tab', {name: 'Khoảnh khắc'}));
    expect(onChange).toHaveBeenCalledWith('moments');
  });
});

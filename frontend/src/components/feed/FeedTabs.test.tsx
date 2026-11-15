import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {FeedTabs} from './FeedTabs';

/**
 * `TabList` của Astryx không dùng pattern `role="tablist"`/`role="tab"` mà
 * render `<nav>` + `<button data-tab-value>` và đánh dấu tab đang chọn bằng
 * `aria-current="true"`. Test bám theo hành vi thật của thư viện.
 */
describe('FeedTabs', () => {
  it('hiện đủ 4 tab', () => {
    render(<FeedTabs value="all" onChange={vi.fn()} />);
    expect(screen.getByRole('button', {name: 'Tất cả'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Tuyển người đánh'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Xét kèo'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Cảm nghĩ'})).toBeInTheDocument();
  });

  it('tab đang chọn được đánh dấu aria-current', () => {
    render(<FeedTabs value="challenge" onChange={vi.fn()} />);
    expect(screen.getByRole('button', {name: 'Xét kèo'})).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', {name: 'Tất cả'})).not.toHaveAttribute('aria-current');
  });

  it('bấm tab khác gọi onChange với giá trị tương ứng', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FeedTabs value="all" onChange={onChange} />);
    await user.click(screen.getByRole('button', {name: 'Cảm nghĩ'}));
    expect(onChange).toHaveBeenCalledWith('thought');
  });
});

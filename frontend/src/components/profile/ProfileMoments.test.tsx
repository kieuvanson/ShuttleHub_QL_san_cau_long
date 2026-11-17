import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {DEMO_MY_MOMENTS} from '../../data/demoProfile';
import {ProfileMoments} from './ProfileMoments';

describe('ProfileMoments', () => {
  it('render ô Thêm khoảnh khắc cộng mỗi khoảnh khắc demo', () => {
    render(<ProfileMoments />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(DEMO_MY_MOMENTS.length + 1);
    expect(screen.getByText('Thêm khoảnh khắc')).toBeInTheDocument();
  });

  it('bấm vào khoảnh khắc mở dialog xem ảnh lớn', async () => {
    const u = userEvent.setup();
    render(<ProfileMoments />);
    await u.click(
      screen.getByRole('button', {name: DEMO_MY_MOMENTS[0].caption}),
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByRole('dialog').textContent).toContain(
      DEMO_MY_MOMENTS[0].caption,
    );
  });

  it('dialog có nút khoảnh khắc trước và sau', async () => {
    const u = userEvent.setup();
    render(<ProfileMoments />);
    await u.click(
      screen.getByRole('button', {name: DEMO_MY_MOMENTS[0].caption}),
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(
      screen.getByRole('button', {name: 'Khoảnh khắc trước'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Khoảnh khắc sau'}),
    ).toBeInTheDocument();
  });

  it('bấm khoảnh khắc sau chuyển sang khoảnh khắc kế tiếp', async () => {
    const u = userEvent.setup();
    render(<ProfileMoments />);
    await u.click(
      screen.getByRole('button', {name: DEMO_MY_MOMENTS[0].caption}),
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await u.click(screen.getByRole('button', {name: 'Khoảnh khắc sau'}));
    await waitFor(() =>
      expect(screen.getByRole('dialog').textContent).toContain(
        DEMO_MY_MOMENTS[1].caption,
      ),
    );
  });

  it('ô Thêm khoảnh khắc có file picker nhận ảnh', () => {
    const {container} = render(<ProfileMoments />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('chọn ảnh mới thì thêm khoảnh khắc vào dải vòng tròn', async () => {
    const u = userEvent.setup();
    const {container} = render(<ProfileMoments />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const file = new File(['x'], 'me.jpg', {type: 'image/jpeg'});
    await u.upload(input, file);

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBe(
        DEMO_MY_MOMENTS.length + 2,
      );
    });
    expect(screen.getByText('Khoảnh khắc mới')).toBeInTheDocument();
  });
});

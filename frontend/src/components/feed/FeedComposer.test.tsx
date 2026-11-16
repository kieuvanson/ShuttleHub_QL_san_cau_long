import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {FeedComposer} from './FeedComposer';
import {FeedComposerModal} from './FeedComposerModal';

describe('FeedComposer', () => {
  it('bấm ô viết bài gọi onOpenComposer với loại mặc định', async () => {
    const user = userEvent.setup();
    const onOpenComposer = vi.fn();
    render(
      <FeedComposer
        user={null}
        onOpenComposer={onOpenComposer}
        onUnavailableFeature={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Bạn muốn xét kèo hay tuyển người đánh cùng?',
      }),
    );
    expect(onOpenComposer).toHaveBeenCalledWith('challenge');
  });

  it('bấm nút Tuyển người đánh mở modal với loại recruit', async () => {
    const user = userEvent.setup();
    const onOpenComposer = vi.fn();
    render(
      <FeedComposer
        user={null}
        onOpenComposer={onOpenComposer}
        onUnavailableFeature={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', {name: 'Tuyển người đánh'}));
    expect(onOpenComposer).toHaveBeenCalledWith('recruit');
  });

  it('bấm nút Ảnh / Video báo tính năng chưa làm', async () => {
    const user = userEvent.setup();
    const onUnavailableFeature = vi.fn();
    render(
      <FeedComposer
        user={null}
        onOpenComposer={vi.fn()}
        onUnavailableFeature={onUnavailableFeature}
      />,
    );
    await user.click(screen.getByRole('button', {name: 'Ảnh / Video'}));
    expect(onUnavailableFeature).toHaveBeenCalledWith('Ảnh / Video');
  });

  it('có user đăng nhập → hiện avatar của user thay vì "Khách"', () => {
    const { container } = render(
      <FeedComposer
        user={{
          id: 'u-1',
          username: 'sonvk',
          email: 'a@b.com',
          fullName: 'Kieu Van Son',
          phoneNumber: null,
          role: 'CUSTOMER',
          createdAt: '2026-01-01T00:00:00Z',
          avatarUrl: 'https://cdn.fb/son.jpg',
        }}
        onOpenComposer={vi.fn()}
        onUnavailableFeature={vi.fn()}
      />,
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
  });

  it('chưa đăng nhập → vẫn render được (không vỡ)', () => {
    render(
      <FeedComposer
        user={null}
        onOpenComposer={vi.fn()}
        onUnavailableFeature={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Bạn muốn xét kèo hay tuyển người đánh cùng?',
      }),
    ).toBeInTheDocument();
  });
});

describe('FeedComposerModal', () => {
  it('nút Đăng bài bị khoá khi nội dung rỗng', () => {
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    // `Button` của Astryx dùng `aria-disabled` (không phải attribute `disabled`)
    // để nút vẫn giữ được focus và screen reader đọc được trạng thái.
    expect(screen.getByRole('button', {name: 'Đăng bài'})).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('gửi bài hợp lệ lên onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await user.type(screen.getByRole('textbox'), 'Buổi tối ai rảnh đánh đôi với mình');
    await user.click(screen.getByRole('button', {name: 'Đăng bài'}));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      category: 'challenge',
      content: 'Buổi tối ai rảnh đánh đôi với mình',
      authorName: 'Nguyễn Văn A',
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    });
  });

  it('chọn loại bài khác trước khi gửi thì category đổi theo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('radio', {name: /tuyển người đánh/i}));
    await user.type(screen.getByRole('textbox'), 'Cần 1 bạn chơi đôi tối mai');
    await user.click(screen.getByRole('button', {name: 'Đăng bài'}));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({category: 'recruit'});
  });

  it('nội dung vượt 500 ký tự thì nút Đăng bài bị khoá', () => {
    render(
      <FeedComposerModal
        isOpen
        initialCategory="challenge"
        authorName="Nguyễn Văn A"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    // Dùng fireEvent thay vì userEvent.type: gõ 501 ký tự từng phím quá
    // chậm cho timeout mặc định của Vitest.
    fireEvent.change(screen.getByRole('textbox'), {
      target: {value: 'a'.repeat(501)},
    });
    expect(screen.getByRole('button', {name: 'Đăng bài'})).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {DEMO_POSTS} from '../../data/demoPosts';
import {FeedPostCard} from './FeedPostCard';

const post = DEMO_POSTS[0];

function renderCard(overrides: Partial<React.ComponentProps<typeof FeedPostCard>> = {}) {
  const props = {
    post,
    isLiked: false,
    onToggleLike: vi.fn(),
    onShare: vi.fn(),
    onUnavailableFeature: vi.fn(),
    ...overrides,
  };
  return {props, ...render(<FeedPostCard {...props} />)};
}

describe('FeedPostCard', () => {
  it('hiện tên tác giả và nội dung bài', () => {
    renderCard();
    // Avatar của Astryx render cả `role="img"` (avatar) lẫn `role="tooltip"`
    // (tên đầy đủ) → tên tác giả xuất hiện 2 lần. Dùng getAllByText.
    expect(screen.getAllByText(post.authorName).length).toBeGreaterThan(0);
    expect(screen.getByText(post.content)).toBeInTheDocument();
  });

  it('hiện nhãn loại bài tương ứng', () => {
    renderCard();
    expect(screen.getByText('TUYỂN NGƯỜI ĐÁNH')).toBeInTheDocument();
  });

  it('bấm Thích gọi onToggleLike với id bài', async () => {
    const user = userEvent.setup();
    const {props} = renderCard();
    await user.click(screen.getByRole('button', {name: /thích/i}));
    expect(props.onToggleLike).toHaveBeenCalledWith(post.id);
  });

  it('bài đã thích có nút Thích ở trạng thái aria-pressed', () => {
    renderCard({isLiked: true});
    expect(screen.getByRole('button', {name: /thích/i})).toHaveAttribute('aria-pressed', 'true');
  });

  it('bấm Chia sẻ gọi onShare với id bài', async () => {
    const user = userEvent.setup();
    const {props} = renderCard();
    await user.click(screen.getByRole('button', {name: /chia sẻ/i}));
    expect(props.onShare).toHaveBeenCalledWith(post.id);
  });

  it('bấm Bình luận gọi onUnavailableFeature với tên tính năng', async () => {
    const user = userEvent.setup();
    const {props} = renderCard();
    await user.click(screen.getByRole('button', {name: /bình luận/i}));
    expect(props.onUnavailableFeature).toHaveBeenCalledWith('Bình luận');
  });

  it('bài có ảnh thì render thẻ ảnh với alt text', () => {
    const withImage = DEMO_POSTS.find((p) => p.image)!;
    renderCard({post: withImage});
    // `role="img"` còn dính avatar của Astryx → lọc theo alt text cụ thể.
    const img = screen.getByAltText(withImage.imageAlt!);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', withImage.image);
  });

  it('bài không ảnh thì không có thẻ ảnh', () => {
    const withoutImage = DEMO_POSTS.find((p) => !p.image)!;
    renderCard({post: withoutImage});
    // Avatar vẫn có role="img" → kiểm tra không có <img> nào trong bài.
    expect(document.querySelector('.feed-post__media')).not.toBeInTheDocument();
  });

  it('truyền authorAvatarSrc thì avatar tác giả dùng ảnh đó', () => {
    const {container} = renderCard({
      post,
      authorAvatarSrc: 'https://cdn.fb/son.jpg',
    });

    const img = container.querySelector('.feed-post__head img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://cdn.fb/son.jpg');
  });

  it('không truyền authorAvatarSrc thì avatar tác giả không có thẻ img', () => {
    const {container} = renderCard({post});

    expect(container.querySelector('.feed-post__head img')).not.toBeInTheDocument();
  });
});

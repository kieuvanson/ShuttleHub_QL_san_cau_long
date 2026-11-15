import {describe, expect, it} from 'vitest';
import {DEMO_POSTS} from '../../data/demoPosts';
import {createPost, filterPosts, toggleLike, toggleLikedId} from './feedUtils';

describe('filterPosts', () => {
  it("'all' trả về toàn bộ bài, giữ nguyên thứ tự", () => {
    expect(filterPosts(DEMO_POSTS, 'all')).toEqual(DEMO_POSTS);
  });

  it('lọc đúng loại bài được chọn', () => {
    const result = filterPosts(DEMO_POSTS, 'challenge');
    expect(result.length).toBeGreaterThan(0);
    for (const post of result) expect(post.category).toBe('challenge');
  });

  it('loại không có bài nào trả về mảng rỗng', () => {
    const empty: typeof DEMO_POSTS = [];
    expect(filterPosts(empty, 'recruit')).toEqual([]);
  });
});

describe('toggleLikedId', () => {
  it('bấm lần đầu thêm id vào tập đã thích', () => {
    expect(toggleLikedId(new Set<string>(), 'p-001')).toEqual(new Set(['p-001']));
  });

  it('bấm lần hai gỡ id khỏi tập đã thích', () => {
    expect(toggleLikedId(new Set(['p-001']), 'p-001')).toEqual(new Set<string>());
  });
});

describe('toggleLike', () => {
  it('bài chưa thích tăng likeCount lên 1', () => {
    const [post] = DEMO_POSTS;
    const [next] = toggleLike(DEMO_POSTS, new Set<string>(), post.id);
    expect(next.likeCount).toBe(post.likeCount + 1);
  });

  // `likedIds` là trạng thái TRƯỚC khi bấm, `posts` là mảng bài hiện tại
  // (likeCount đã bao gồm lượt thích của chính người dùng nếu đã thích).
  it('bài đã thích giảm likeCount về số ban đầu', () => {
    const [post] = DEMO_POSTS;
    // Mô phỏng trạng thái sau lần bấm đầu: đã thích → count = base + 1
    const likedPosts = DEMO_POSTS.map((p) => ({
      ...p,
      likeCount: p.likeCount + 1,
    }));
    const liked = new Set([post.id]);
    const [next] = toggleLike(likedPosts, liked, post.id);
    expect(next.likeCount).toBe(post.likeCount);
  });

  it('không đổi bài nào khác', () => {
    const [post] = DEMO_POSTS;
    const result = toggleLike(DEMO_POSTS, new Set<string>(), post.id);
    expect(result[1]).toEqual(DEMO_POSTS[1]);
  });
});

describe('createPost', () => {
  it('tạo bài với số đếm bằng 0 và nhãn thời gian "Vừa xong"', () => {
    const post = createPost({
      category: 'recruit',
      content: 'Tuyển 1 bạn chơi đôi tối mai',
      authorName: 'Nguyễn Văn A',
      id: 'p-new',
    });
    expect(post.id).toBe('p-new');
    expect(post.category).toBe('recruit');
    expect(post.likeCount).toBe(0);
    expect(post.commentCount).toBe(0);
    expect(post.shareCount).toBe(0);
    expect(post.createdAtLabel).toBe('Vừa xong');
  });

  it('cắt khoảng trắng thừa ở đầu/cuối nội dung', () => {
    const post = createPost({
      category: 'thought',
      content: '   chơi vui lắm   ',
      authorName: 'A',
      id: 'p-new',
    });
    expect(post.content).toBe('chơi vui lắm');
  });
});

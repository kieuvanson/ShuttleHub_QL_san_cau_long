import type {FeedPost, PostCategory} from '../../data/demoPosts';

/** Tab lọc của feed: `all` = tất cả, còn lại là 3 loại bài có tab riêng. */
export type FeedFilter = 'all' | PostCategory;

/**
 * Lọc bài theo tab.
 *
 * `court` không có tab riêng nên chỉ hiện ở "Tất cả" — cùng cơ chế với các
 * loại khác, chỉ khác là không có giá trị tab tương ứng.
 */
export function filterPosts(posts: FeedPost[], filter: FeedFilter): FeedPost[] {
  if (filter === 'all') return posts;
  return posts.filter((post) => post.category === filter);
}

/** Bật/tắt id trong tập bài đã thích — trả về Set mới, không mutate tập cũ. */
export function toggleLikedId(
  likedIds: ReadonlySet<string>,
  postId: string,
): Set<string> {
  const next = new Set(likedIds);
  if (next.has(postId)) {
    next.delete(postId);
  } else {
    next.add(postId);
  }
  return next;
}

/**
 * Cập nhật số like của một bài theo trạng thái đã thích.
 *
 * Tách khỏi component để test được logic mà không cần DOM.
 */
export function toggleLike(
  posts: FeedPost[],
  likedIds: ReadonlySet<string>,
  postId: string,
): FeedPost[] {
  const delta = likedIds.has(postId) ? -1 : 1;
  return posts.map((post) =>
    post.id === postId
      ? {...post, likeCount: Math.max(0, post.likeCount + delta)}
      : post,
  );
}

/** Tạo bài mới từ nội dung người dùng nhập trong modal đăng bài. */
export function createPost(input: {
  category: PostCategory;
  content: string;
  authorName: string;
  id: string;
}): FeedPost {
  return {
    id: input.id,
    authorName: input.authorName,
    createdAtLabel: 'Vừa xong',
    category: input.category,
    content: input.content.trim(),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
  };
}

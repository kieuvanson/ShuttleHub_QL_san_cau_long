import {useCallback, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {useToast} from '@astryxdesign/core/Toast';
import {Pencil} from 'lucide-react';
import type {User} from '../../api/types';
import type {FeedPost, PostCategory} from '../../data/demoPosts';
import {DEMO_MY_POSTS} from '../../data/demoProfile';
import {FeedComposerModal} from '../feed/FeedComposerModal';
import {FeedPostCard} from '../feed/FeedPostCard';
import {FeedTabs} from '../feed/FeedTabs';
import type {FeedFilter} from '../feed/feedUtils';
import {filterPosts, toggleLike, toggleLikedId} from '../feed/feedUtils';
import './ProfilePosts.css';

export type ProfilePostsProps = {
  user: User;
  posts?: FeedPost[];
};

/**
 * Tab "Bài viết" — các bài của chính user.
 *
 * ⚠️ Vì sao tái dùng `FeedPostCard` nguyên xi?
 *   Bài ở trang cá nhân phải trông y hệt bài ở feed trang chủ, nên dùng
 *   chung component thay vì viết lại một phiên bản riêng.
 *
 * ⚠️ Vì sao override `authorName`?
 *   Dữ liệu demo lưu tên tạm; khi render ta thay bằng tên user thật để bài
 *   luôn hiện đúng người đang xem trang cá nhân.
 */
export function ProfilePosts({user, posts = DEMO_MY_POSTS}: ProfilePostsProps) {
  const [items, setItems] = useState<FeedPost[]>(posts);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerCategory, setComposerCategory] =
    useState<PostCategory>('challenge');

  const showToast = useToast();
  const displayName = user.fullName || user.username || 'Khách';

  const handleToggleLike = useCallback(
    (postId: string) => {
      const nextLikedIds = toggleLikedId(likedIds, postId);
      setLikedIds(nextLikedIds);
      setItems((current) => toggleLike(current, likedIds, postId));
    },
    [likedIds],
  );

  /**
   * Chia sẻ bài ở trang cá nhân → copy link tới tab "Bài viết" của chính
   * trang này (link `/?post=<id>` sẽ mở feed trang chủ, nơi không có bài của
   * user nên vô nghĩa).
   */
  const handleShare = useCallback(
    (postId: string) => {
      const link = `${window.location.origin}/tai-khoan?tab=posts`;
      try {
        if (!navigator.clipboard) {
          throw new Error('Trình duyệt không hỗ trợ sao chép');
        }
        void navigator.clipboard.writeText(link);
        showToast({body: 'Đã sao chép liên kết bài viết'});
      } catch {
        showToast({body: 'Không sao chép được liên kết', type: 'error'});
      }
    },
    [showToast],
  );

  const handleUnavailableFeature = useCallback(
    (featureName: string) => {
      showToast({body: `Tính năng "${featureName}" sẽ có ở giai đoạn sau`});
    },
    [showToast],
  );

  const handleSubmit = useCallback(
    (post: FeedPost) => {
      setItems((current) => [post, ...current]);
      showToast({body: 'Đã đăng bài'});
    },
    [showToast],
  );

  const visiblePosts = filterPosts(items, filter).map((post) => ({
    ...post,
    authorName: displayName,
  }));

  return (
    <div className="profile-posts">
      <div className="profile-posts__head">
        <FeedTabs value={filter} onChange={setFilter} />
        <Button
          label="Đăng bài mới"
          variant="primary"
          icon={<Pencil size={15} aria-hidden="true" />}
          onClick={() => {
            setComposerCategory('challenge');
            setIsComposerOpen(true);
          }}
          className="profile-posts__add"
        />
      </div>

      <div className="profile-posts__list">
        {visiblePosts.map((post) => (
          <article key={post.id} id={`post-${post.id}`}>
            <FeedPostCard
              post={post}
              isLiked={likedIds.has(post.id)}
              onToggleLike={handleToggleLike}
              onShare={handleShare}
              onUnavailableFeature={handleUnavailableFeature}
              authorAvatarSrc={user.avatarUrl}
            />
          </article>
        ))}
      </div>

      <FeedComposerModal
        isOpen={isComposerOpen}
        initialCategory={composerCategory}
        authorName={displayName}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

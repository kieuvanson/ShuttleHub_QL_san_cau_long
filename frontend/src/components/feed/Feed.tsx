import {useCallback, useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useToast} from '@astryxdesign/core/Toast';
import type {FeedPost, PostCategory} from '../../data/demoPosts';
import {DEMO_POSTS} from '../../data/demoPosts';
import {useAuth} from '../../context/AuthContext';
import {FeedComposer} from './FeedComposer';
import {FeedComposerModal} from './FeedComposerModal';
import {FeedPostCard} from './FeedPostCard';
import {FeedSidebar} from './FeedSidebar';
import {FeedStories} from './FeedStories';
import {FeedTabs} from './FeedTabs';
import type {FeedFilter} from './feedUtils';
import {filterPosts, toggleLike, toggleLikedId} from './feedUtils';
import './feed.css';

/**
 * Container tổng hợp của feed cộng đồng ở trang chủ.
 *
 * Giai đoạn 1 dùng dữ liệu demo và toàn bộ tương tác nằm trong state của
 * component — chưa gọi backend. Khi có API, chỉ cần thay `DEMO_POSTS` bằng
 * dữ liệu fetch và các handler thành mutation.
 */
export function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>(DEMO_POSTS);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [composerCategory, setComposerCategory] = useState<PostCategory>('challenge');

  const showToast = useToast();
  const {isAuthenticated, user} = useAuth();
  const [searchParams] = useSearchParams();

  const visiblePosts = filterPosts(posts, filter);

  const handleToggleLike = useCallback(
    (postId: string) => {
      // `toggleLike` cần trạng thái liked **trước** khi bật/tắt, nên tính
      // trạng thái mới trước rồi dùng nó cho cả hai setState.
      const nextLikedIds = toggleLikedId(likedIds, postId);
      setLikedIds(nextLikedIds);
      setPosts((current) => toggleLike(current, likedIds, postId));
    },
    [likedIds],
  );

  const handleShare = useCallback(
    (postId: string) => {
      const link = `${window.location.origin}/?post=${postId}`;
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

  const handleOpenComposer = useCallback(
    (category: PostCategory) => {
      // Khách chưa đăng nhập không được đăng bài — báo bằng toast kèm link
      // đăng nhập thay vì mở modal rồi mới chặn.
      //
      // Link dùng `<a>` thuần chứ không phải `AppLink`: toast của Astryx
      // render ở viewport riêng (ngoài cây React của app) nên không có
      // `RouterContext` → `useLocation()` sẽ ném lỗi.
      if (!isAuthenticated) {
        showToast({
          body: 'Hãy đăng nhập để đăng bài',
          endContent: (
            <a href="/dang-nhap" className="feed-toast__link">
              Đăng nhập
            </a>
          ),
        });
        return;
      }
      setComposerCategory(category);
      setIsModalOpen(true);
    },
    [isAuthenticated, showToast],
  );

  const handleSubmit = useCallback(
    (post: FeedPost) => {
      setPosts((current) => [post, ...current]);
      showToast({body: 'Đã đăng bài'});
    },
    [showToast],
  );

  /**
   * Deep-link `/?post=<id>` — cuộn tới bài tương ứng khi mở link chia sẻ.
   * Id không tồn tại thì bỏ qua, không báo lỗi.
   */
  const targetPostId = searchParams.get('post');
  useEffect(() => {
    if (!targetPostId) return;
    const element = document.getElementById(`post-${targetPostId}`);
    if (!element) return;
    element.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, [targetPostId, posts]);

  return (
    <>
      <div className="feed-shell">
        <div className="feed-col">
          <FeedStories onUnavailableFeature={handleUnavailableFeature} />
          <FeedComposer
            onOpenComposer={handleOpenComposer}
            onUnavailableFeature={handleUnavailableFeature}
          />
          <FeedTabs value={filter} onChange={setFilter} />
          {visiblePosts.map((post) => (
            <article key={post.id} id={`post-${post.id}`}>
              <FeedPostCard
                post={post}
                isLiked={likedIds.has(post.id)}
                onToggleLike={handleToggleLike}
                onShare={handleShare}
                onUnavailableFeature={handleUnavailableFeature}
              />
            </article>
          ))}
        </div>
        <div className="feed-side">
          <FeedSidebar onUnavailableFeature={handleUnavailableFeature} />
        </div>
      </div>

      <FeedComposerModal
        isOpen={isModalOpen}
        initialCategory={composerCategory}
        authorName={user?.fullName || user?.username || 'Khách'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

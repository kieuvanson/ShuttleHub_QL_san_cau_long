import {Card} from '@astryxdesign/core/Card';
import {Avatar} from '@astryxdesign/core/Avatar';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {Ellipsis, Feather, Heart, MapPin, MessageCircle, Share2, UserPlus, Zap} from 'lucide-react';
import type {FeedPost, PostCategory} from '../../data/demoPosts';
import {POST_CATEGORY_LABEL} from '../../data/demoPosts';
import './FeedPostCard.css';

/** Icon đại diện cho từng loại bài — chọn icon gần nghĩa vì Lucide không có icon cầu lông. */
const CATEGORY_ICON: Record<PostCategory, typeof Zap> = {
  challenge: Zap,
  recruit: UserPlus,
  thought: Feather,
  court: MapPin,
};

export type FeedPostCardProps = {
  post: FeedPost;
  isLiked: boolean;
  onToggleLike: (postId: string) => void;
  onShare: (postId: string) => void;
  onUnavailableFeature: (featureName: string) => void;
};

/**
 * Một bài viết trong feed: header (tác giả + menu), nhãn loại, nội dung,
 * ảnh (tuỳ chọn), thanh thống kê và 3 nút tương tác.
 *
 * Nút Thích dùng `<button>` HTML thuần thay vì `IconButton` của Astryx vì
 * `IconButton` không nhận `aria-pressed` — cần trạng thái này để truy cập
 * được bằng screen reader.
 */
export function FeedPostCard({
  post,
  isLiked,
  onToggleLike,
  onShare,
  onUnavailableFeature,
}: FeedPostCardProps) {
  const CategoryIcon = CATEGORY_ICON[post.category];

  return (
    <Card variant="default" padding={0} className="feed-post">
      <div className="feed-post__head">
        <Avatar name={post.authorName} size="md" />
        <VStack gap={0} className="feed-post__who">
          <Text type="body" weight="semibold" maxLines={1}>
            {post.authorName}
          </Text>
          <Text type="supporting" color="secondary" maxLines={1}>
            {post.createdAtLabel} · Cầu Lông dee
          </Text>
        </VStack>
        <IconButton
          icon={<Ellipsis size={18} aria-hidden="true" />}
          label="Tuỳ chọn bài viết"
          variant="ghost"
          onClick={() => onUnavailableFeature('Tuỳ chọn bài viết')}
        />
      </div>

      <div className="feed-post__body">
        <span className={`feed-tag feed-tag--${post.category}`}>
          <CategoryIcon size={13} aria-hidden="true" />
          {POST_CATEGORY_LABEL[post.category]}
        </span>
        <p className="feed-post__content">{post.content}</p>
        {post.image ? (
          <div className="feed-post__media">
            <img src={post.image} alt={post.imageAlt ?? ''} loading="lazy" />
          </div>
        ) : null}
      </div>

      <div className="feed-post__stats">
        <Text type="supporting" color="secondary">
          {post.likeCount} người thích · {post.commentCount} bình luận
        </Text>
        <Text type="supporting" color="secondary">
          {post.shareCount} lượt chia sẻ
        </Text>
      </div>

      <div className="feed-post__actions">
        <button
          type="button"
          className="feed-post__action"
          aria-label="Thích"
          aria-pressed={isLiked}
          onClick={() => onToggleLike(post.id)}
        >
          <Heart size={18} aria-hidden="true" />
          <span>Thích</span>
        </button>
        <button
          type="button"
          className="feed-post__action"
          aria-label="Bình luận"
          onClick={() => onUnavailableFeature('Bình luận')}
        >
          <MessageCircle size={18} aria-hidden="true" />
          <span>Bình luận</span>
        </button>
        <button
          type="button"
          className="feed-post__action"
          aria-label="Chia sẻ"
          onClick={() => onShare(post.id)}
        >
          <Share2 size={18} aria-hidden="true" />
          <span>Chia sẻ</span>
        </button>
      </div>
    </Card>
  );
}

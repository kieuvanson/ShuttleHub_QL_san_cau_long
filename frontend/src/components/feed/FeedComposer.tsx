import {Card} from '@astryxdesign/core/Card';
import {Image, UserPlus, Zap} from 'lucide-react';
import type {User} from '../../api/types';
import type {PostCategory} from '../../data/demoPosts';
import {UserAvatar} from '../UserAvatar';
import './FeedComposer.css';

export type FeedComposerProps = {
  user: User | null;
  onOpenComposer: (category: PostCategory) => void;
  onUnavailableFeature: (featureName: string) => void;
};

/** Ô mở modal đăng bài — câu chữ mời người dùng viết bài. */
const PROMPT = 'Bạn muốn xét kèo hay tuyển người đánh cùng?';

/**
 * Ô viết bài ở đầu feed: một dòng mời viết + 3 nút hành động nhanh.
 *
 * Nút hành động dùng `<button>` HTML thuần (không phải `IconButton` của
 * Astryx) vì cần nhãn chữ hiển thị kèm icon, mà `IconButton` chỉ nhận
 * icon + `aria-label`.
 */
export function FeedComposer({user, onOpenComposer, onUnavailableFeature}: FeedComposerProps) {
  return (
    <Card variant="default" padding={0} className="feed-composer">
      <div className="feed-composer__top">
        <UserAvatar user={user} size="md" />
        <button
          type="button"
          className="feed-composer__input"
          onClick={() => onOpenComposer('challenge')}
        >
          {PROMPT}
        </button>
      </div>
      <div className="feed-composer__actions">
        <button
          type="button"
          className="feed-composer__action"
          onClick={() => onUnavailableFeature('Ảnh / Video')}
        >
          <Image size={18} aria-hidden="true" />
          <span>Ảnh / Video</span>
        </button>
        <button
          type="button"
          className="feed-composer__action"
          onClick={() => onOpenComposer('challenge')}
        >
          <Zap size={18} aria-hidden="true" />
          <span>Xét kèo</span>
        </button>
        <button
          type="button"
          className="feed-composer__action"
          onClick={() => onOpenComposer('recruit')}
        >
          <UserPlus size={18} aria-hidden="true" />
          <span>Tuyển người đánh</span>
        </button>
      </div>
    </Card>
  );
}

import {Card} from '@astryxdesign/core/Card';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Text} from '@astryxdesign/core/Text';
import {Calendar, Search, Star, Trophy} from 'lucide-react';
import {DEMO_PLAYERS, DEMO_SUGGESTED} from '../../data/demoPosts';
import {AppLink} from '../AppLink';
import './FeedSidebar.css';

/** 3 lối vào nhanh tới chức năng đặt sân — ở giai đoạn 1 chỉ dẫn về `/tim-san`. */
const QUICK_LINKS = [
  {label: 'Hôm nay', icon: Calendar},
  {label: 'Đánh đôi tối nay', icon: Trophy},
  {label: 'Sân được yêu thích', icon: Star},
];

const FOOTER_LINKS = [
  'Về Cầu Lông dee',
  'Trợ giúp',
  'Bảo mật',
  'Điều khoản',
  'Chính sách',
  'Cookies',
];

export type FeedSidebarProps = {
  onUnavailableFeature: (featureName: string) => void;
};

/**
 * Cột phụ của feed: tìm sân nhanh · đang tuyển người đánh · gợi ý kết bạn ·
 * link chân trang.
 *
 * Sidebar đóng vai trò "điều hướng" thay cho rail trái của Facebook — nhờ vậy
 * bố cục 2 cột vẫn giữ được chức năng đặt sân mà không cần 3 cột.
 */
export function FeedSidebar({onUnavailableFeature}: FeedSidebarProps) {
  return (
    <>
      <Card variant="default" padding={0} className="feed-side__card">
        <div className="feed-side__head">
          <h3 className="feed-side__title">Tìm sân nhanh</h3>
        </div>
        <AppLink href="/tim-san" className="feed-side__search" aria-label="Tìm sân nhanh">
          <Search size={16} aria-hidden="true" />
          <span>Tìm sân trống ngay</span>
        </AppLink>
        <ul className="feed-side__list">
          {QUICK_LINKS.map(({label, icon: Icon}) => (
            <li key={label}>
              <AppLink href="/tim-san" className="feed-side__row">
                <span className="feed-side__icon">
                  <Icon size={16} aria-hidden="true" />
                </span>
                {label}
              </AppLink>
            </li>
          ))}
        </ul>
      </Card>

      <Card variant="default" padding={0} className="feed-side__card">
        <div className="feed-side__head">
          <h3 className="feed-side__title">Đang tuyển người đánh</h3>
        </div>
        <ul className="feed-side__list">
          {DEMO_PLAYERS.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                className="feed-side__row feed-side__row--button"
                onClick={() => onUnavailableFeature('Xem hồ sơ người chơi')}
              >
                <Avatar name={player.name} size="sm" />
                <span className="feed-side__who">
                  <span className="feed-side__name">{player.name}</span>
                  <span className="feed-side__meta">
                    {player.gender} · {player.time} · {player.area}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card variant="default" padding={0} className="feed-side__card">
        <div className="feed-side__head">
          <h3 className="feed-side__title">Bạn có thể quen</h3>
        </div>
        <ul className="feed-side__list">
          {DEMO_SUGGESTED.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                className="feed-side__row feed-side__row--button"
                onClick={() => onUnavailableFeature('Kết bạn')}
              >
                <Avatar name={person.name} size="sm" />
                <span className="feed-side__who">
                  <span className="feed-side__name">{person.name}</span>
                  <span className="feed-side__meta">{person.mutualCount} bạn chung</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card variant="default" padding={0} className="feed-side__card feed-side__card--foot">
        <ul className="feed-side__foot">
          {FOOTER_LINKS.map((label) => (
            <li key={label}>
              <button
                type="button"
                className="feed-side__foot-link"
                onClick={() => onUnavailableFeature(label)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        <Text type="supporting" className="feed-side__copy">
          Cầu Lông dee © 2026 · Đặt sân &amp; kết nối người chơi
        </Text>
      </Card>
    </>
  );
}

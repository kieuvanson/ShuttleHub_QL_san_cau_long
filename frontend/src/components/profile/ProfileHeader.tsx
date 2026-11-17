import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Camera, Pencil} from 'lucide-react';
import type {User} from '../../api/types';
import {DEMO_SKILL_LEVEL, PROFILE_ROLE_LABEL} from '../../data/demoProfile';
import {UserAvatar} from '../UserAvatar';
import './ProfileHeader.css';

export type ProfileHeaderProps = {
  user: User;
  /** Ảnh đại diện preview tạm (objectURL) — ghi đè `user.avatarUrl`. */
  avatarPreviewUrl?: string | null;
  /** Ảnh bìa preview tạm (objectURL) — ghi đè ảnh mặc định. */
  coverPreviewUrl?: string | null;
  stats: {posts: number; bookings: number; moments: number};
  onEditProfile: () => void;
  onPickAvatar: () => void;
  onPickCover: () => void;
};

/**
 * Đầu trang cá nhân — ảnh bìa + avatar đè góc + thông tin cơ bản.
 *
 * ⚠️ Vì sao ảnh bìa KHÔNG dùng `AspectRatio` của Astryx?
 *   `AspectRatio` đặt child vào `position:absolute` → nút "Đổi ảnh bìa" phải
 *   nằm ngoài nó, và tỉ lệ 4.5:1 cố định sẽ làm ảnh bìa chỉ cao ~83px ở
 *   mobile. Dùng `div` cao cố định (240px / 160px) + `object-fit: cover` đơn
 *   giản và kiểm soát được.
 */
export function ProfileHeader({
  user,
  avatarPreviewUrl,
  coverPreviewUrl,
  stats,
  onEditProfile,
  onPickAvatar,
  onPickCover,
}: ProfileHeaderProps) {
  const displayName = user.fullName || user.username;
  const roleLabel = PROFILE_ROLE_LABEL[user.role] ?? 'Khách';

  return (
    <section className="profile-header">
      <div className="profile-header__cover">
        <img
          src={coverPreviewUrl ?? '/img/court-01.jpg'}
          alt="Ảnh bìa trang cá nhân"
        />
        <div className="profile-header__cover-actions">
          <Button
            label="Đổi ảnh bìa"
            variant="secondary"
            size="sm"
            icon={<Camera size={14} aria-hidden="true" />}
            onClick={onPickCover}
          />
        </div>
      </div>

      <div className="profile-header__body">
        <div className="profile-header__avatar-wrap">
          <div className="profile-header__avatar">
            <UserAvatar
              user={user}
              size="xl"
              srcOverride={avatarPreviewUrl}
              fill
            />
          </div>
          {/* Nút camera là <button> thuần vì `IconButton` của Astryx cần prop
              `label` riêng → accessible name sẽ không khớp với nhãn tiếng Việt
              mà test (và screen reader) mong đợi.
              Nút nằm NGOÀI `.profile-header__avatar` vì div đó có
              `overflow: hidden` để bo tròn ảnh → nút sẽ bị cắt. */}
          <button
            type="button"
            className="profile-header__avatar-btn"
            aria-label="Đổi ảnh đại diện"
            onClick={onPickAvatar}
          >
            <Camera size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="profile-header__info">
          <Heading level={1} className="profile-header__name">
            {displayName}
          </Heading>
          <Text type="supporting" className="profile-header__username">
            @{user.username}
          </Text>

          <div className="profile-header__badges">
            <Badge variant="teal" label={roleLabel} />
            <Badge variant="orange" label={DEMO_SKILL_LEVEL} />
          </div>

          <Text type="supporting" className="profile-header__stats">
            <span>{stats.posts} bài đã đăng</span>
            <span aria-hidden="true"> · </span>
            <span>{stats.bookings} kèo</span>
            <span aria-hidden="true"> · </span>
            <span>{stats.moments} khoảnh khắc</span>
          </Text>
        </div>

        <Button
          label="Chỉnh sửa hồ sơ"
          variant="primary"
          icon={<Pencil size={15} aria-hidden="true" />}
          onClick={onEditProfile}
          className="profile-header__edit"
        />
      </div>
    </section>
  );
}

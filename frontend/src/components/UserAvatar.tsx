import { Avatar } from '@astryxdesign/core/Avatar';
import { shortDisplayName } from '../utils/displayName';

export type UserAvatarProps = {
  user: {
    fullName?: string | null;
    avatarUrl?: string | null;
    username?: string | null;
  } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/**
 * Avatar của user — dùng chung cho header và ô viết bài.
 *
 * ⚠️ Vì sao bọc `Avatar` của Astryx?
 *   `Avatar` đã tự hiện chữ cái đầu khi `src` lỗi hoặc thiếu → ta chỉ
 *   cần truyền `src` (nếu có) + `name` (tên rút gọn) là xong, không phải
 *   tự xử lý `onError`.
 *
 * ⚠️ Vì sao `name` dùng tên RÚT GỌN?
 *   Chữ cái đầu fallback phải khớp với tên hiển thị ("Son" → "S",
 *   không phải "Kieu Van Son" → "K").
 */
export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const displayName =
    shortDisplayName(user?.fullName) ?? user?.username ?? 'Khách';

  return (
    <Avatar
      src={user?.avatarUrl ?? undefined}
      name={displayName}
      size={size}
      className={className}
    />
  );
}

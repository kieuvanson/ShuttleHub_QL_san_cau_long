import { Avatar } from '@astryxdesign/core/Avatar';
import { shortDisplayName } from '../utils/displayName';

export type UserAvatarProps = {
  user: {
    fullName?: string | null;
    avatarUrl?: string | null;
    username?: string | null;
  } | null;
  /**
   * Kích thước avatar.
   *
   * ⚠️ Vì sao có `'xl'`?
   *   Trang cá nhân cần avatar lớn 128px đè lên ảnh bìa kiểu Facebook. `Avatar`
   *   của Astryx đã có sẵn size `'xl'` = 128px → không cần tự chế kích thước.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Ảnh preview tạm (objectURL) — ghi đè `avatarUrl` khi có.
   *
   * ⚠️ Vì sao cần?
   *   Giai đoạn demo chưa có backend upload ảnh, nhưng người dùng vẫn muốn
   *   thấy ảnh mình vừa chọn. `srcOverride` cho phép đổi ảnh tức thời mà
   *   không gửi đi đâu.
   */
  srcOverride?: string | null;
  /**
   * Avatar chiếm 100% khung cha thay vì kích thước cố định.
   *
   * ⚠️ Vì sao cần?
   *   `Avatar` của Astryx đặt kích thước bằng inline `--x-width/--x-height`
   *   → không thể đổi bằng media query trong CSS của ta (inline style thắng).
   *   Trang cá nhân cần avatar đổi 128px → 96px ở mobile → phải cho avatar
   *   co theo khung cha, còn khung cha do CSS quyết định.
   */
  fill?: boolean;
  className?: string;
};

/**
 * Avatar của user — dùng chung cho header, ô viết bài và trang cá nhân.
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
export function UserAvatar({
  user,
  size = 'md',
  srcOverride,
  fill = false,
  className,
}: UserAvatarProps) {
  const displayName =
    shortDisplayName(user?.fullName) ?? user?.username ?? 'Khách';

  return (
    <Avatar
      src={srcOverride ?? user?.avatarUrl ?? undefined}
      name={displayName}
      size={size}
      className={className}
      /**
       * ⚠️ `style` của consumer được `mergeProps` đặt SAU style của StyleX
       *   → ghi đè được kích thước cố định của `Avatar`.
       */
      style={fill ? {width: '100%', height: '100%'} : undefined}
    />
  );
}

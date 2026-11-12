import { useCallback, useEffect } from 'react';
import { Link, useLocation, type LinkProps } from 'react-router-dom';

/**
 * Link tương thích Astryx — dùng làm `component` cho `<LinkProvider>`.
 *
 * Astryx truyền xuống component này hai prop: `href` (đích) và `to`
 * (`to ?? href`). Ta dùng `to` cho React Router và bỏ `href` để không sinh
 * thuộc tính trùng trên thẻ `<a>`.
 *
 * Ngoài ra, khi điều hướng SPA tới một anchor (`/#bang-gia`), trình duyệt
 * KHÔNG tự cuộn tới element có `id` — hash scroll chỉ xảy ra khi tải trang
 * mới. Vì vậy ta cuộn thủ công sau khi pathname/hash đổi.
 */
export function AppLink({
  to,
  href,
  onClick,
  children,
  ...rest
}: {
  to?: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
} & Omit<LinkProps, 'to'>) {
  const location = useLocation();
  const target = to ?? href ?? '/';

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onClick?.(e);
    },
    [onClick],
  );

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;
    // Chờ một nhịp để section vừa render xong mới cuộn tới.
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 60);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return (
    <Link to={target} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}

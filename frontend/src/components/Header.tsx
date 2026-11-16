import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { shortDisplayName } from '../utils/displayName';
import { AppLink } from './AppLink';
import { UserAvatar } from './UserAvatar';
import './Header.css';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <AppLink to="/" className="hdr__brand" aria-label="Cầu Lông dee">
          <img
            src="/logo_page.svg"
            alt=""
            className="hdr__logo"
          />
          <span className="hdr__wordmark">Cầu Lông dee</span>
        </AppLink>

        <nav className="hdr__nav" aria-label="Chính">
          <AppLink to="/tim-san" className="hdr__navlink">Tìm sân cầu lông</AppLink>
          {/* Các section bảng giá / FAQ nay nằm ở trang tìm sân (landing đã
              rời trang chủ) → anchor trỏ theo đường dẫn đó. `AppLink` tự
              cuộn tới element có `id` sau khi route đổi. */}
          <AppLink to="/tim-san#bang-gia" className="hdr__navlink">Bảng giá</AppLink>
          <AppLink to="/tim-san#faq" className="hdr__navlink hdr__navlink--secondary">Hỗ trợ</AppLink>
        </nav>

        <div className="hdr__actions">
          {isAuthenticated && user ? (
            /* Đã đăng nhập: hiện tên user + menu đăng xuất */
            <div className="hdr__user">
              <button
                type="button"
                className="hdr__user-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <UserAvatar user={user} size="sm" />
                <span>{shortDisplayName(user.fullName) ?? user.username}</span>
              </button>

              {menuOpen && (
                <>
                  {/* Click ra ngoài để đóng menu */}
                  <div
                    className="hdr__user-backdrop"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="hdr__user-menu" role="menu">
                    <div className="hdr__user-info">
                      <UserAvatar user={user} size="sm" />
                      <span className="hdr__user-info-text">
                        <strong>{user.fullName || user.username}</strong>
                        <span>{user.email}</span>
                      </span>
                    </div>
                    <AppLink
                      to="/tai-khoan"
                      className="hdr__user-item"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserIcon size={15} aria-hidden="true" />
                      <span>Trang cá nhân</span>
                    </AppLink>
                    <button
                      type="button"
                      className="hdr__user-item"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} aria-hidden="true" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Chưa đăng nhập */
            <>
              <AppLink to="/dang-nhap" className="hdr__login">Đăng nhập</AppLink>
              <AppLink to="/dang-ky" className="hdr__signup">Đăng ký</AppLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

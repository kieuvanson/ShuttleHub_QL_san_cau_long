import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
        <Link to="/" className="hdr__brand" aria-label="Cầu Lông dee">
          <img
            src="/logo_page.svg"
            alt=""
            className="hdr__logo"
          />
          <span className="hdr__wordmark">Cầu Lông dee</span>
        </Link>

        <nav className="hdr__nav" aria-label="Chính">
          <Link to="/tim-san" className="hdr__navlink">Tìm sân cầu lông</Link>
          {/* Điều hướng về trang chủ rồi cuộn tới anchor — section đích
              được dựng ở các task sau (PricingSection / FaqSection). */}
          <Link to="/#bang-gia" className="hdr__navlink">Bảng giá</Link>
          <Link to="/#faq" className="hdr__navlink hdr__navlink--secondary">Hỗ trợ</Link>
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
                <UserIcon size={16} aria-hidden="true" />
                <span>{user.fullName || user.username}</span>
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
                      <strong>{user.fullName || user.username}</strong>
                      <span>{user.email}</span>
                    </div>
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
              <Link to="/dang-nhap" className="hdr__login">Đăng nhập</Link>
              <Link to="/dang-ky" className="hdr__signup">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

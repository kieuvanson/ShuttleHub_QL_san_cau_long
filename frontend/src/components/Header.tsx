import { Link } from 'react-router-dom';
import './Header.css';

export function Header() {
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
          <a href="#" className="hdr__navlink">Bảng giá</a>
          <a href="#" className="hdr__navlink">Hỗ trợ</a>
        </nav>

        <div className="hdr__actions">
          <Link to="/dang-nhap" className="hdr__login">Đăng nhập</Link>
          <Link to="/dang-ky" className="hdr__signup">Đăng ký</Link>
        </div>
      </div>
    </header>
  );
}

import './Header.css';

export function Header() {
  return (
    <header className="hdr">
      <div className="hdr__inner">
        <a href="/" className="hdr__brand" aria-label="Cầu Lông Dee">
          <img
            src="/logo_page.svg"
            alt=""
            className="hdr__logo"
          />
          <span className="hdr__wordmark">Cầu Lông Dee</span>
        </a>

        <nav className="hdr__nav" aria-label="Chính">
          <a href="/tim-san" className="hdr__navlink">Tìm sân</a>
          <a href="#" className="hdr__navlink">Bảng giá</a>
          <a href="#" className="hdr__navlink">Hỗ trợ</a>
        </nav>

        <div className="hdr__actions">
          <a href="#" className="hdr__login">Đăng nhập</a>
          <a href="#" className="hdr__signup">Đăng ký</a>
        </div>
      </div>
    </header>
  );
}

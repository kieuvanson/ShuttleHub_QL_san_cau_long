import './Footer.css';

export function Footer() {
  return (
    <footer className="foot" aria-label="Chân trang">
      <div className="foot__inner">
        <div className="foot__col">
          <p className="foot__brand">Cầu Lông dee</p>
          <p className="foot__desc">Cầu Lông dee — Đặt sân trong 30 giây.</p>
        </div>

        <div className="foot__col">
          <p className="foot__heading">Sản phẩm</p>
          <ul className="foot__list">
            <li><a href="/tim-san" className="foot__link">Tìm sân cầu lông</a></li>
            <li><a href="#" className="foot__link">Hướng dẫn đặt sân</a></li>
            <li><a href="#" className="foot__link">Cổng thanh toán</a></li>
          </ul>
        </div>

        <div className="foot__col">
          <p className="foot__heading">Hỗ trợ</p>
          <ul className="foot__list">
            <li><a href="#" className="foot__link">Liên hệ</a></li>
            <li><a href="#" className="foot__link">Điều khoản</a></li>
            <li><a href="#" className="foot__link">Chính sách</a></li>
          </ul>
        </div>
      </div>

      <div className="foot__base">
        <p>© Cầu Lông dee — Dữ liệu hiển thị là dữ liệu demo.</p>
      </div>
    </footer>
  );
}

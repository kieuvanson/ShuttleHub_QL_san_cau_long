import { Link } from 'react-router-dom';
import './Footer.css';

/**
 * Link trong footer. Đường dẫn nội bộ dùng `to` của React Router để không
 * reload trang; `mailto:` dùng `href` thuần.
 */
type FooterLink = {
  label: string;
  to?: string;
  href?: string;
};

const PRODUCT_LINKS: FooterLink[] = [
  {label: 'Tìm sân cầu lông', to: '/tim-san'},
  {label: 'Hướng dẫn đặt sân', to: '/#faq'},
  {label: 'Cổng thanh toán', to: '/#faq'},
];

const SUPPORT_LINKS: FooterLink[] = [
  {label: 'Liên hệ', href: 'mailto:hotro@caulongdee.example'},
  {label: 'Điều khoản', to: '/#dieu-khoan'},
  {label: 'Chính sách', to: '/#chinh-sach'},
];

/** Nguồn ảnh minh hoạ lấy từ assets/img/credits.json. */
const IMAGE_CREDITS =
  'Ảnh minh hoạ từ Wikimedia Commons: Ian Patterson (CC BY 2.0), Herbert Nott (Public domain), ' +
  'Santiago,https2993 (CC0), SwarmCheng (CC BY-SA 4.0), Chris Eason (CC BY 2.0), ' +
  'Adhitya2048 (CC BY-SA 4.0), Joelflorentinpereira (CC BY-SA 4.0), Peter (CC BY-SA 2.0), ' +
  'JoselínDoom (CC BY-SA 4.0).';

function FooterLinkItem({link}: {link: FooterLink}) {
  const className = 'foot__link';
  if (link.to) {
    return (
      <li>
        <Link to={link.to} className={className}>
          {link.label}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <a href={link.href} className={className}>
        {link.label}
      </a>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="foot" aria-label="Chân trang">
      <div className="foot__inner">
        <div className="foot__col">
          <p className="foot__brand">Cầu Lông dee</p>
          <p className="foot__desc">
            Nền tảng đặt sân cầu lông — tìm sân trống, xem giá và khung giờ, thanh toán online.
          </p>
        </div>

        <div className="foot__col">
          <p className="foot__heading">Sản phẩm</p>
          <ul className="foot__list">
            {PRODUCT_LINKS.map((l) => (
              <FooterLinkItem key={l.label} link={l} />
            ))}
          </ul>
        </div>

        <div className="foot__col">
          <p className="foot__heading">Hỗ trợ</p>
          <ul className="foot__list">
            {SUPPORT_LINKS.map((l) => (
              <FooterLinkItem key={l.label} link={l} />
            ))}
          </ul>
        </div>
      </div>

      <div className="foot__base">
        <p className="foot__copy">© Cầu Lông dee — Dữ liệu hiển thị là dữ liệu demo.</p>
        <details className="foot__credits">
          <summary>Ảnh minh hoạ từ Wikimedia Commons</summary>
          <p className="foot__credits-list">{IMAGE_CREDITS}</p>
        </details>
      </div>
    </footer>
  );
}

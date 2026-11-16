import { Feed } from '../components/feed/Feed';
import './Home.css';

/**
 * Trang chủ nay CHỈ là bảng tin cộng đồng.
 *
 * Toàn bộ landing marketing (Hero, sân nổi bật, bảng giá, thành phố, FAQ)
 * đã chuyển sang trang tìm sân `/tim-san` — nơi người dùng đã có ý định đặt
 * sân, nên landing ở đó không làm loãng trải nghiệm.
 */
export function Home() {
  return (
    <div className="home-feed">
      {/* `h1` ẩn thị giác: trang chủ không còn section nào hiện tiêu đề
          lớn, nhưng vẫn cần một tiêu đề chính cho trình đọc màn hình/SEO. */}
      <h1 className="home__sr-only">Bảng tin cộng đồng cầu lông</h1>
      <Feed />
    </div>
  );
}

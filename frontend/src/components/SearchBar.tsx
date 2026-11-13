import { AREAS } from '../data/demoCourts';
import './SearchBar.css';

/**
 * Form tìm sân — nằm gọn trong Hero.
 *
 * Trả về đúng một `<form>` (không có `<section>` bọc ngoài) để nhúng được
 * vào `VStack` của Hero mà không tạo khoảng trắng thừa.
 *
 * Form submit theo cách **native** (GET tới `/tim-san`): không `onSubmit` +
 * `preventDefault`, không `fetch`. Lý do:
 *   - Không cần state cho `city`/`date`/`time` → markup gọn, không re-render.
 *   - Người dùng nhấn Enter hay bấm nút đều cho ra URL có query string
 *     (`/tim-san?khu-vuc=hanoi&ngay=2026-11-13&gio=18%3A00`) → copy link
 *     chia sẻ được, và nút "back" của trình duyệt hoạt động đúng.
 *   - Không có request nào bị chặn, nên công cụ kiểm tra form (check `forms`
 *     của skill taste-skill) thấy form thực sự gửi đi.
 */
export function SearchBar() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form className="search__form" action="/tim-san" method="get" role="search">
      <div className="search__field">
        <label className="search__label" htmlFor="search-city">
          Khu vực
        </label>
        <select
          id="search-city"
          className="search__input"
          name="khu-vuc"
          defaultValue="all"
        >
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="search__field">
        <label className="search__label" htmlFor="search-date">
          Ngày
        </label>
        <input
          id="search-date"
          className="search__input"
          type="date"
          name="ngay"
          defaultValue={today}
        />
      </div>

      <div className="search__field">
        <label className="search__label" htmlFor="search-time">
          Giờ
        </label>
        <input
          id="search-time"
          className="search__input"
          type="time"
          name="gio"
          defaultValue="18:00"
        />
      </div>

      <button className="search__submit" type="submit">
        Tìm sân
      </button>
    </form>
  );
}

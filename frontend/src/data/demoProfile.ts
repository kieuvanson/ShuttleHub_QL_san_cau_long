/**
 * Dữ liệu DEMO cho trang cá nhân (`/tai-khoan`).
 *
 * ⚠️ ĐÂY LÀ DỮ LIỆU GIẢ (giai đoạn 1) — chưa có backend cho bài viết, kèo
 * đặt hay khoảnh khắc. Chỉ dùng để dựng giao diện và kiểm tra tương tác
 * client-side.
 *
 * ⚠️ Vì sao có file riêng chứ không dùng `demoPosts.ts`?
 *   `demoPosts.ts` là bài của **người khác** ("Quốc Bảo", "Minh Trí"…) dùng
 *   cho feed trang chủ. Trang cá nhân cần bài của **chính người đang xem**,
 *   nên tách riêng để không đụng vào feed (spec A4).
 *
 * Ảnh tái dùng từ bộ ảnh sân/thành phố có sẵn trong `public/img/`.
 */

import type {FeedPost} from './demoPosts';

export type ProfileBookingType = 'booking' | 'challenge' | 'recruit';

export type ProfileBookingStatus = 'upcoming' | 'done';

export type ProfileBooking = {
  id: string;
  type: ProfileBookingType;
  /** Tên sân / tên kèo. */
  title: string;
  /** Khung giờ + ngày, vd "19:00 – 20:00 · Thứ 7, 22/11". */
  timeLabel: string;
  area: string;
  priceLabel: string;
  status: ProfileBookingStatus;
  /** Ghi chú ngắn, vd "Chờ đối thủ" / "Đã đủ 2/3 người". */
  note?: string;
};

export type ProfileMoment = {
  id: string;
  image: string;
  caption: string;
  timeLabel: string;
  place: string;
};

/**
 * Trình độ cầu lông — hiện là dữ liệu demo.
 * Giai đoạn sau sẽ lấy từ hồ sơ thật của user.
 */
export const DEMO_SKILL_LEVEL = 'Trình độ B';

/** Nhãn hiển thị cho vai trò của user. */
export const PROFILE_ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Khách',
  ADMIN: 'Chủ sân',
  EMPLOYEE: 'Nhân viên',
};

/**
 * 6 bài viết của chính user — đủ cả 4 loại bài.
 *
 * `authorName` đặt tên tạm; `AccountPage` sẽ override bằng tên user thật khi
 * render (spec R1) → bài luôn hiện đúng tên người đang xem trang cá nhân.
 */
export const DEMO_MY_POSTS: FeedPost[] = [
  {
    id: 'mp-001',
    authorName: 'Kieu Văn Sơn',
    createdAtLabel: '2 giờ',
    category: 'recruit',
    content:
      'Tuyển 2 bạn chơi đôi tối nay 19h tại sân Cầu Lông Quận 1. Nam, trình độ trung bình trở lên, có vợt. Đặt sân mình, đá bóng xong mình mời ly bia nhé!',
    likeCount: 24,
    commentCount: 7,
    shareCount: 3,
  },
  {
    id: 'mp-002',
    authorName: 'Kieu Văn Sơn',
    createdAtLabel: '5 giờ',
    category: 'challenge',
    content:
      'Buổi sáng nay vợt bay như cắt. Chắc do dùng vợt mới quá xịn. Ai rảnh thì đánh đối khăn một ván nhé!',
    image: '/img/court-02.jpg',
    imageAlt: 'Sân cầu lông trong nhà với sàn gỗ',
    likeCount: 138,
    commentCount: 21,
    shareCount: 5,
  },
  {
    id: 'mp-003',
    authorName: 'Kieu Văn Sơn',
    createdAtLabel: 'Hôm qua',
    category: 'thought',
    content:
      'Chơi cầu lông 5 năm rồi mới hiểu: quan trọng không phải thắng mà là có người chơi cùng. Cảm ơn Cầu Lông dee vì đã cho mình tìm được đồng đội mỗi tối cuối tuần.',
    likeCount: 96,
    commentCount: 12,
    shareCount: 2,
  },
  {
    id: 'mp-004',
    authorName: 'Kieu Văn Sơn',
    createdAtLabel: 'Hôm qua',
    category: 'court',
    content:
      'Sân mới ở Thủ Đức, sàn gỗ đẹp, máy lạnh mát, giá 80k/giờ. Ai ở gần thì ghé chơi nhé.',
    image: '/img/court-03.jpg',
    imageAlt: 'Sân cầu lông mới với sàn gỗ',
    likeCount: 42,
    commentCount: 9,
    shareCount: 1,
  },
  {
    id: 'mp-005',
    authorName: 'Kieu Văn Sơn',
    createdAtLabel: '2 ngày',
    category: 'challenge',
    content:
      'Hôm nay thua sát mặt. Kỹ thuật thì không có gì để nói, chỉ là lúc thắng thì quên mất mình cầm vợt tay phải hay tay trái.',
    image: '/img/court-01.jpg',
    imageAlt: 'Sân cầu lông có sân ngoài trời',
    likeCount: 71,
    commentCount: 15,
    shareCount: 4,
  },
  {
    id: 'mp-006',
    authorName: 'Kieu Văn Sơn',
    createdAtLabel: '3 ngày',
    category: 'recruit',
    content:
      'Cần thêm 1 bạn nữ cho đội đôi tối Chủ nhật. Đánh ở mức vui vẻ, không thi đấu, không tính điểm.',
    likeCount: 33,
    commentCount: 6,
    shareCount: 2,
  },
];

/**
 * 6 kèo của user — đủ 3 loại, kèo sắp tới đứng trước kèo đã hoàn thành.
 */
export const DEMO_MY_BOOKINGS: ProfileBooking[] = [
  {
    id: 'mb-001',
    type: 'booking',
    title: 'Sân Cầu Lông Quận 1',
    timeLabel: '19:00 – 20:00 · Thứ 7, 22/11',
    area: 'Quận 1',
    priceLabel: '80.000đ/giờ',
    status: 'upcoming',
  },
  {
    id: 'mb-002',
    type: 'challenge',
    title: 'Kèo đôi 21h tối thứ 7',
    timeLabel: '21:00 – 22:00 · Thứ 7, 22/11',
    area: 'Bình Thạnh',
    priceLabel: '70.000đ/giờ',
    status: 'upcoming',
    note: 'Chờ đối thủ',
  },
  {
    id: 'mb-003',
    type: 'recruit',
    title: 'Cần thêm 1 bạn nữ đánh đôi',
    timeLabel: '20:00 – 21:30 · Chủ nhật, 23/11',
    area: 'Thủ Đức',
    priceLabel: '90.000đ/giờ',
    status: 'upcoming',
    note: 'Đã đủ 2/3 người',
  },
  {
    id: 'mb-004',
    type: 'booking',
    title: 'Sân Cầu Lông Quận 3',
    timeLabel: '07:00 – 08:00 · Thứ 3, 19/11',
    area: 'Quận 3',
    priceLabel: '60.000đ/giờ',
    status: 'done',
  },
  {
    id: 'mb-005',
    type: 'challenge',
    title: 'Kèo đôi 20h tối thứ 5',
    timeLabel: '20:00 – 21:00 · Thứ 5, 21/11',
    area: 'Quận 7',
    priceLabel: '75.000đ/giờ',
    status: 'done',
  },
  {
    id: 'mb-006',
    type: 'recruit',
    title: 'Tuyển 3 bạn đánh sân gỗ',
    timeLabel: '18:00 – 20:00 · Thứ 2, 25/11',
    area: 'Gò Vấp',
    priceLabel: '85.000đ/giờ',
    status: 'done',
  },
];

/** 5 khoảnh khắc đánh cầu lông của user. */
export const DEMO_MY_MOMENTS: ProfileMoment[] = [
  {
    id: 'mm-001',
    image: '/img/court-01.jpg',
    caption: 'Buổi sáng chạy 5 sân liền, mồ hôi ướt đẫm áo',
    timeLabel: 'Sáng nay',
    place: 'Sân Cầu Lông Quận 1',
  },
  {
    id: 'mm-002',
    image: '/img/court-02.jpg',
    caption: 'Sân trong nhà mới, sàn gỗ mượt phê thật',
    timeLabel: 'Hôm qua',
    place: 'Sân Cầu Lông Quận 3',
  },
  {
    id: 'mm-003',
    image: '/img/court-03.jpg',
    caption: 'Đánh đôi với bạn Thu Hà, thắng 21-19',
    timeLabel: '2 ngày trước',
    place: 'Sân Thủ Đức',
  },
  {
    id: 'mm-004',
    image: '/img/court-04.jpg',
    caption: 'Khoảnh khắc lên xong là nghỉ ngơi luôn',
    timeLabel: '3 ngày trước',
    place: 'Sân Bình Thạnh',
  },
  {
    id: 'mm-005',
    image: '/img/city-hcm.jpg',
    caption: 'Sân ngoài trời lúc hoàng hôn, gió mát mát',
    timeLabel: 'Cuối tuần trước',
    place: 'Sân Gò Vấp',
  },
];

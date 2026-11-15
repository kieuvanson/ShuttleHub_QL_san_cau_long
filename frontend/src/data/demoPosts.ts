/**
 * Dữ liệu DEMO cho feed cộng đồng ở trang chủ.
 *
 * ⚠️ ĐÂY LÀ DỮ LIỆU GIẢ (giai đoạn 1) — chưa có backend cho feed.
 * Chỉ dùng để dựng giao diện và kiểm tra tương tác client-side.
 * Ảnh tái dùng từ bộ ảnh sân/thành phố có sẵn trong `public/img/`.
 */

export type PostCategory = 'challenge' | 'recruit' | 'thought' | 'court';

export type FeedPost = {
  id: string;
  authorName: string;
  createdAtLabel: string;
  category: PostCategory;
  content: string;
  image?: string;
  imageAlt?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
};

export type FeedStory = {
  id: string;
  name: string;
  image: string;
  /** Story đầu tiên là ô "Thêm khoảnh khắc" — không phải người thật. */
  isAdd?: boolean;
};

export type FeedPlayer = {
  id: string;
  name: string;
  gender: 'Nam' | 'Nữ';
  time: string;
  area: string;
};

export type FeedSuggestion = {
  id: string;
  name: string;
  mutualCount: number;
};

/** Nhãn hiển thị cho 4 loại bài — tiếng Việt để người dùng nhận ra ngay. */
export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  challenge: 'XÉT KÈO',
  recruit: 'TUYỂN NGƯỜI ĐÁNH',
  thought: 'CẢM NGHĨ',
  court: 'SÂN CẦU LÔNG',
};

/** 8 bài demo, sắp xếp mới nhất trước, trộn đều 4 loại. */
export const DEMO_POSTS: FeedPost[] = [
  {
    id: 'p-001',
    authorName: 'Quốc Bảo',
    createdAtLabel: '2 giờ',
    category: 'recruit',
    content:
      'Tuyển 2 bạn chơi đôi tối nay 19h tại sân Cầu Lông Quận 1. Nam, trình độ trung bình trở lên, có vợt. Đặt sân mình, đá bóng xong mình mời ly bia nhé!',
    likeCount: 24,
    commentCount: 7,
    shareCount: 3,
  },
  {
    id: 'p-002',
    authorName: 'Minh Trí',
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
    id: 'p-003',
    authorName: 'Thu Hà',
    createdAtLabel: 'Hôm qua',
    category: 'thought',
    content:
      'Chơi cầu lông 5 năm rồi mới hiểu: quan trọng không phải thắng mà là có người chơi cùng. Cảm ơn Cầu Lông dee vì đã cho mình tìm được đồng đội mỗi tối cuối tuần.',
    likeCount: 96,
    commentCount: 12,
    shareCount: 2,
  },
  {
    id: 'p-004',
    authorName: 'Hải Đăng',
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
    id: 'p-005',
    authorName: 'Lê Nga',
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
    id: 'p-006',
    authorName: 'Tuấn Anh',
    createdAtLabel: '3 ngày',
    category: 'recruit',
    content:
      'Cần thêm 1 bạn nữ cho đội đôi tối Chủ nhật. Đánh ở mức vui vẻ, không thi đấu, không tính điểm.',
    likeCount: 33,
    commentCount: 6,
    shareCount: 2,
  },
  {
    id: 'p-007',
    authorName: 'Hà Phúc',
    createdAtLabel: '4 ngày',
    category: 'thought',
    content:
      'Ai cũng nói mua vợt đắt tiền. Nhưng dùng vợt rẻ mà chơi đúng chỗ thì vẫn thắng được người dùng vợt đắt mà chơi sai chỗ.',
    image: '/img/court-04.jpg',
    imageAlt: 'Khung cầu lông và vợt trên sân',
    likeCount: 58,
    commentCount: 11,
    shareCount: 0,
  },
  {
    id: 'p-008',
    authorName: 'Minh Sơn',
    createdAtLabel: '5 ngày',
    category: 'court',
    content:
      'Sân gỗ mới ở Bình Thạnh, sạch sẽ, có chỗ gửi xe và căn tin ngay dưới sân. Đặt sân qua Cầu Lông dee rẻ hơn 10k so với gọi trực tiếp.',
    image: '/img/city-hcm.jpg',
    imageAlt: 'Sân cầu lông cùng khu vực Thành phố Hồ Chí Minh',
    likeCount: 27,
    commentCount: 4,
    shareCount: 1,
  },
];

/** Dải khoảnh khắc — phần tử đầu là ô "Thêm khoảnh khắc". */
export const DEMO_STORIES: FeedStory[] = [
  {id: 's-000', name: 'Thêm khoảnh khắc', image: '/img/court-01.jpg', isAdd: true},
  {id: 's-001', name: 'Minh Trí', image: '/img/court-02.jpg'},
  {id: 's-002', name: 'Hải Đăng', image: '/img/court-03.jpg'},
  {id: 's-003', name: 'Thu Hà', image: '/img/court-04.jpg'},
  {id: 's-004', name: 'Quốc Bảo', image: '/img/city-hcm.jpg'},
];

/** 4 người đang rủ đánh — widget "Đang tuyển người đánh" ở sidebar. */
export const DEMO_PLAYERS: FeedPlayer[] = [
  {id: 'pl-001', name: 'Quốc Bảo', gender: 'Nam', time: '19:00', area: 'Quận 1'},
  {id: 'pl-002', name: 'Lê Nga', gender: 'Nữ', time: '19:30', area: 'Quận 7'},
  {id: 'pl-003', name: 'Tuấn Anh', gender: 'Nam', time: '20:00', area: 'Thủ Đức'},
  {id: 'pl-004', name: 'Hà Phúc', gender: 'Nam', time: '21:00', area: 'Quận 3'},
];

/** 3 gợi ý kết bạn — widget "Bạn có thể quen" ở sidebar. */
export const DEMO_SUGGESTED: FeedSuggestion[] = [
  {id: 'sg-001', name: 'Minh Sơn', mutualCount: 12},
  {id: 'sg-002', name: 'Bảo Trí', mutualCount: 8},
  {id: 'sg-003', name: 'Anh Nguyễn', mutualCount: 5},
];

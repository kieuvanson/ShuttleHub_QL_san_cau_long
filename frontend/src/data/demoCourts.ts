/**
 * Demo data for Cầu Lông dee.
 * Gắn nhãn "DEMO" rõ ràng — không được dùng thay cho dữ liệu thật.
 * Mọi giá trị sẽ thay bằng API thật khi backend sẵn sàng.
 */

export type Court = {
  id: string;
  name: string;
  district: string;
  city: string;
  priceFrom: number; // VND per hour
  rating: number; // 0–5
  reviewCount?: number; // số lượt đánh giá
  nextAvailable: string; // e.g. "18:00"
  nextAvailableDate: string; // ISO
  courtsCount: number; // số sân trong cụm
  amenities: string[];
  imageGradient: [string, string]; // fallback khi chưa có ảnh thật
  isNew?: boolean;
  isHot?: boolean;
  distanceKm?: number; // khoảng cách từ trung tâm
};

export const AREAS = [
  { id: 'all', label: 'Tất cả khu vực', count: 1248 },
  { id: 'hanoi', label: 'Hà Nội', count: 412 },
  { id: 'hcm', label: 'TP. Hồ Chí Minh', count: 538 },
  { id: 'danang', label: 'Đà Nẵng', count: 156 },
  { id: 'haiphong', label: 'Hải Phòng', count: 89 },
  { id: 'cantho', label: 'Cần Thơ', count: 53 },
] as const;

export const DEMO_COURTS: Court[] = [
  {
    id: 'c-001',
    name: 'Cầu Lông dee Cầu Giấy',
    district: 'Cầu Giấy',
    city: 'hanoi',
    priceFrom: 80000,
    rating: 4.7,
    nextAvailable: '18:00',
    nextAvailableDate: '2026-10-11',
    courtsCount: 6,
    amenities: ['Máy lạnh', 'Đỗ xe', 'Cho thuê vợt'],
    imageGradient: ['#1a2a3a', '#0d1825'],
  },
  {
    id: 'c-002',
    name: 'Cầu Lông dee Hai Bà Trưng',
    district: 'Hai Bà Trưng',
    city: 'hanoi',
    priceFrom: 90000,
    rating: 4.5,
    nextAvailable: '19:30',
    nextAvailableDate: '2026-10-11',
    courtsCount: 4,
    amenities: ['Máy lạnh', 'Nước uống'],
    imageGradient: ['#2a1a2e', '#180d1f'],
  },
  {
    id: 'c-003',
    name: 'Cầu Lông dee Quận 1',
    district: 'Quận 1',
    city: 'hcm',
    priceFrom: 120000,
    rating: 4.8,
    nextAvailable: '17:30',
    nextAvailableDate: '2026-10-11',
    courtsCount: 8,
    amenities: ['Máy lạnh', 'Đỗ xe', 'Phòng thay đồ', 'Căng-tin'],
    imageGradient: ['#1a2e22', '#0d1f15'],
  },
  {
    id: 'c-004',
    name: 'Cầu Lông dee Bình Thạnh',
    district: 'Bình Thạnh',
    city: 'hcm',
    priceFrom: 70000,
    rating: 4.3,
    nextAvailable: '20:00',
    nextAvailableDate: '2026-10-11',
    courtsCount: 3,
    amenities: ['Đỗ xe'],
    imageGradient: ['#2e2a1a', '#1f180d'],
  },
  {
    id: 'c-005',
    name: 'Cầu Lông dee Sơn Trà',
    district: 'Sơn Trà',
    city: 'danang',
    priceFrom: 60000,
    rating: 4.4,
    nextAvailable: '06:30',
    nextAvailableDate: '2026-10-12',
    courtsCount: 5,
    amenities: ['Máy lạnh', 'View biển'],
    imageGradient: ['#1a2630', '#0d1820'],
    isHot: true,
  },
  {
    id: 'c-006',
    name: 'Cầu Lông dee Thanh Khê',
    district: 'Thanh Khê',
    city: 'danang',
    priceFrom: 55000,
    rating: 4.2,
    nextAvailable: '19:00',
    nextAvailableDate: '2026-10-11',
    courtsCount: 4,
    amenities: ['Đỗ xe', 'Nước uống'],
    imageGradient: ['#2a1f2e', '#1a0d1f'],
    isNew: true,
  },
  {
    id: 'c-007',
    name: 'Cầu Lông dee Hải Châu',
    district: 'Hải Châu',
    city: 'danang',
    priceFrom: 75000,
    rating: 4.6,
    nextAvailable: '20:30',
    nextAvailableDate: '2026-10-11',
    courtsCount: 6,
    amenities: ['Máy lạnh', 'Đỗ xe', 'Cho thuê vợt', 'Căng-tin'],
    imageGradient: ['#1e2a30', '#0d1820'],
  },
  {
    id: 'c-008',
    name: 'Cầu Lông dee Ngũ Hành Sơn',
    district: 'Ngũ Hành Sơn',
    city: 'danang',
    priceFrom: 90000,
    rating: 4.9,
    nextAvailable: '21:00',
    nextAvailableDate: '2026-10-11',
    courtsCount: 7,
    amenities: ['Máy lạnh', 'Đỗ xe', 'Phòng thay đồ', 'Cho thuê vợt', 'Căng-tin'],
    imageGradient: ['#2a1a2e', '#1a0d1f'],
    isHot: true,
  },
];

export const formatPrice = (n: number): string => {
  // Vietnamese: dot thousand separator
  return n.toLocaleString('vi-VN') + 'đ';
};

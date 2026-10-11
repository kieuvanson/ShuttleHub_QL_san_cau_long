/**
 * Demo data for ShuttleHub.
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
  nextAvailable: string; // e.g. "18:00"
  nextAvailableDate: string; // ISO
  courtsCount: number; // số sân trong cụm
  amenities: string[];
  imageGradient: [string, string]; // fallback khi chưa có ảnh thật
};

export const AREAS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'hanoi', label: 'Hà Nội' },
  { id: 'hcm', label: 'TP.HCM' },
  { id: 'danang', label: 'Đà Nẵng' },
  { id: 'haiphong', label: 'Hải Phòng' },
  { id: 'cantho', label: 'Cần Thơ' },
] as const;

export const DEMO_COURTS: Court[] = [
  {
    id: 'c-001',
    name: 'ShuttleHub Cầu Giấy',
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
    name: 'ShuttleHub Hai Bà Trưng',
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
    name: 'ShuttleHub Quận 1',
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
    name: 'ShuttleHub Bình Thạnh',
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
    name: 'ShuttleHub Sơn Trà',
    district: 'Sơn Trà',
    city: 'danang',
    priceFrom: 60000,
    rating: 4.4,
    nextAvailable: '06:30',
    nextAvailableDate: '2026-10-12',
    courtsCount: 5,
    amenities: ['Máy lạnh', 'View biển'],
    imageGradient: ['#1a2630', '#0d1820'],
  },
];

export const formatPrice = (n: number): string => {
  // Vietnamese: dot thousand separator
  return n.toLocaleString('vi-VN') + 'đ';
};

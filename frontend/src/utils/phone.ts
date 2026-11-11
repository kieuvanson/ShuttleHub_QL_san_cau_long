/**
 * Chuẩn hoá & kiểm tra số điện thoại — BẢN SAO logic của backend.
 *
 * ⚠️ Vì sao phải giống hệt backend?
 * Backend chuẩn hoá SĐT về E.164 (84912345678) TRƯỚC khi validate
 * (xem `PhoneNumbers.normalize` bên Java). Nếu frontend dùng regex khác,
 * sẽ xảy ra 2 lỗi:
 *   1. Frontend chặn nhầm dạng SĐT mà backend vẫn chấp nhận
 *      → user thấy "SĐT không hợp lệ" dù SĐT hoàn toàn đúng.
 *   2. Frontend cho qua dạng SĐT backend từ chối
 *      → user điền hết form rồi mới bị báo lỗi 400 → UX tệ.
 *
 * → Nguồn sự thật DUY NHẤT là backend. File này chỉ để bắt lỗi SỖM sớm;
 *   backend vẫn luôn validate lại và trả message tiếng Việt.
 */

/** Bỏ mọi ký tự không phải số: xử lý "+", khoảng trắng, gạch nối, dấu chấm. */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Chuẩn hoá số điện thoại về E.164 (84912345678).
 *
 * @returns dạng E.164, hoặc `null` nếu không thể chuẩn hoá.
 */
export function normalizePhone(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length === 0) return null;

  // 11 chữ số bắt đầu "84" → đã là E.164
  if (digits.length === 11 && digits.startsWith('84')) return digits;

  // 12 chữ số bắt đầu "840" → số 10 số kiểu cũ
  if (digits.length === 12 && digits.startsWith('840')) return `84${digits.slice(3)}`;

  // 10 chữ số bắt đầu "0" → bỏ số 0 đầu, thêm mã quốc gia
  if (digits.length === 10 && digits.startsWith('0')) return `84${digits.slice(1)}`;

  // 11 chữ số bắt đầu "0" → số 10 số kiểu cũ, lấy 9 chữ số kế tiếp
  if (digits.length === 11 && digits.startsWith('0')) return `84${digits.slice(1, 10)}`;

  // 9 chữ số bắt đầu "9" → thêm mã quốc gia
  if (digits.length === 9 && digits.startsWith('9')) return `84${digits}`;

  return null;
}

/** Số điện thoại có hợp lệ (theo đúng logic backend) không? */
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null;
}

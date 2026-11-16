/**
 * Rút gọn họ tên lấy từ cuối — "Kieu Van Son" → "Son".
 *
 * ⚠️ Vì sao rút gọn ở tầng hiển thị chứ không lưu vào DB?
 *   DB giữ tên đầy đủ (trang cá nhân hiện "Kieu Van Son"), nhưng header và
 *   ô viết bài chỉ cần tên gọi để layout gọn. Rút gọn khi hiển thị giữ
 *   được dữ liệu gốc.
 *
 * @returns tên cuối, hoặc `null` nếu không có tên hợp lệ.
 */
export function shortDisplayName(
  fullName: string | null | undefined,
): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}

/**
 * Cấu hình API cho frontend.
 *
 * - VITE_API_URL: cho phép chạy dev với backend ở máy khác.
 *   Mặc định: http://localhost:8080
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export const API_URL = API_BASE;

/** Key lưu token trong localStorage */
export const STORAGE_KEYS = {
  accessToken: 'cld.accessToken',
  refreshToken: 'cld.refreshToken',
  user: 'cld.user',
} as const;

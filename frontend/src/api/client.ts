import { API_URL, STORAGE_KEYS } from './config';
import { ApiError, type ApiResponse } from './types';

/**
 * HTTP client cho backend.
 *
 * Tính năng:
 *  • Tự gắn header "Authorization: Bearer <accessToken>" cho request cần auth.
 *  • Tự refresh token khi access token hết hạn (401) — chỉ 1 lần refresh,
 *    các request chờ sẽ được retry sau khi refresh xong.
 *  • Chuẩn hoá lỗi thành ApiError để UI hiển thị message tiếng Việt.
 */

// Đồng bộ refresh: nếu có nhiều request cùng lúc bị 401,
// chỉ 1 request gọi /refresh, các request khác chờ.
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

/**
 * Gọi /api/auth/refresh để lấy access token mới.
 * Trả về access token mới, hoặc null nếu refresh thất bại.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          // Refresh token hết hạn / bị thu hồi → đăng xuất hoàn toàn
          clearTokens();
          return null;
        }

        const body = (await res.json()) as ApiResponse<{
          accessToken: string;
          refreshToken: string;
        }>;

        localStorage.setItem(STORAGE_KEYS.accessToken, body.data.accessToken);
        localStorage.setItem(STORAGE_KEYS.refreshToken, body.data.refreshToken);
        return body.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Bỏ qua việc tự refresh token khi gặp 401 */
  skipAuthRetry?: boolean;
  /** Endpoint nào không cần gắn token (login, register, send-otp) */
  anonymous?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, anonymous, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((headers as Record<string, string>) ?? {}),
  };

  if (!anonymous) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 401 → thử refresh 1 lần rồi retry
  if (res.status === 401 && !skipAuthRetry && !anonymous) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, { ...options, skipAuthRetry: true });
    }
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new ApiError(401, 401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, res.status, 'Máy chủ trả về dữ liệu không hợp lệ.');
  }

  if (!res.ok) {
    throw new ApiError(res.status, parsed.code ?? res.status, parsed.message ?? 'Đã xảy ra lỗi.');
  }

  return parsed.data;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

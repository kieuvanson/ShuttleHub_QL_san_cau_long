/**
 * Kiểu dữ liệu API — khớp với DTO của backend.
 */

// Kiểu wrapper response chuẩn của backend
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  role: 'CUSTOMER' | 'ADMIN' | string;
  createdAt: string;
  /** URL ảnh đại diện (Facebook) — null nếu user không đăng nhập qua OAuth */
  avatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

/** Provider OAuth đang được bật (có client-id hợp lệ) */
export interface OAuthProviders {
  providers: string[];
}

/** Trạng thái ticket sau OAuth callback */
export interface OAuthTicketStatus {
  status: 'READY' | 'NEEDS_PHONE';
  provider: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Payload cập nhật hồ sơ (email / SĐT / OTP).
 *
 * ⚠️ Mọi trường đều tuỳ chọn — user chỉ gửi những gì muốn đổi.
 * Đổi SĐT thì BẮT BUỘC kèm `otp` hợp lệ.
 */
export interface ProfileUpdatePayload {
  email?: string;
  phone?: string;
  otp?: string;
}

/** Lỗi API đã chuẩn hoá để UI hiển thị */
export class ApiError extends Error {
  readonly status: number;
  readonly code: number;

  constructor(status: number, code: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** Lỗi do người dùng nhập sai (validation, sai mật khẩu, ...) */
  get isUserError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** Phiên đăng nhập hết hạn → cần đăng nhập lại */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

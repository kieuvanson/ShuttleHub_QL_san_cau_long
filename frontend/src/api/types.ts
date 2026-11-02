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
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
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

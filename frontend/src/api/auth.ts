import { api } from './client';
import type { AuthResponse, User } from './types';

/**
 * Các API liên quan tới xác thực.
 * Endpoint khớp 100% với AuthController của backend.
 */

export interface SendOtpResponse {
  code: number;
  message: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  otp: string;
  username: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SendOtpResult {
  /** Mã OTP — chỉ có giá trị khi backend chạy mock mode (dev) */
  otp?: string;
  /** true nếu backend đang ở mock mode */
  mock?: string;
}

export const authApi = {
  /** Gửi mã OTP về SĐT */
  sendOtp: (phone: string) =>
    api.post<SendOtpResult>('/api/auth/send-otp', { phone }, { anonymous: true }),

  /** Đăng ký tài khoản mới (đã xác minh OTP) */
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/api/auth/register', payload, { anonymous: true }),

  /** Đăng nhập bằng email + mật khẩu */
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/api/auth/login', payload, { anonymous: true }),

  /** Lấy thông tin user hiện tại */
  me: () => api.get<User>('/api/auth/me'),

  /** Đăng xuất — thu hồi toàn bộ refresh token */
  logout: () => api.post<null>('/api/auth/logout'),
};

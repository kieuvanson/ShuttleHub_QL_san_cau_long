import { api } from './client';
import type {
  AuthResponse,
  OAuthProviders,
  OAuthTicketStatus,
  ProfileUpdatePayload,
  User,
} from './types';

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

/**
 * Payload xác minh SĐT cho nhánh Facebook không trả email.
 *
 * ⚠️ Không có `email` — Facebook không chia sẻ email nên user không thể
 * tự khai (tránh chiếm email người khác). SĐT + OTP là bằng chứng sở hữu.
 */
export interface OAuthPhoneVerifyPayload {
  ticket: string;
  phone: string;
  otp: string;
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

  // ----- OAuth (Google / Facebook) -----

  /** Danh sách provider OAuth đang bật (có client-id hợp lệ) */
  oauthProviders: () =>
    api.get<OAuthProviders>('/api/auth/oauth/providers', { anonymous: true }),

  /** Hỏi ticket cần làm gì: READY (đổi token) hay NEEDS_PHONE (verify SĐT) */
  oauthTicket: (ticket: string) =>
    api.get<OAuthTicketStatus>(
      `/api/auth/oauth/ticket/${encodeURIComponent(ticket)}`,
      { anonymous: true },
    ),

  /** Đổi ticket lấy access + refresh token */
  oauthExchange: (ticket: string) =>
    api.post<AuthResponse>('/api/auth/oauth/exchange', { ticket }, { anonymous: true }),

  /** Xác minh SĐT bằng OTP (Facebook không chia sẻ email) */
  oauthPhoneVerify: (payload: OAuthPhoneVerifyPayload) =>
    api.post<{ userId: string }>(
      '/api/auth/oauth/phone/verify',
      payload,
      { anonymous: true },
    ),

  /** Cập nhật hồ sơ (email / SĐT) — cần JWT */
  updateProfile: (payload: ProfileUpdatePayload) =>
    api.put<User>('/api/auth/profile', payload),
};

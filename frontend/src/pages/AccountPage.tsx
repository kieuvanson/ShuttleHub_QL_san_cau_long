import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { OtpInput } from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/types';
import { isValidPhone } from '../utils/phone';
import './AccountPage.css';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Email tạm do backend sinh cho user Facebook chưa chia sẻ email. */
const TEMP_EMAIL_SUFFIX = '@facebook.local';

type Errors = Partial<{ email: string; phone: string; otp: string; form: string }>;

/**
 * AccountPage — trang cá nhân: xem thông tin + cập nhật email / SĐT.
 *
 * ⚠️ KHÔNG ép hoàn thiện hồ sơ — user có thể bỏ qua và dùng app bình thường.
 *   Chỉ hiện ô trống + nút cập nhật.
 */
export function AccountPage() {
  const { user, updateProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const resendTimer = useRef<number | null>(null);

  const isTempEmail = !!user?.email.endsWith(TEMP_EMAIL_SUFFIX);

  useEffect(() => {
    if (resendIn <= 0) {
      if (resendTimer.current) {
        window.clearInterval(resendTimer.current);
        resendTimer.current = null;
      }
      return;
    }
    resendTimer.current = window.setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (resendTimer.current) window.clearInterval(resendTimer.current);
    };
  }, [resendIn]);

  const handleSendOtp = async () => {
    if (!isValidPhone(phone)) {
      setErrors((e) => ({ ...e, phone: 'Số điện thoại chưa hợp lệ (VD: 0912345678).' }));
      return;
    }
    setOtpSending(true);
    setErrors({});
    try {
      const res = await authApi.sendOtp(phone);
      setOtpSent(true);
      setResendIn(RESEND_SECONDS);
      if (res.otp) setDevOtp(res.otp);
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        form: e instanceof ApiError ? e.message : 'Không gửi được mã xác nhận.',
      }));
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
    const phoneChanged = phone.trim() !== (user?.phoneNumber ?? '');

    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Email chưa đúng định dạng.';
    }
    if (phoneChanged && !isValidPhone(phone)) {
      next.phone = 'Số điện thoại chưa hợp lệ (VD: 0912345678).';
    }
    if (phoneChanged && otp.length !== OTP_LENGTH) {
      next.otp = 'Vui lòng nhập đủ mã xác nhận.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setSaved(false);
    try {
      const payload: { email?: string; phone?: string; otp?: string } = {};
      if (emailChanged) payload.email = email.trim().toLowerCase();
      if (phoneChanged) {
        payload.phone = phone;
        payload.otp = otp;
      }
      await updateProfile(payload);
      setEmail('');
      setPhone('');
      setOtp('');
      setOtpSent(false);
      setSaved(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form:
          err instanceof ApiError
            ? err.message
            : 'Không cập nhật được thông tin. Vui lòng thử lại.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="account">
        <Text type="supporting">Vui lòng đăng nhập để xem trang cá nhân.</Text>
      </section>
    );
  }

  return (
    <section className="account">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="account__card" padding={0}>
          <div className="account__body">
            <header className="account__head">
              <div className="account__icon" aria-hidden="true">
                <ShieldCheck size={24} />
              </div>
              <Heading level={1} className="account__title">
                Trang cá nhân
              </Heading>
              <Text type="supporting" className="account__sub">
                Cập nhật thông tin liên hệ để được hỗ trợ nhanh hơn khi đặt sân.
              </Text>
            </header>

            <div className="account__section">
              <div className="account__row">
                <span className="account__row-label">Họ tên</span>
                <span className="account__row-value">{user.fullName || 'Chưa cập nhật'}</span>
              </div>
              <div className="account__row">
                <span className="account__row-label">Email</span>
                <span className="account__row-value">
                  {user.email}
                  {isTempEmail && (
                    <span className="account__badge account__badge--warn">Chưa xác minh</span>
                  )}
                </span>
              </div>
              <div className="account__row">
                <span className="account__row-label">Số điện thoại</span>
                <span className="account__row-value">
                  {user.phoneNumber || 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <form className="account__form" onSubmit={handleSubmit} noValidate>
              <Heading level={2} className="account__form-title">
                Cập nhật thông tin
              </Heading>

              <div className="account__field">
                <label className="account__label" htmlFor="acc-email">Email</label>
                <input
                  id="acc-email"
                  type="email"
                  className={`account__input ${errors.email ? 'account__input--error' : ''}`}
                  placeholder="ban@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="account__err">{errors.email}</span>
                )}
              </div>

              <div className="account__field">
                <label className="account__label" htmlFor="acc-phone">Số điện thoại</label>
                <div className="account__phone-wrap">
                  <input
                    id="acc-phone"
                    type="tel"
                    className={`account__input ${errors.phone ? 'account__input--error' : ''}`}
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <button
                    type="button"
                    className="account__send-otp"
                    onClick={handleSendOtp}
                    disabled={otpSending || (otpSent && resendIn > 0)}
                  >
                    {otpSending
                      ? 'Đang gửi…'
                      : otpSent
                        ? (resendIn > 0 ? `Gửi lại (${resendIn}s)` : 'Gửi lại')
                        : 'Gửi mã'}
                  </button>
                </div>
                {errors.phone && (
                  <span className="account__err">{errors.phone}</span>
                )}
              </div>

              {otpSent && (
                <div className="account__field">
                  <label className="account__label">Mã xác nhận</label>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={OTP_LENGTH}
                    autoFocus
                    error={errors.otp}
                  />
                  {devOtp && (
                    <div className="account__dev">
                      <span className="account__dev-label">Mã OTP (dev):</span>
                      <button
                        type="button"
                        className="account__dev-code"
                        onClick={() => setOtp(devOtp)}
                      >
                        {devOtp}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errors.form && (
                <div className="account__alert" role="alert">{errors.form}</div>
              )}

              {saved && (
                <div className="account__alert account__alert--ok" role="status">
                  Đã cập nhật thông tin thành công.
                </div>
              )}

              <Button
                type="submit"
                label={submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
                variant="primary"
                width="100%"
                isDisabled={submitting || (!email.trim() && !phone.trim())}
                isLoading={submitting}
                icon={submitting ? <Loader2 size={16} className="account__spinner" /> : undefined}
                className="account__submit"
              />
            </form>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}

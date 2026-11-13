import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { OtpInput } from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/types';
import { isValidPhone } from '../utils/phone';
import './FacebookPhoneVerifyPage.css';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type Errors = Partial<{ phone: string; otp: string; form: string }>;

/**
 * FacebookPhoneVerifyPage — xác minh SĐT bằng OTP cho nhánh Facebook
 * KHÔNG chia sẻ email.
 *
 * ⚠️ Vì sao SĐT thay vì bắt nhập email?
 *   Nếu bắt user tự khai email → kẻ xấu khai email người khác để chiếm
 *   chỗ tài khoản đó trước khi chủ sở hữu thật đăng ký. SĐT + OTP SMS là
 *   bằng chứng sở hữu thật, và SĐT là UNIQUE trong DB → không ai chiếm
 *   chỗ được.
 *
 * Sau khi backend tạo user và gắn userId vào ticket, ticket trở thành READY
 * → ta đổi ticket lấy JWT.
 */
export function FacebookPhoneVerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTicket } = useAuth();

  const ticket = params.get('ticket') ?? '';

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const resendTimer = useRef<number | null>(null);

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

  // Không có ticket → không thể làm gì, đưa về trang đăng nhập
  useEffect(() => {
    if (!ticket) {
      navigate('/dang-nhap', { replace: true });
    }
  }, [ticket, navigate]);

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
    if (!isValidPhone(phone)) {
      next.phone = 'Số điện thoại chưa hợp lệ (VD: 0912345678).';
    }
    if (otp.length !== OTP_LENGTH) {
      next.otp = 'Vui lòng nhập đủ mã xác nhận.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.oauthPhoneVerify({ ticket, phone, otp });
      // Ticket đã READY → đổi lấy token
      await loginWithTicket(ticket);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form:
          err instanceof ApiError
            ? err.message
            : 'Không xác minh được số điện thoại. Vui lòng thử lại.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="fb-phone">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="fb-phone__card" padding={0}>
          <div className="fb-phone__body">
            <header className="fb-phone__head">
              <div className="fb-phone__logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path
                    fill="#1877F2"
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
              </div>
              <Heading level={1} className="fb-phone__title">
                Xác minh số điện thoại
              </Heading>
              <Text type="supporting" className="fb-phone__sub">
                Tài khoản Facebook của bạn chưa chia sẻ email. Hãy xác minh số điện thoại
                để chúng tôi tạo tài khoản cho bạn. Mã xác nhận sẽ được gửi qua tin nhắn SMS.
              </Text>
            </header>

            <form className="fb-phone__form" onSubmit={handleSubmit} noValidate>
              <div className="fb-phone__field">
                <label className="fb-phone__label" htmlFor="fb-phone">Số điện thoại</label>
                <div className="fb-phone__phone-wrap">
                  <input
                    id="fb-phone"
                    type="tel"
                    className={`fb-phone__input ${errors.phone ? 'fb-phone__input--error' : ''}`}
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <button
                    type="button"
                    className="fb-phone__send-otp"
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
                  <span className="fb-phone__err">{errors.phone}</span>
                )}
              </div>

              {otpSent && (
                <div className="fb-phone__field">
                  <label className="fb-phone__label">Mã xác nhận</label>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={OTP_LENGTH}
                    autoFocus
                    error={errors.otp}
                  />
                  {devOtp && (
                    <div className="fb-phone__dev">
                      <span className="fb-phone__dev-label">Mã OTP (dev):</span>
                      <button
                        type="button"
                        className="fb-phone__dev-code"
                        onClick={() => setOtp(devOtp)}
                      >
                        {devOtp}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errors.form && (
                <div className="fb-phone__alert" role="alert">{errors.form}</div>
              )}

              <Button
                type="submit"
                label={submitting ? 'Đang xử lý…' : 'Xác nhận & tiếp tục'}
                variant="primary"
                width="100%"
                isDisabled={submitting || !otpSent}
                isLoading={submitting}
                icon={submitting ? <Loader2 size={16} className="fb-phone__spinner" /> : undefined}
                className="fb-phone__submit"
              />
            </form>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}

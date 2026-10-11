import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { OtpInput } from '../components/OtpInput';
import './AuthLayout.css';

type Mode = 'login' | 'register';

type FieldErrors = Partial<{
  email: string;
  password: string;
  name: string;
  phone: string;
  confirm: string;
  otp: string;
}>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * AuthPage — 1 page cho cả Đăng nhập / Đăng ký, đổi mode bằng tab.
 * Khi chuyển tab: form cũ trượt ra, form mới trượt vào (mượt, không giật).
 * Trang đăng ký có thêm ô nhập OTP (mô phỏng — sau này sẽ gửi mã về SĐT).
 */
export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Mode lấy từ URL
  const mode: Mode = location.pathname === '/dang-ky' ? 'register' : 'login';

  // Shared state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);       // đã gửi mã chưa
  const [resendIn, setResendIn] = useState(0);         // đếm ngược gửi lại
  const resendTimer = useRef<number | null>(null);

  // Reset form khi đổi mode
  const resetForMode = (next: Mode) => {
    setErrors({});
    setSubmitting(false);
    if (next === 'login') {
      setConfirm('');
      setPhone('');
      setName('');
      setOtp('');
      setOtpSent(false);
      setResendIn(0);
    }
  };

  // Quản lý countdown gửi lại OTP
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

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    resetForMode(next);
    navigate(next === 'login' ? '/dang-nhap' : '/dang-ky');
  };

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (mode === 'register' && name.trim().length < 2) {
      e.name = 'Vui lòng nhập họ tên (ít nhất 2 ký tự).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Email chưa đúng định dạng.';
    }
    if (mode === 'register' && !/^(0|\+84)[0-9]{9,10}$/.test(phone.replace(/\s/g, ''))) {
      e.phone = 'Số điện thoại chưa hợp lệ (VD: 0912345678).';
    }
    if (password.length < 6) {
      e.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (mode === 'register' && password !== confirm) {
      e.confirm = 'Mật khẩu nhập lại không khớp.';
    }
    if (mode === 'register' && !agree) {
      e.confirm = e.confirm || 'Bạn cần đồng ý với điều khoản để tiếp tục.';
    }
    if (mode === 'register' && !otpSent) {
      e.otp = 'Bạn cần gửi mã OTP về số điện thoại trước.';
    }
    if (mode === 'register' && otpSent && otp.replace(/\s/g, '').length !== OTP_LENGTH) {
      e.otp = 'Vui lòng nhập đủ 6 chữ số mã xác nhận.';
    }
    return e;
  };

  const handleSendOtp = () => {
    // Validate SĐT trước khi cho gửi
    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone.replace(/\s/g, ''))) {
      setErrors((p) => ({ ...p, phone: 'Số điện thoại chưa hợp lệ — không thể gửi mã.' }));
      return;
    }
    // Mô phỏng gọi API gửi OTP
    console.log('[auth] send OTP to', phone);
    setOtpSent(true);
    setOtp('');
    setResendIn(RESEND_SECONDS);
    setErrors((p) => ({ ...p, otp: undefined, phone: undefined }));
  };

  const handleResendOtp = () => {
    if (resendIn > 0) return;
    console.log('[auth] resend OTP to', phone);
    setOtp('');
    setResendIn(RESEND_SECONDS);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const eMap = validate();
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) return;

    setSubmitting(true);
    setTimeout(() => {
      if (mode === 'login') {
        console.log('[auth] login', { email, remember });
      } else {
        console.log('[auth] register', { name, email, phone, otp });
      }
      setSubmitting(false);
    }, 600);
  };

  const isLogin = mode === 'login';

  // Variants cho animation trượt ngang
  const formVariants = {
    initial: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
    }),
  };

  // Hướng trượt: login → register = +1, register → login = -1
  const direction = isLogin ? 1 : -1;

  return (
    <section className="auth" aria-label={isLogin ? 'Đăng nhập' : 'Đăng ký'}>
      <div className="auth__panel">
        <div className="auth__card">
          {/* Tab switcher */}
          <div className="auth__tabs" role="tablist" aria-label="Chuyển chế độ">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`auth__tab ${isLogin ? 'auth__tab--active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`auth__tab ${!isLogin ? 'auth__tab--active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Đăng ký
            </button>
          </div>

          {/* AnimatePresence cho phép form cũ thoát ra trước khi form mới vào */}
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={mode}
              custom={direction}
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <header className="auth__head">
                <h2 className="auth__title">
                  {isLogin ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
                </h2>
                <p className="auth__sub">
                  {isLogin
                    ? 'Nhập email và mật khẩu để tiếp tục.'
                    : 'Điền thông tin bên dưới — miễn phí, chỉ mất 30 giây.'}
                </p>
              </header>

              <form className="auth__form" onSubmit={handleSubmit} noValidate>
                {/* Họ tên — chỉ register */}
                {!isLogin && (
                  <div className="auth__field">
                    <label className="auth__label" htmlFor="auth-name">Họ và tên</label>
                    <input
                      id="auth-name"
                      type="text"
                      className={`auth__input ${errors.name ? 'auth__input--error' : ''}`}
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                    {errors.name && <span className="auth__err">{errors.name}</span>}
                  </div>
                )}

                {/* Email */}
                <div className="auth__field">
                  <label className="auth__label" htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    className={`auth__input ${errors.email ? 'auth__input--error' : ''}`}
                    placeholder="ban@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  {errors.email && <span className="auth__err">{errors.email}</span>}
                </div>

                {/* SĐT + nút gửi OTP — chỉ register */}
                {!isLogin && (
                  <>
                    <div className="auth__field">
                      <label className="auth__label" htmlFor="auth-phone">Số điện thoại</label>
                      <div className="auth__phone-wrap">
                        <input
                          id="auth-phone"
                          type="tel"
                          className={`auth__input ${errors.phone ? 'auth__input--error' : ''}`}
                          placeholder="0912345678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          autoComplete="tel"
                        />
                        <button
                          type="button"
                          className="auth__send-otp"
                          onClick={handleSendOtp}
                          disabled={resendIn > 0 && otpSent}
                        >
                          {otpSent
                            ? (resendIn > 0 ? `Gửi lại (${resendIn}s)` : 'Gửi lại')
                            : 'Gửi mã'}
                        </button>
                      </div>
                      {errors.phone && <span className="auth__err">{errors.phone}</span>}
                    </div>

                    {/* OTP input — chỉ hiện sau khi gửi mã */}
                    {otpSent && (
                      <motion.div
                        className="otp-section"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="otp-section__head">
                          <span className="otp-section__label">
                            <ShieldCheck size={16} aria-hidden="true" />
                            Mã xác nhận đã gửi về {phone || 'SĐT của bạn'}
                          </span>
                          <button
                            type="button"
                            className="otp-section__resend"
                            onClick={handleResendOtp}
                            disabled={resendIn > 0}
                          >
                            {resendIn > 0 ? `Gửi lại sau ${resendIn}s` : 'Gửi lại mã'}
                          </button>
                        </div>
                        <OtpInput
                          value={otp}
                          onChange={setOtp}
                          length={OTP_LENGTH}
                          error={errors.otp}
                          autoFocus
                        />
                        <p className="otp-section__hint">
                          Mã có hiệu lực trong <b>5 phút</b>. Không chia sẻ mã này với bất kỳ ai.
                        </p>
                      </motion.div>
                    )}
                  </>
                )}

                {/* Password */}
                <div className="auth__field">
                  <label className="auth__label" htmlFor="auth-password">Mật khẩu</label>
                  <div className="auth__pwd-wrap">
                    <input
                      id="auth-password"
                      type={showPwd ? 'text' : 'password'}
                      className={`auth__input ${errors.password ? 'auth__input--error' : ''}`}
                      placeholder={isLogin ? 'Nhập mật khẩu' : 'Tối thiểu 6 ký tự'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="auth__pwd-toggle"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPwd
                        ? <EyeOff size={20} strokeWidth={2} aria-hidden="true" />
                        : <Eye size={20} strokeWidth={2} aria-hidden="true" />}
                    </button>
                  </div>
                  {errors.password && <span className="auth__err">{errors.password}</span>}
                </div>

                {/* Confirm password — chỉ register */}
                {!isLogin && (
                  <div className="auth__field">
                    <label className="auth__label" htmlFor="auth-confirm">Nhập lại mật khẩu</label>
                    <input
                      id="auth-confirm"
                      type={showPwd ? 'text' : 'password'}
                      className={`auth__input ${errors.confirm ? 'auth__input--error' : ''}`}
                      placeholder="Nhập lại mật khẩu"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                    {errors.confirm && <span className="auth__err">{errors.confirm}</span>}
                  </div>
                )}

                {/* Remember / Forgot — chỉ login */}
                {isLogin ? (
                  <div className="auth__row">
                    <label className="auth__check">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>
                    <a href="#" className="auth__link">Quên mật khẩu?</a>
                  </div>
                ) : (
                  <label className="auth__check">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span className="auth__terms">
                      Tôi đồng ý với <a href="#">Điều khoản dịch vụ</a> và{' '}
                      <a href="#">Chính sách bảo mật</a> của Cầu Lông dee.
                    </span>
                  </label>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="auth__submit"
                  disabled={submitting}
                >
                  {submitting
                    ? (isLogin ? 'Đang đăng nhập…' : 'Đang tạo tài khoản…')
                    : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản')}
                </button>
              </form>

              {/* Divider "Hoặc" */}
              <div className="auth__divider" aria-hidden="true">Hoặc tiếp tục với</div>

              {/* Social */}
              <div className="auth__socials">
                <a href="#" className="auth__social" aria-label="Tiếp tục với Google">
                  <svg className="auth__social-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Google</span>
                </a>
                <a href="#" className="auth__social" aria-label="Tiếp tục với Facebook">
                  <svg className="auth__social-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </a>
              </div>

              {/* Footer link */}
              <p className="auth__foot">
                {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                <button
                  type="button"
                  className="auth__switch"
                  onClick={() => switchMode(isLogin ? 'register' : 'login')}
                >
                  {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

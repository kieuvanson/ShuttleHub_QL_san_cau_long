import {useEffect, useRef, useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useToast} from '@astryxdesign/core/Toast';
import {Camera, Image as ImageIcon, Loader2, Lock} from 'lucide-react';
import type {User} from '../../api/types';
import {authApi} from '../../api/auth';
import {ApiError} from '../../api/types';
import {useAuth} from '../../context/AuthContext';
import {OtpInput} from '../OtpInput';
import {UserAvatar} from '../UserAvatar';
import {isValidPhone, normalizePhone} from '../../utils/phone';
import './ProfileSettings.css';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Email tạm do backend sinh cho user Facebook chưa chia sẻ email. */
const TEMP_EMAIL_SUFFIX = '@facebook.local';

type Errors = Partial<{email: string; phone: string; otp: string; form: string}>;

export type ProfileSettingsProps = {
  user: User;
  avatarPreviewUrl?: string | null;
  onPickAvatar: () => void;
  onPickCover: () => void;
};

/**
 * Tab "Cài đặt" — thông tin hiện tại + đổi email/SĐT + ảnh hồ sơ + bảo mật.
 *
 * ⚠️ Vì sao form đổi email/SĐT vẫn giữ nguyên logic cũ?
 *   Đây là phần đã chạy ổn định từ trang cũ. Di chuyển sang tab mới nhưng
 *   giữ nguyên hành vi validation (ô trống = "không đổi", đổi SĐT bắt buộc
 *   có OTP) để không hồi quy tính năng đã có.
 */
export function ProfileSettings({
  user,
  avatarPreviewUrl,
  onPickAvatar,
  onPickCover,
}: ProfileSettingsProps) {
  const {updateProfile} = useAuth();
  const showToast = useToast();

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

  const isTempEmail = user.email.endsWith(TEMP_EMAIL_SUFFIX);

  /**
   * SĐT trong ô nhập đã khác SĐT hiện tại chưa.
   *
   * ⚠️ Vì sao cần biết trước khi submit?
   *   Ô OTP chỉ render khi `otpSent` — nhưng người dùng có thể bấm "Lưu
   *   thay đổi" khi chưa bấm "Gửi mã". Nếu chỉ hiện lỗi bên trong `OtpInput`
   *   thì lỗi "vui lòng nhập mã xác nhận" sẽ không bao giờ hiện ra → user
   *   bấm Lưu mà không thấy phản hồi gì.
   */
  const phoneInput = normalizePhone(phone);
  const phoneChanged = phoneInput !== null && phoneInput !== user.phoneNumber;

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
      setErrors((e) => ({
        ...e,
        phone: 'Số điện thoại chưa hợp lệ (VD: 0912345678).',
      }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};

    // ⚠️ Ô trống = "không đổi", KHÔNG phải "đổi thành rỗng".
    //   Nếu so sánh thẳng chuỗi rỗng với giá trị hiện tại thì user chỉ muốn
    //   đổi SĐT sẽ bị coi là "đổi email" (email rỗng → sai định dạng) và
    //   user đã có SĐT sẽ bị bắt nhập OTP oan.
    const emailInput = email.trim().toLowerCase();
    const emailChanged =
      emailInput !== '' && emailInput !== user.email.toLowerCase();

    // `phoneChanged` và `phoneInput` đã tính ở cấp component (dùng chung cho
    // việc render ô OTP và việc validate lúc submit).

    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
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
      const payload: {email?: string; phone?: string; otp?: string} = {};
      if (emailChanged) payload.email = emailInput;
      if (phoneChanged) {
        payload.phone = phoneInput ?? undefined;
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

  return (
    <div className="profile-settings">
      <div className="profile-settings__col">
        <Card variant="default" padding={0}>
          <div className="profile-settings__body">
            <Heading level={2} className="profile-settings__title">
              Thông tin hiện tại
            </Heading>

            <div className="profile-settings__rows">
              <div className="profile-settings__row">
                <span className="profile-settings__row-label">Họ tên</span>
                <span className="profile-settings__row-value">
                  {user.fullName || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="profile-settings__row">
                <span className="profile-settings__row-label">Email</span>
                <span className="profile-settings__row-value">
                  {user.email}
                  {isTempEmail && (
                    <Badge variant="warning" label="Chưa xác minh" />
                  )}
                </span>
              </div>
              <div className="profile-settings__row">
                <span className="profile-settings__row-label">Số điện thoại</span>
                <span className="profile-settings__row-value">
                  {user.phoneNumber || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="profile-settings__row">
                <span className="profile-settings__row-label">Tên đăng nhập</span>
                <span className="profile-settings__row-value">
                  @{user.username}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="default" padding={0}>
          <div className="profile-settings__body">
            <Heading level={2} className="profile-settings__title">
              Ảnh hồ sơ
            </Heading>
            <Text type="supporting" className="profile-settings__hint">
              Giai đoạn này ảnh mới chỉ xem trước tại chỗ, chưa lưu lên máy chủ.
            </Text>

            <div className="profile-settings__photo">
              <UserAvatar
                user={user}
                size="lg"
                srcOverride={avatarPreviewUrl}
              />
              <div className="profile-settings__photo-actions">
                <Button
                  label="Đổi ảnh đại diện"
                  variant="secondary"
                  size="sm"
                  icon={<Camera size={14} aria-hidden="true" />}
                  onClick={onPickAvatar}
                />
                <Button
                  label="Đổi ảnh bìa"
                  variant="secondary"
                  size="sm"
                  icon={<ImageIcon size={14} aria-hidden="true" />}
                  onClick={onPickCover}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card variant="default" padding={0}>
          <div className="profile-settings__body">
            <Heading level={2} className="profile-settings__title">
              Bảo mật
            </Heading>
            <div className="profile-settings__row">
              <span className="profile-settings__row-label">
                <Lock size={14} aria-hidden="true" /> Mật khẩu
              </span>
              <Button
                label="Đặt lại mật khẩu"
                variant="secondary"
                size="sm"
                onClick={() =>
                  showToast({body: 'Tính năng "Đặt lại mật khẩu" sẽ có ở giai đoạn sau'})
                }
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="profile-settings__col">
        <Card variant="default" padding={0}>
          <div className="profile-settings__body">
            <Heading level={2} className="profile-settings__title">
              Thông tin liên hệ
            </Heading>
            <Text type="supporting" className="profile-settings__hint">
              Cập nhật thông tin liên hệ để được hỗ trợ nhanh hơn khi đặt sân.
            </Text>

            <form
              className="profile-settings__form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="profile-settings__field">
                <label
                  className="profile-settings__label"
                  htmlFor="profile-email"
                >
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className={`profile-settings__input ${
                    errors.email ? 'profile-settings__input--error' : ''
                  }`}
                  placeholder="ban@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="profile-settings__err">{errors.email}</span>
                )}
              </div>

              <div className="profile-settings__field">
                <label
                  className="profile-settings__label"
                  htmlFor="profile-phone"
                >
                  Số điện thoại
                </label>
                <div className="profile-settings__phone-wrap">
                  <input
                    id="profile-phone"
                    type="tel"
                    className={`profile-settings__input ${
                      errors.phone ? 'profile-settings__input--error' : ''
                    }`}
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <button
                    type="button"
                    className="profile-settings__send-otp"
                    onClick={handleSendOtp}
                    disabled={otpSending || (otpSent && resendIn > 0)}
                  >
                    {otpSending
                      ? 'Đang gửi…'
                      : otpSent
                        ? resendIn > 0
                          ? `Gửi lại (${resendIn}s)`
                          : 'Gửi lại'
                        : 'Gửi mã'}
                  </button>
                </div>
                {errors.phone && (
                  <span className="profile-settings__err">{errors.phone}</span>
                )}
              </div>

              {(otpSent || phoneChanged) && (
                <div className="profile-settings__field">
                  <label className="profile-settings__label">Mã xác nhận</label>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={OTP_LENGTH}
                    autoFocus
                    error={errors.otp}
                  />
                  {devOtp && (
                    <div className="profile-settings__dev">
                      <span className="profile-settings__dev-label">
                        Mã OTP (dev):
                      </span>
                      <button
                        type="button"
                        className="profile-settings__dev-code"
                        onClick={() => setOtp(devOtp)}
                      >
                        {devOtp}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errors.form && (
                <div className="profile-settings__alert" role="alert">
                  {errors.form}
                </div>
              )}

              {saved && (
                <div
                  className="profile-settings__alert profile-settings__alert--ok"
                  role="status"
                >
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
                icon={
                  submitting ? (
                    <Loader2 size={16} className="profile-settings__spinner" />
                  ) : undefined
                }
                className="profile-settings__submit"
              />
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

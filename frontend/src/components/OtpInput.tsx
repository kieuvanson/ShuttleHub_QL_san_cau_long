import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';
import './OtpInput.css';

type Props = {
  value: string;          // chuỗi OTP, ví dụ "123456"
  onChange: (v: string) => void;
  length?: number;        // mặc định 6
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string;
};

/**
 * OtpInput — N ô input cho mã OTP.
 *  • Tự động focus ô tiếp theo khi nhập
 *  • Backspace quay lại ô trước
 *  • Hỗ trợ paste (123456 sẽ fill cả 6 ô)
 *  • Chỉ nhận số
 */
export function OtpInput({ value, onChange, length = 6, disabled, autoFocus, error }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0].focus();
    }
  }, [autoFocus]);

  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  const setDigit = (idx: number, ch: string) => {
    const next = digits.slice();
    next[idx] = ch;
    onChange(next.join('').trimEnd());
  };

  const handleChange = (idx: number, raw: string) => {
    const ch = raw.replace(/\D/g, '').slice(-1); // chỉ lấy 1 số cuối
    if (!ch) return;
    setDigit(idx, ch);
    if (idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx].trim()) {
        // Xóa số hiện tại
        setDigit(idx, '');
      } else if (idx > 0) {
        // Quay về ô trước
        refs.current[idx - 1]?.focus();
        setDigit(idx - 1, '');
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted.padEnd(length, ' ').trimEnd() || pasted);
      // Focus ô cuối cùng vừa paste
      const lastIdx = Math.min(pasted.length, length) - 1;
      refs.current[lastIdx]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className={`otp ${error ? 'otp--error' : ''}`}>
      <div className="otp__boxes" role="group" aria-label="Mã OTP gồm 6 chữ số">
        {Array.from({ length }).map((_, idx) => {
          const isFilled = digits[idx] && digits[idx] !== ' ';
          return (
            <input
              key={idx}
              ref={(el) => { refs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digits[idx]?.trim() || ''}
              disabled={disabled}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              aria-label={`Chữ số thứ ${idx + 1}`}
              className={`otp__box ${isFilled ? 'otp__box--filled' : ''}`}
            />
          );
        })}
      </div>
      {error && <span className="otp__err">{error}</span>}
    </div>
  );
}

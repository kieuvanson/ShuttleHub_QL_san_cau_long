import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/types';
import './OAuthCallbackPage.css';

/**
 * OAuthCallbackPage — trang nhận về sau khi provider redirect từ backend.
 *
 * Luồng: backend xử lý OAuth → redirect về `/oauth/callback?ticket=XXX`
 * → trang này đổi ticket lấy access + refresh token.
 *
 * ⚠️ Ticket dùng 1 lần, hết hạn 60s. Nếu người dùng refresh trang
 * hoặc mở lại tab cũ → ticket đã hết hạn → báo lỗi và đưa về trang
 * đăng nhập (KHÔNG tự retry, vì retry sẽ chắc chắn fail).
 */
export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTicket } = useAuth();

  const [error, setError] = useState<string | null>(null);
  // useRef để chỉ chạy effect 1 lần: React StrictMode gọi effect 2 lần
  // ở dev → consume ticket 2 lần → lần 2 luôn fail.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const ticket = params.get('ticket');
    if (!ticket) {
      setError('Không tìm thấy phiên đăng nhập. Vui lòng thử lại.');
      return;
    }

    // ⚠️ KHÔNG dùng cờ `cancelled` ở đây.
    // React 19 StrictMode gọi effect 2 lần: mount → cleanup → mount.
    // Cleanup set `cancelled = true`, còn lần mount thứ 2 bị guard `started`
    // chặn nên không chạy lại → IIFE của lần mount 1 luôn thấy
    // `cancelled === true` → nuốt mất lỗi → UI kẹt vô tận ở
    // "Đang đăng nhập…" dù request đã fail.
    // Guard `started` đã đảm bảo chỉ chạy đúng 1 lần (ticket single-use),
    // nên không cần cờ hủy nữa.
    (async () => {
      try {
        await loginWithTicket(ticket);
        navigate('/', { replace: true });
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : 'Đăng nhập bằng tài khoản mạng xã hội thất bại. Vui lòng thử lại.';
        setError(msg);
      }
    })();
  }, [params, loginWithTicket, navigate]);

  return (
    <section className="oauth-cb">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="oauth-cb__card" padding={0}>
          <div className="oauth-cb__body">
            {error ? (
              <>
                <div className="oauth-cb__icon oauth-cb__icon--error" aria-hidden="true">
                  <ShieldCheck size={28} />
                </div>
                <Heading level={1} className="oauth-cb__title">
                  Đăng nhập không thành công
                </Heading>
                <Text type="supporting" className="oauth-cb__text">
                  {error}
                </Text>
                <Button
                  label="Quay lại trang đăng nhập"
                  variant="primary"
                  width="100%"
                  onClick={() => navigate('/dang-nhap', { replace: true })}
                />
              </>
            ) : (
              <>
                <div className="oauth-cb__icon" aria-hidden="true">
                  <Loader2 size={28} className="oauth-cb__spinner" />
                </div>
                <Heading level={1} className="oauth-cb__title">
                  Đang đăng nhập…
                </Heading>
                <Text type="supporting" className="oauth-cb__text">
                  Vui lòng chờ trong giây lát, chúng tôi đang xác thực tài khoản của bạn.
                </Text>
              </>
            )}
          </div>
        </Card>
      </motion.div>
    </section>
  );
}

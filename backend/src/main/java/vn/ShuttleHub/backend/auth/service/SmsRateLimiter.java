package vn.ShuttleHub.backend.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn số lần gửi OTP theo IP trong 1 giờ.
 *
 * ⚠️ Vì sao cần?
 * Rate-limit theo SĐT (cooldown 60s) KHÔNG chặn được kẻ xấu: gọi
 * `send-otp` với 1000 số khác nhau → mỗi lần là 1 tin SMS THẬT → đốt tiền
 * tài khoản SpeedSMS. Giới hạn theo IP chặn được việc này.
 *
 * ⚠️ Giới hạn đã biết (chấp nhận ở giai đoạn hiện tại):
 *   - Lưu in-memory → restart backend là reset toàn bộ.
 *   - KHÔNG áp dụng khi chạy nhiều instance (mỗi instance một bộ đếm riêng).
 *   → Khi scale lên nhiều instance, chuyển sang Redis hoặc bảng DB.
 */
@Component
public class SmsRateLimiter {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final int maxPerWindow;

    /** IP → danh sách thời điểm các lần gửi trong cửa sổ. */
    private final Map<String, Deque<Instant>> hitsByIp = new ConcurrentHashMap<>();

    public SmsRateLimiter(@Value("${app.sms.max-sends-per-hour-per-ip}") int maxPerWindow) {
        this.maxPerWindow = maxPerWindow;
    }

    /**
     * Ghi nhận 1 lần gửi cho IP.
     *
     * @return true nếu được phép gửi; false nếu đã vượt giới hạn
     */
    public boolean tryAcquire(String clientIp) {
        // Không xác định được IP → không chặn (fallback an toàn cho dev,
        // nơi mọi request đều đến từ 127.0.0.1).
        if (clientIp == null || clientIp.isBlank()) {
            return true;
        }

        Instant now = Instant.now();
        Deque<Instant> hits = hitsByIp.computeIfAbsent(clientIp, k -> new ArrayDeque<>());

        synchronized (hits) {
            // Xoá các lần gửi đã nằm ngoài cửa sổ 1 giờ.
            hits.removeIf(t -> t.isBefore(now.minus(WINDOW)));

            if (hits.size() >= maxPerWindow) {
                return false;
            }

            hits.addLast(now);
            return true;
        }
    }
}

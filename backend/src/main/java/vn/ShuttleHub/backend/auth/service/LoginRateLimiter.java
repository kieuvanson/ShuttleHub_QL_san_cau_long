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
 * Giới hạn số lần thử đăng nhập theo IP trong 1 giờ.
 *
 * ⚠️ Vì sao cần?
 * Endpoint `/api/auth/login` trả về cùng một message cho "email sai" và
 * "mật khẩu sai" (để không lộ email nào tồn tại) — nhưng nếu KHÔNG giới hạn
 * số lần thử, kẻ xấu vẫn đoán được mật khẩu bằng brute force.
 *
 * ⚠️ Giới hạn đã biết (chấp nhận ở giai đoạn hiện tại):
 *   - Lưu in-memory → restart backend là reset toàn bộ.
 *   - KHÔNG áp dụng khi chạy nhiều instance.
 *   → Khi scale lên nhiều instance, chuyển sang Redis hoặc bảng DB.
 */
@Component
public class LoginRateLimiter {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final int maxPerWindow;

    /** IP → danh sách thời điểm các lần thử trong cửa sổ. */
    private final Map<String, Deque<Instant>> hitsByIp = new ConcurrentHashMap<>();

    public LoginRateLimiter(@Value("${app.auth.max-logins-per-hour-per-ip}") int maxPerWindow) {
        this.maxPerWindow = maxPerWindow;
    }

    /**
     * Ghi nhận 1 lần thử đăng nhập.
     *
     * @return true nếu được phép; false nếu đã vượt giới hạn
     */
    public boolean tryAcquire(String clientIp) {
        // Không xác định được IP → không chặn (fallback an toàn cho dev).
        if (clientIp == null || clientIp.isBlank()) {
            return true;
        }

        Instant now = Instant.now();
        Deque<Instant> hits = hitsByIp.computeIfAbsent(clientIp, k -> new ArrayDeque<>());

        synchronized (hits) {
            // Xoá các lần thử đã nằm ngoài cửa sổ 1 giờ.
            hits.removeIf(t -> t.isBefore(now.minus(WINDOW)));

            if (hits.size() >= maxPerWindow) {
                return false;
            }

            hits.addLast(now);
            return true;
        }
    }
}

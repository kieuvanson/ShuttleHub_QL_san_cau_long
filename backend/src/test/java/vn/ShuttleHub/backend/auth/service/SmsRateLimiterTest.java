package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SmsRateLimiterTest {

    @Test
    @DisplayName("Cho phép tới đúng giới hạn")
    void tryAcquire_allowsUpToLimit() {
        SmsRateLimiter limiter = new SmsRateLimiter(3);
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
    }

    @Test
    @DisplayName("Chặn lần vượt giới hạn")
    void tryAcquire_blocksOverLimit() {
        SmsRateLimiter limiter = new SmsRateLimiter(3);
        limiter.tryAcquire("1.2.3.4");
        limiter.tryAcquire("1.2.3.4");
        limiter.tryAcquire("1.2.3.4");
        assertFalse(limiter.tryAcquire("1.2.3.4"));
    }

    @Test
    @DisplayName("IP khác nhau không ảnh hưởng lẫn nhau")
    void tryAcquire_isolatesPerIp() {
        SmsRateLimiter limiter = new SmsRateLimiter(1);
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertFalse(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("5.6.7.8"));
    }

    @Test
    @DisplayName("IP null → không chặn (fallback an toàn cho dev)")
    void tryAcquire_nullIp_isAllowed() {
        SmsRateLimiter limiter = new SmsRateLimiter(1);
        assertTrue(limiter.tryAcquire(null));
        assertTrue(limiter.tryAcquire(null));
    }

    @Test
    @DisplayName("IP rỗng → không chặn")
    void tryAcquire_blankIp_isAllowed() {
        SmsRateLimiter limiter = new SmsRateLimiter(1);
        assertTrue(limiter.tryAcquire("   "));
    }

    @Test
    @DisplayName("Ghi nhận lần gửi bị từ chối vẫn không tiêu tốn lượt của IP khác")
    void tryAcquire_doesNotAffectOtherIps() {
        SmsRateLimiter limiter = new SmsRateLimiter(1);
        assertTrue(limiter.tryAcquire("1.1.1.1"));
        assertFalse(limiter.tryAcquire("1.1.1.1"));
        assertTrue(limiter.tryAcquire("2.2.2.2"));
    }
}

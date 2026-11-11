package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginRateLimiterTest {

    @Test
    @DisplayName("Cho phép tới đúng giới hạn")
    void tryAcquire_allowsUpToLimit() {
        LoginRateLimiter limiter = new LoginRateLimiter(5);
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
    }

    @Test
    @DisplayName("Chặn lần vượt giới hạn")
    void tryAcquire_blocksOverLimit() {
        LoginRateLimiter limiter = new LoginRateLimiter(3);
        limiter.tryAcquire("1.2.3.4");
        limiter.tryAcquire("1.2.3.4");
        limiter.tryAcquire("1.2.3.4");
        assertFalse(limiter.tryAcquire("1.2.3.4"));
    }

    @Test
    @DisplayName("IP khác nhau độc lập")
    void tryAcquire_isolatesPerIp() {
        LoginRateLimiter limiter = new LoginRateLimiter(1);
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertFalse(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("5.6.7.8"));
    }

    @Test
    @DisplayName("IP null/rỗng → không chặn")
    void tryAcquire_blankIp_isAllowed() {
        LoginRateLimiter limiter = new LoginRateLimiter(1);
        assertTrue(limiter.tryAcquire(null));
        assertTrue(limiter.tryAcquire("  "));
    }
}

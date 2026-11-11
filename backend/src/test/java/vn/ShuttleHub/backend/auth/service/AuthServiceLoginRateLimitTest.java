package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.ShuttleHub.backend.auth.exception.InvalidCredentialsException;
import vn.ShuttleHub.backend.auth.exception.RateLimitException;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.RefreshTokenRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Test rate-limit đăng nhập.
 *
 * ⚠️ Vì sao cần?
 * Endpoint /login cho phép đoán mật khẩu không giới hạn → kẻ xấu thử
 * hàng triệu mật khẩu (brute force). Giới hạn số lần thử theo IP giúp
 * chặn.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceLoginRateLimitTest {

    @Mock
    private UserRepository userRepo;

    @Mock
    private RefreshTokenRepository refreshTokenRepo;

    @Mock
    private OtpService otpService;

    @Mock
    private JwtService jwtService;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Mock
    private RegistrationAttemptService registrationAttemptService;

    @Mock
    private LoginRateLimiter loginRateLimiter;

    private AuthService authService;

    /**
     * ⚠️ Vì sao không dùng @InjectMocks?
     * `AuthService` có constructor thủ công nhận thêm tham số `@Value int`
     * → Mockito không biết lấy giá trị nào cho tham số đó → fail inject.
     */
    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepo,
                refreshTokenRepo,
                otpService,
                jwtService,
                passwordEncoder,
                registrationAttemptService,
                loginRateLimiter,
                3
        );
    }

    @Test
    @DisplayName("Vượt giới hạn đăng nhập theo IP → ném RateLimitException, KHÔNG query DB")
    void login_overIpLimit_throwsRateLimit() {
        when(loginRateLimiter.tryAcquire(anyString())).thenReturn(false);

        assertThrows(RateLimitException.class,
                () -> authService.login(
                        new vn.ShuttleHub.backend.auth.dto.LoginRequest("a@b.com", "matkhau"), "1.2.3.4"));

        org.mockito.Mockito.verify(userRepo, org.mockito.Mockito.never()).findByEmail(anyString());
    }

    @Test
    @DisplayName("Sai mật khẩu → ném InvalidCredentialsException")
    void login_wrongPassword_throwsInvalidCredentials() {
        when(loginRateLimiter.tryAcquire(anyString())).thenReturn(true);
        when(userRepo.findByEmail("a@b.com")).thenReturn(java.util.Optional.of(
                User.builder().id("u1").email("a@b.com").password("hash").isActive(true).build()));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(
                        new vn.ShuttleHub.backend.auth.dto.LoginRequest("a@b.com", "sai"), "1.2.3.4"));
    }
}

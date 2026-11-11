package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.auth.exception.RateLimitException;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.RefreshTokenRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceRegistrationLimitTest {

    private static final int MAX_PER_DAY = 3;

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

    private AuthService authService;

    /**
     * ⚠️ Vì sao không dùng @InjectMocks?
     * `AuthService` có constructor thủ công nhận thêm tham số `@Value int`
     * → Mockito không biết lấy giá trị nào cho tham số đó → fail inject.
     * → Dựng instance thủ công, truyền MAX_PER_DAY rõ ràng.
     */
    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepo,
                refreshTokenRepo,
                otpService,
                jwtService,
                passwordEncoder,
                registrationAttemptService,
                MAX_PER_DAY
        );
    }

    private static vn.ShuttleHub.backend.auth.dto.RegisterRequest request() {
        return new vn.ShuttleHub.backend.auth.dto.RegisterRequest(
                "Nguyen Van A", "a@b.com", "84912345678", "matkhau123", "123456", "user01");
    }

    private void givenNoDuplicate() {
        when(userRepo.existsByEmail(anyString())).thenReturn(false);
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(userRepo.existsByPhoneNumber(anyString())).thenReturn(false);
    }

    private void givenTokenGeneration() {
        when(jwtService.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("access.jwt.token");
        when(jwtService.generateRefreshToken(anyString(), anyString(), anyString())).thenReturn("refresh.jwt.token");
        when(jwtService.hashToken(anyString())).thenReturn("hash");
        when(jwtService.getRefreshExpirationSeconds()).thenReturn(604800L);
        when(jwtService.getAccessExpirationSeconds()).thenReturn(900L);
    }

    @Test
    @DisplayName("Đã đạt giới hạn đăng ký/SĐT/ngày → ném RateLimitException, KHÔNG tạo user")
    void register_blocksWhenLimitReached() {
        givenNoDuplicate();
        // Bộ đếm đã bao gồm lần đăng ký hiện tại (vì record chạy trước),
        // nên 4 > max(3) → bị chặn.
        when(registrationAttemptService.countRegistrationsInLast24h("84912345678")).thenReturn(4L);

        assertThrows(RateLimitException.class, () -> authService.register(request()));
        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Lần đăng ký thứ 3 (bộ đếm = 3) → vẫn cho qua")
    void register_allowsThirdAttempt() {
        givenNoDuplicate();
        givenTokenGeneration();
        when(registrationAttemptService.countRegistrationsInLast24h("84912345678")).thenReturn(3L);
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> authService.register(request()));
        verify(userRepo, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Chưa đạt giới hạn → đăng ký thành công, có tạo user")
    void register_allowsBelowLimit() {
        givenNoDuplicate();
        givenTokenGeneration();
        when(registrationAttemptService.countRegistrationsInLast24h("84912345678")).thenReturn(2L);
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> authService.register(request()));
        verify(userRepo, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Đăng ký fail vì email trùng → VẪN ghi bộ đếm (chống spam: mỗi lần đều tốn 1 SMS)")
    void register_countsAttemptEvenWhenEmailExists() {
        when(userRepo.existsByEmail("a@b.com")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class, () -> authService.register(request()));
        verify(registrationAttemptService, times(1)).recordRegistration("84912345678");
    }

    @Test
    @DisplayName("Đăng ký fail vì SĐT trùng → VẪN ghi bộ đếm")
    void register_countsAttemptWhenPhoneExists() {
        when(userRepo.existsByEmail(anyString())).thenReturn(false);
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class, () -> authService.register(request()));
        verify(registrationAttemptService, times(1)).recordRegistration("84912345678");
    }

    @Test
    @DisplayName("Đăng ký thành công → ghi bộ đếm đúng 1 lần với SĐT E.164")
    void register_recordsAttemptAfterSuccess() {
        givenNoDuplicate();
        givenTokenGeneration();
        when(registrationAttemptService.countRegistrationsInLast24h("84912345678")).thenReturn(0L);
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(request());

        verify(registrationAttemptService, times(1)).recordRegistration("84912345678");
    }

    @Test
    @DisplayName("Ghi bộ đếm TRƯỚC khi tạo user → lần đăng ký fail vẫn được tính")
    void register_recordsAttemptBeforeCreatingUser() {
        givenNoDuplicate();
        givenTokenGeneration();
        when(registrationAttemptService.countRegistrationsInLast24h("84912345678")).thenReturn(0L);
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(request());

        // Thứ tự: record -> save
        InOrder inOrder = inOrder(registrationAttemptService, userRepo);
        inOrder.verify(registrationAttemptService).recordRegistration("84912345678");
        inOrder.verify(userRepo).save(any(User.class));
    }
}

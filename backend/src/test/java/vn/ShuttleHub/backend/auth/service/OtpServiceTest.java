package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import vn.ShuttleHub.backend.auth.exception.RateLimitException;
import vn.ShuttleHub.backend.auth.exception.SmsSendException;
import vn.ShuttleHub.backend.auth.sms.SmsSendResult;
import vn.ShuttleHub.backend.auth.sms.SmsSender;
import vn.ShuttleHub.backend.entity.OtpCode;
import vn.ShuttleHub.backend.repository.OtpCodeRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test luồng gửi OTP: rate-limit theo SĐT, rate-limit theo IP, xử lý
 * kết quả gửi SMS, và việc CHỈ lộ mã OTP khi provider là mock.
 */
@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private OtpCodeRepository otpRepo;

    @Mock
    private OtpAttemptService otpAttemptService;

    @Mock
    private SmsSender smsSender;

    @Mock
    private SmsRateLimiter smsRateLimiter;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        // @Value không được inject khi không có Spring context → set thủ công.
        // ttlSeconds / resendCooldownSeconds để 0 để cooldown không chặn test.
        ReflectionTestUtils.setField(otpService, "otpLength", 6);
        ReflectionTestUtils.setField(otpService, "ttlSeconds", 300);
        ReflectionTestUtils.setField(otpService, "resendCooldownSeconds", 60);
        ReflectionTestUtils.setField(otpService, "maxAttempts", 5);
    }

    private void givenNoRecentOtp() {
        when(otpRepo.countByPhoneAndCreatedAtAfter(anyString(), any())).thenReturn(0L);
    }

    private void givenIpAllowed() {
        when(smsRateLimiter.tryAcquire(anyString())).thenReturn(true);
    }

    private void givenPasswordEncoder() {
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("hashed-otp");
    }

    @Test
    @DisplayName("Provider mock → trả về mã OTP để frontend hiển thị")
    void sendOtp_mockProvider_returnsCode() {
        givenNoRecentOtp();
        givenIpAllowed();
        givenPasswordEncoder();
        when(smsSender.sendOtp(anyString(), anyString())).thenReturn(SmsSendResult.ok());
        when(smsSender.exposesCode()).thenReturn(true);

        String code = otpService.sendOtp("84912345678", "1.2.3.4");

        assertEquals(6, code.length());
    }

    @Test
    @DisplayName("Provider thật → KHÔNG trả mã OTP về client")
    void sendOtp_realProvider_returnsNull() {
        givenNoRecentOtp();
        givenIpAllowed();
        givenPasswordEncoder();
        when(smsSender.sendOtp(anyString(), anyString())).thenReturn(SmsSendResult.ok());
        when(smsSender.exposesCode()).thenReturn(false);

        assertNull(otpService.sendOtp("84912345678", "1.2.3.4"));
    }

    @Test
    @DisplayName("SMS thất bại → ném SmsSendException với message tiếng Việt từ provider")
    void sendOtp_smsFails_throwsSmsSendException() {
        givenNoRecentOtp();
        givenIpAllowed();
        givenPasswordEncoder();
        when(smsSender.sendOtp(anyString(), anyString()))
                .thenReturn(SmsSendResult.fail("300", "Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau."));

        SmsSendException ex = assertThrows(SmsSendException.class,
                () -> otpService.sendOtp("84912345678", "1.2.3.4"));
        assertEquals("Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau.", ex.getMessage());
    }

    @Test
    @DisplayName("SMS thất bại → KHÔNG lưu OTP vào DB")
    void sendOtp_smsFails_doesNotSaveOtp() {
        givenNoRecentOtp();
        givenIpAllowed();
        givenPasswordEncoder();
        when(smsSender.sendOtp(anyString(), anyString()))
                .thenReturn(SmsSendResult.fail("300", "Lỗi"));

        assertThrows(SmsSendException.class, () -> otpService.sendOtp("84912345678", "1.2.3.4"));
        verify(otpRepo, never()).save(any(OtpCode.class));
    }

    @Test
    @DisplayName("Trong cooldown theo SĐT → ném RateLimitException, KHÔNG gọi SMS")
    void sendOtp_withinCooldown_throwsRateLimit() {
        when(otpRepo.countByPhoneAndCreatedAtAfter(anyString(), any())).thenReturn(1L);

        assertThrows(RateLimitException.class, () -> otpService.sendOtp("84912345678", "1.2.3.4"));
        verify(smsSender, never()).sendOtp(anyString(), anyString());
    }

    @Test
    @DisplayName("Vượt giới hạn theo IP → ném RateLimitException, KHÔNG gọi SMS")
    void sendOtp_overIpLimit_throwsRateLimit() {
        givenNoRecentOtp();
        when(smsRateLimiter.tryAcquire(anyString())).thenReturn(false);

        assertThrows(RateLimitException.class, () -> otpService.sendOtp("84912345678", "1.2.3.4"));
        verify(smsSender, never()).sendOtp(anyString(), anyString());
    }

    @Test
    @DisplayName("Gửi thành công → lưu OTP (chưa dùng, có hạn)")
    void sendOtp_success_savesOtpCode() {
        givenNoRecentOtp();
        givenIpAllowed();
        givenPasswordEncoder();
        when(smsSender.sendOtp(anyString(), anyString())).thenReturn(SmsSendResult.ok());
        when(smsSender.exposesCode()).thenReturn(false);

        otpService.sendOtp("84912345678", "1.2.3.4");

        verify(otpRepo).save(any(OtpCode.class));
    }
}

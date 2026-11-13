package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.ShuttleHub.backend.auth.dto.ProfileUpdateRequest;
import vn.ShuttleHub.backend.auth.exception.BadRequestException;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test cập nhật hồ sơ — endpoint PUT /api/auth/profile.
 *
 * ⚠️ Test quan trọng nhất: `updateProfile_emailWithoutPhoneRejected`.
 *   Đổi email mà user CHƯA có SĐT mà không kèm OTP → phải bị chặn.
 *   Nếu không, kẻ xấu chỉ cần gọi 1 API là chiếm được email người khác.
 */
@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserRepository userRepo;

    @Mock
    private OtpService otpService;

    private ProfileService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new ProfileService(userRepo, otpService);
    }

    /** User Facebook mới tạo: email tạm, chưa có SĐT. */
    private User userWithoutPhone() {
        return User.builder().id("u-1").email("fb_fb_1_abcd1234@facebook.local")
                .username("fb_fb_1_abcd1234").password("h").role(Role.CUSTOMER)
                .isActive(true).build();
    }

    /** User Google: đã có email thật + SĐT đã verify. */
    private User userWithPhone() {
        return User.builder().id("u-2").email("real@x.com")
                .username("realuser").password("h").role(Role.CUSTOMER)
                .phoneNumber("84900000000").isActive(true).build();
    }

    @Test
    @DisplayName("Đổi email + SĐT (kèm OTP) → cập nhật user, verify OTP được gọi")
    void updateProfile_emailAndPhone_succeeds() {
        User u = userWithoutPhone();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));
        when(userRepo.existsByEmail("real@x.com")).thenReturn(false);
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(false);
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.updateProfile("u-1",
                new ProfileUpdateRequest("real@x.com", "84912345678", "123456"));

        assertEquals("real@x.com", dto.email());
        assertEquals("84912345678", dto.phoneNumber());
        verify(otpService).verifyOtp("84912345678", "123456");
    }

    @Test
    @DisplayName("Đổi email khi CHƯA có SĐT mà không kèm OTP → 400, KHÔNG đổi email")
    void updateProfile_emailWithoutPhoneRejected() {
        User u = userWithoutPhone();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));

        assertThrows(BadRequestException.class,
                () -> service.updateProfile("u-1",
                        new ProfileUpdateRequest("real@x.com", null, null)));

        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("Đổi SĐT mà không kèm OTP → 400, KHÔNG đổi")
    void updateProfile_phoneWithoutOtpRejected() {
        User u = userWithPhone();
        when(userRepo.findById("u-2")).thenReturn(Optional.of(u));

        assertThrows(BadRequestException.class,
                () -> service.updateProfile("u-2",
                        new ProfileUpdateRequest(null, "84912345678", null)));

        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("Email đã tồn tại → 409, KHÔNG đổi")
    void updateProfile_duplicateEmail_throws() {
        User u = userWithPhone();
        when(userRepo.findById("u-2")).thenReturn(Optional.of(u));
        when(userRepo.existsByEmail("taken@x.com")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class,
                () -> service.updateProfile("u-2",
                        new ProfileUpdateRequest("taken@x.com", null, null)));

        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("SĐT đã tồn tại → 409, KHÔNG đổi")
    void updateProfile_duplicatePhone_throws() {
        User u = userWithPhone();
        when(userRepo.findById("u-2")).thenReturn(Optional.of(u));
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class,
                () -> service.updateProfile("u-2",
                        new ProfileUpdateRequest(null, "84912345678", "123456")));

        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("Không gửi gì cả → 400, KHÔNG đổi")
    void updateProfile_emptyRequest_throws() {
        User u = userWithPhone();
        when(userRepo.findById("u-2")).thenReturn(Optional.of(u));

        assertThrows(BadRequestException.class,
                () -> service.updateProfile("u-2",
                        new ProfileUpdateRequest(null, null, null)));

        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("User ĐÃ có SĐT → đổi email khác không cần OTP (SĐT đã verify rồi)")
    void updateProfile_emailOnly_whenPhoneAlreadyVerified() {
        User u = userWithPhone();
        when(userRepo.findById("u-2")).thenReturn(Optional.of(u));
        when(userRepo.existsByEmail("newmail@x.com")).thenReturn(false);
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.updateProfile("u-2",
                new ProfileUpdateRequest("newmail@x.com", null, null));

        assertEquals("newmail@x.com", dto.email());
        // SĐT cũ giữ nguyên
        assertEquals("84900000000", dto.phoneNumber());
    }
}

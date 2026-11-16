package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.auth.exception.InvalidCredentialsException;
import vn.ShuttleHub.backend.auth.oauth.OAuthTicketService;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.entity.OAuthAccount;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.OAuthAccountRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test nghiệp vụ tìm / tạo / gộp user từ OAuth.
 *
 * ⚠️ Test quan trọng nhất: `facebook_existingEmail_throwsConflict`.
 * Facebook KHÔNG chứng minh được sở hữu email → nếu ta gộp tự động thì
 * kẻ xấu chiếm đoạt được tài khoản của người khác.
 */
@ExtendWith(MockitoExtension.class)
class OAuthAuthServiceTest {

    @Mock
    private UserRepository userRepo;

    @Mock
    private OAuthAccountRepository oauthAccountRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private OAuthTicketService ticketService;

    @Mock
    private OtpService otpService;

    private OAuthAuthService service;

    /**
     * ⚠️ Instantiate trực tiếp — service dùng constructor injection cho
     * các dependency, Mockito không resolve được `@Value`.
     */
    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new OAuthAuthService(
                userRepo, oauthAccountRepo, passwordEncoder, ticketService, otpService);
    }

    private OAuthUserInfo google(String email, boolean verified) {
        return new OAuthUserInfo("google", "sub-1", email, verified, "Nguyen Van A");
    }

    private OAuthUserInfo facebook(String email) {
        return new OAuthUserInfo("facebook", "fb-1", email, false, "Nguyen Van A");
    }

    @Test
    @DisplayName("Google + email mới → tạo user mới, sinh ticket đăng nhập")
    void google_newEmail_createsUser() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("new@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-new");
            return u;
        });
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("ticket-1");

        var outcome = service.handleCallback(google("new@x.com", true));

        assertEquals("LOGGED_IN", outcome.status());
        assertEquals("ticket-1", outcome.ticket());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("new@x.com", saved.getEmail());
        assertEquals(Role.CUSTOMER, saved.getRole());
        assertTrue(saved.getIsActive());
        assertNotNull(saved.getPassword());
    }

    @Test
    @DisplayName("User OAuth KHÔNG đăng nhập được bằng mật khẩu (hash random)")
    void oauthUser_passwordIsRandomHash() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("new@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-new");
            return u;
        });
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t");

        service.handleCallback(google("new@x.com", true));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        // Không bao giờ là mật khẩu rỗng hay chuỗi rõ ràng.
        assertNotNull(captor.getValue().getPassword());
        assertFalse(captor.getValue().getPassword().isBlank());
    }

    @Test
    @DisplayName("Google + email đã có + verified=true → GỘP vào user đó, KHÔNG tạo user mới")
    void google_existingVerified_mergesIntoExistingUser() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.empty());
        User existing = User.builder().id("u-exist").email("old@x.com")
                .username("olduser").password("h").role(Role.CUSTOMER).isActive(true).build();
        when(userRepo.findByEmail("old@x.com")).thenReturn(Optional.of(existing));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t2");

        var outcome = service.handleCallback(google("old@x.com", true));

        assertEquals("LOGGED_IN", outcome.status());
        assertEquals("u-exist", outcome.userId());
        verify(userRepo, never()).save(any());
        verify(oauthAccountRepo).save(any(OAuthAccount.class));
    }

    @Test
    @DisplayName("Facebook + email đã có → KHÔNG gộp, ném lỗi 409")
    void facebook_existingEmail_throwsConflict() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.empty());
        User existing = User.builder().id("u-exist").email("victim@x.com")
                .username("victim").password("h").role(Role.CUSTOMER).isActive(true).build();
        when(userRepo.findByEmail("victim@x.com")).thenReturn(Optional.of(existing));

        assertThrows(EmailAlreadyExistsException.class,
                () -> service.handleCallback(facebook("victim@x.com")));

        verify(userRepo, never()).save(any());
        verify(oauthAccountRepo, never()).save(any());
    }

    @Test
    @DisplayName("Facebook lần đầu + có email → tạo user ngay, sinh ticket đăng nhập")
    void facebook_withEmail_createsUserImmediately() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("newfb@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-fb");
            return u;
        });
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t-fb");

        var outcome = service.handleCallback(facebook("newfb@x.com"));

        assertEquals("LOGGED_IN", outcome.status());
        assertEquals("t-fb", outcome.ticket());
        assertEquals("u-fb", outcome.userId());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("newfb@x.com", captor.getValue().getEmail());
        // Chưa có SĐT → user tự điền ở trang cá nhân
        assertNull(captor.getValue().getPhoneNumber());
        assertEquals(Role.CUSTOMER, captor.getValue().getRole());
    }

    @Test
    @DisplayName("Facebook không có email → NEEDS_PHONE, sinh ticket chờ, KHÔNG tạo user")
    void facebook_noEmail_needsPhone() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.empty());
        when(ticketService.issuePending(anyString(), anyString(), any(), any())).thenReturn("pending-2");

        var outcome = service.handleCallback(new OAuthUserInfo("facebook", "fb-1", null, false, "Nam"));

        assertEquals("NEEDS_PHONE", outcome.status());
        assertEquals("pending-2", outcome.ticket());
        verify(userRepo, never()).save(any());
    }

    @Test
    @DisplayName("Đã có oauth_account → dùng lại user đó, không tạo mới")
    void existingLink_reusesUser() {
        OAuthAccount link = OAuthAccount.builder().id("oa-1").userId("u-1")
                .provider("google").providerUserId("sub-1")
                .emailAtRegistration("a@x.com").createdAt(LocalDateTime.now()).build();
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.of(link));
        User u = User.builder().id("u-1").email("a@x.com").username("u1")
                .password("h").role(Role.CUSTOMER).isActive(true).build();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t3");

        var outcome = service.handleCallback(google("a@x.com", true));

        assertEquals("LOGGED_IN", outcome.status());
        assertEquals("u-1", outcome.userId());
        verify(userRepo, never()).save(any());
        verify(oauthAccountRepo, never()).save(any());
    }

    @Test
    @DisplayName("User bị khoá (isActive=false) → ném lỗi, không cho đăng nhập OAuth")
    void inactiveUser_throws() {
        OAuthAccount link = OAuthAccount.builder().id("oa-1").userId("u-1")
                .provider("google").providerUserId("sub-1")
                .emailAtRegistration("a@x.com").createdAt(LocalDateTime.now()).build();
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.of(link));
        User u = User.builder().id("u-1").email("a@x.com").username("u1")
                .password("h").role(Role.CUSTOMER).isActive(false).build();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));

        assertThrows(InvalidCredentialsException.class,
                () -> service.handleCallback(google("a@x.com", true)));
    }

    @Test
    @DisplayName("Email được chuẩn hoá (trim + lowercase) trước khi so sánh")
    void email_isNormalizedBeforeLookup() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("google", "sub-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("mixed@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-mixed");
            return u;
        });
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t");

        service.handleCallback(new OAuthUserInfo("google", "sub-1", "  MiXeD@X.COM  ", true, "A"));

        verify(userRepo).findByEmail("mixed@x.com");
    }

    // ---- verifyPhoneAndCreateUser (nhánh Facebook KHÔNG trả email) ----

    // ---- verifyPhoneAndCreateUser (nhánh Facebook KHÔNG trả email) ----

    @Test
    @DisplayName("Verify SĐT (FB không email): OTP hợp lệ → tạo user + email tạm + link + gắn user vào ticket")
    void verifyPhoneAndCreateUser_happyPath() {
        OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
                .provider("facebook").providerUserId("fb-1").fullName("Nam")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(ticketService.peek("pending-1")).thenReturn(pending);
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(false);
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-fb");
            return u;
        });

        String userId = service.verifyPhoneAndCreateUser("pending-1", "84912345678", "123456");

        assertEquals("u-fb", userId);
        verify(otpService).verifyOtp("84912345678", "123456");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("84912345678", captor.getValue().getPhoneNumber());
        // Email tạm — user tự đổi ở trang cá nhân.
        // ⚠️ Có hash 8 hex char để đảm bảo UNIQUE (2 id khác nhau không
        //   sanitize ra cùng một chuỗi).
        assertTrue(captor.getValue().getEmail().endsWith("@facebook.local"));
        assertTrue(captor.getValue().getEmail().startsWith("fb_fb_1_"));
        assertEquals("Nam", captor.getValue().getFullName());

        ArgumentCaptor<OAuthAccount> linkCaptor = ArgumentCaptor.forClass(OAuthAccount.class);
        verify(oauthAccountRepo).save(linkCaptor.capture());
        assertEquals("facebook", linkCaptor.getValue().getProvider());
        assertEquals("fb-1", linkCaptor.getValue().getProviderUserId());

        verify(ticketService).attachUser("pending-1", "u-fb");
    }

    @Test
    @DisplayName("Verify SĐT: SĐT đã đăng ký → ném lỗi 409, KHÔNG tạo user")
    void verifyPhoneAndCreateUser_existingPhone_throws() {
        OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
                .provider("facebook").providerUserId("fb-1")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(ticketService.peek("pending-1")).thenReturn(pending);
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class,
                () -> service.verifyPhoneAndCreateUser("pending-1", "84912345678", "123456"));

        verify(userRepo, never()).save(any());
        verify(ticketService, never()).attachUser(anyString(), anyString());
    }

    @Test
    @DisplayName("Verify SĐT: OTP sai → ném lỗi, KHÔNG tạo user")
    void verifyPhoneAndCreateUser_wrongOtp_throws() {
        OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
                .provider("facebook").providerUserId("fb-1")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(ticketService.peek("pending-1")).thenReturn(pending);
        doThrow(new vn.ShuttleHub.backend.auth.exception.OtpInvalidException("Mã OTP sai."))
                .when(otpService).verifyOtp(anyString(), anyString());

        assertThrows(vn.ShuttleHub.backend.auth.exception.OtpInvalidException.class,
                () -> service.verifyPhoneAndCreateUser("pending-1", "84912345678", "000000"));

        verify(userRepo, never()).save(any());
        verify(ticketService, never()).attachUser(anyString(), anyString());
    }

    @Test
    @DisplayName("Email tạm phải UNIQUE — 2 providerUserId khác nhau (kể cả khi sanitize giống nhau)")
    void buildTempEmail_isUniquePerProviderUserId() {
        // Ràng buộc UNIQUE của users.email phải được bảo đảm.
        assertNotEquals(
                service.buildTempEmail("fb-1"),
                service.buildTempEmail("fb1"));
        assertNotEquals(
                service.buildTempEmail("fb-1"),
                service.buildTempEmail("fb-2"));
        assertTrue(service.buildTempEmail("fb-1").endsWith("@facebook.local"));
        // Độ dài phải ≤ 100 (cột users.email)
        assertTrue(service.buildTempEmail("fb-1").length() <= 100);
    }

    // ---- avatar ----

    @Test
    @DisplayName("Facebook + email mới → user mới lưu avatar_url")
    void facebook_withEmail_savesAvatar() {
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.empty());
        when(userRepo.findByEmail("newfb@x.com")).thenReturn(Optional.empty());
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-fb");
            return u;
        });
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t-fb");

        service.handleCallback(new OAuthUserInfo(
                "facebook", "fb-1", "newfb@x.com", false, "Kieu Van Son", "https://cdn.fb/son.jpg"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("https://cdn.fb/son.jpg", captor.getValue().getAvatarUrl());
    }

    @Test
    @DisplayName("Facebook đăng nhập lại → avatar_url được cập nhật nếu URL mới")
    void facebook_relogin_updatesAvatar() {
        OAuthAccount link = OAuthAccount.builder().id("oa-1").userId("u-1")
                .provider("facebook").providerUserId("fb-1")
                .emailAtRegistration("a@x.com").createdAt(LocalDateTime.now()).build();
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.of(link));
        User u = User.builder().id("u-1").email("a@x.com").username("u1")
                .password("h").role(Role.CUSTOMER).isActive(true)
                .avatarUrl("https://cdn.fb/old.jpg").build();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t4");

        service.handleCallback(new OAuthUserInfo(
                "facebook", "fb-1", "a@x.com", false, "Kieu Van Son", "https://cdn.fb/new.jpg"));

        assertEquals("https://cdn.fb/new.jpg", u.getAvatarUrl());
    }

    @Test
    @DisplayName("Facebook đăng nhập lại nhưng provider KHÔNG trả avatar → giữ ảnh cũ")
    void facebook_relogin_keepsOldAvatarWhenProviderOmitsIt() {
        OAuthAccount link = OAuthAccount.builder().id("oa-1").userId("u-1")
                .provider("facebook").providerUserId("fb-1")
                .emailAtRegistration("a@x.com").createdAt(LocalDateTime.now()).build();
        when(oauthAccountRepo.findByProviderAndProviderUserId("facebook", "fb-1"))
                .thenReturn(Optional.of(link));
        User u = User.builder().id("u-1").email("a@x.com").username("u1")
                .password("h").role(Role.CUSTOMER).isActive(true)
                .avatarUrl("https://cdn.fb/old.jpg").build();
        when(userRepo.findById("u-1")).thenReturn(Optional.of(u));
        when(ticketService.issueForUser(anyString(), anyString(), anyString())).thenReturn("t5");

        service.handleCallback(new OAuthUserInfo(
                "facebook", "fb-1", "a@x.com", false, "Kieu Van Son", null));

        assertEquals("https://cdn.fb/old.jpg", u.getAvatarUrl());
    }

    @Test
    @DisplayName("Verify SĐT: user mới lưu avatar lấy từ ticket chờ")
    void verifyPhoneAndCreateUser_savesAvatarFromTicket() {
        OAuthTicket pending = OAuthTicket.builder().ticket("pending-1").userId(null)
                .provider("facebook").providerUserId("fb-1").fullName("Kieu Van Son")
                .avatarUrl("https://cdn.fb/son.jpg")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build();
        when(ticketService.peek("pending-1")).thenReturn(pending);
        when(userRepo.existsByPhoneNumber("84912345678")).thenReturn(false);
        when(userRepo.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("u-fb");
            return u;
        });

        service.verifyPhoneAndCreateUser("pending-1", "84912345678", "123456");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("https://cdn.fb/son.jpg", captor.getValue().getAvatarUrl());
    }
}

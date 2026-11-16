package vn.ShuttleHub.backend.auth.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.ShuttleHub.backend.entity.OAuthAccount;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.entity.OtpCode;
import vn.ShuttleHub.backend.entity.Role;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.OAuthAccountRepository;
import vn.ShuttleHub.backend.repository.OAuthTicketRepository;
import vn.ShuttleHub.backend.repository.OtpCodeRepository;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test cho luồng OAuth end-to-end (tầng HTTP).
 *
 * ⚠️ Vì sao cần test này?
 * Các unit test trước đó chỉ cover tầng service. Lỗi thật (như
 * `ClientRegistrationRepository` bị Spring MVC bind nhầm thành
 * `@ModelAttribute`) chỉ xuất hiện ở tầng HTTP → phải có test gọi thật
 * qua MockMvc mới bắt được.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OAuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * ⚠️ Tự tạo mapper thay vì @Autowired — Jackson 3 (tools.jackson) của
     * Spring Boot 4 không đảm bảo expose bean `ObjectMapper` trong mọi
     * profile, và ta chỉ dùng để serialize/parse JSON test.
     */
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private OAuthTicketRepository ticketRepo;

    @Autowired
    private OAuthAccountRepository accountRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private OtpCodeRepository otpRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Tạo user test với email/username/phone DUY NHẤT theo thời điểm chạy.
     *
     * ⚠️ Vì sao cần duy nhất?
     * Test `facebookComplete_duplicateEmail_conflict` chạy với
     * `Propagation.NOT_SUPPORTED` (để `verifyOtp` REQUIRES_NEW nhìn thấy
     * OTP chưa commit) → dữ liệu được commit thật vào DB. Nếu dùng
     * username cố định → lần chạy thứ 2 sẽ vi phạm UNIQUE constraint.
     */
    private User createUser(String prefix) {
        String suffix = Long.toString(System.nanoTime(), 36);
        return userRepo.save(User.builder()
                .username(prefix + "_" + suffix)
                .email(prefix + "_" + suffix + "@x.com")
                .password(passwordEncoder.encode("secret123"))
                .fullName("Nguyen Van A")
                .phoneNumber("84" + Math.abs((long) suffix.hashCode() % 1000000000L))
                .role(Role.CUSTOMER)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private String ticketPayload(String ticket) throws Exception {
        return objectMapper.writeValueAsString(Map.of("ticket", ticket));
    }

    @Test
    @DisplayName("GET /api/auth/oauth/providers → luôn 200, trả danh sách provider đang bật")
    void providers_returns200() throws Exception {
        mockMvc.perform(get("/api/auth/oauth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.providers").isArray());
    }

    @Test
    @DisplayName("GET /api/auth/oauth/ticket/{t} với ticket không tồn tại → 401, KHÔNG lộ chi tiết")
    void ticket_unknown_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/oauth/ticket/khong-ton-tai"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("Ticket READY → GET status trả READY, POST exchange trả access + refresh token")
    void exchange_readyTicket_returnsTokens() throws Exception {
        User u = createUser("oauthready");
        String ticket = "it-test-ready-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(u.getId()).provider("google")
                .providerUserId("sub-" + ticket).fullName(null)
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        mockMvc.perform(get("/api/auth/oauth/ticket/" + ticket))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"))
                .andExpect(jsonPath("$.data.provider").value("google"));

        String body = mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketPayload(ticket)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value(u.getEmail()))
                .andReturn().getResponse().getContentAsString();

        JsonNode data = objectMapper.readTree(body).get("data");
        String accessToken = data.get("accessToken").asText();

        // Access token phải dùng được cho endpoint có JWT
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(u.getEmail()));
    }

    @Test
    @DisplayName("Ticket dùng 2 lần → lần 2 bị từ chối (single-use)")
    void exchange_usedTwice_secondFails() throws Exception {
        User u = createUser("oauthtwice");
        String ticket = "it-test-twice-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(u.getId()).provider("google")
                .providerUserId("sub-" + ticket)
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        String payload = ticketPayload(ticket);
        mockMvc.perform(post("/api/auth/oauth/exchange")
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/oauth/exchange")
                .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Ticket NEEDS_PHONE (chưa có user) → GET status trả NEEDS_PHONE, exchange bị chặn")
    void exchange_pendingTicket_blocked() throws Exception {
        String ticket = "it-test-pending-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(null).provider("facebook")
                .providerUserId("fb-" + ticket).fullName("Nguyen Van B")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        mockMvc.perform(get("/api/auth/oauth/ticket/" + ticket))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("NEEDS_PHONE"))
                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van B"));

        mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON).content(ticketPayload(ticket)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Ticket hết hạn → 401")
    void exchange_expiredTicket_rejected() throws Exception {
        User u = createUser("oauthexpired");
        String ticket = "it-test-expired-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(u.getId()).provider("google")
                .providerUserId("sub-" + ticket)
                .expiresAt(LocalDateTime.now().minusSeconds(10)).used(false)
                .createdAt(LocalDateTime.now()).build());

        mockMvc.perform(post("/api/auth/oauth/exchange")
                .contentType(MediaType.APPLICATION_JSON).content(ticketPayload(ticket)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Verify SĐT: OTP sai → 401 trước, KHÔNG tạo user")
    void phoneVerify_wrongOtp_unauthorized() throws Exception {
        String ticket = "it-test-fb-otp-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(null).provider("facebook")
                .providerUserId("fb-" + ticket).fullName("A")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        // ⚠️ Sinh SĐT ĐÚNG 11 chữ số E.164 ("84" + 9 số).
        //   Dùng nanoTime() % 1e8 có thể ra 7 chữ số → tổng 10 số → không
        //   phải E.164 hợp lệ → endpoint trả 400 → test fail ngẫu nhiên.
        String phone = "849" + String.format("%08d", Math.abs(System.nanoTime() % 100000000L));
        mockMvc.perform(post("/api/auth/oauth/phone/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "ticket", ticket,
                                "phone", phone,
                                "otp", "000000"))))
                .andExpect(status().isUnauthorized());

        assertTrue(userRepo.findByPhoneNumber(phone).isEmpty());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("Verify SĐT: hợp lệ → tạo user + email tạm + link oauth_account + ticket thành READY")
    void phoneVerify_happyPath_upgradesTicket() throws Exception {
        String ticket = "it-test-fb-ok-" + System.nanoTime();
        ticketRepo.save(OAuthTicket.builder()
                .ticket(ticket).userId(null).provider("facebook")
                .providerUserId("fb-ok-" + ticket).fullName("Nguyen Van C")
                .expiresAt(LocalDateTime.now().plusSeconds(60)).used(false)
                .createdAt(LocalDateTime.now()).build());

        // ⚠️ Sinh SĐT ĐÚNG 11 chữ số E.164 — xem giải thích ở test trên.
        String phone = "848" + String.format("%08d", Math.abs(System.nanoTime() % 100000000L));
        otpRepo.save(OtpCode.builder()
                .phone(phone)
                .codeHash(passwordEncoder.encode("123456"))
                .used(false)
                .expiresAt(LocalDateTime.now().plusSeconds(300))
                .attemptCount(0)
                .createdAt(LocalDateTime.now())
                .build());

        mockMvc.perform(post("/api/auth/oauth/phone/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "ticket", ticket,
                                "phone", phone,
                                "otp", "123456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").isNotEmpty());

        // User đã tạo với SĐT chuẩn hoá + email tạm
        User created = userRepo.findByPhoneNumber(phone).orElseThrow();
        assertEquals(phone, created.getPhoneNumber());
        assertTrue(created.getEmail().endsWith("@facebook.local"));

        // oauth_account đã link đúng provider + providerUserId
        var link = accountRepo.findByProviderAndProviderUserId("facebook", "fb-ok-" + ticket);
        assertTrue(link.isPresent());
        assertEquals(created.getId(), link.get().getUserId());

        // Ticket đã READY → đổi được JWT
        mockMvc.perform(get("/api/auth/oauth/ticket/" + ticket))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"));

        mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON).content(ticketPayload(ticket)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value(created.getEmail()));
    }

    @Test
    @DisplayName("Endpoint không tồn tại → 404, KHÔNG phải 500")
    void unknownEndpoint_returns404() throws Exception {
        mockMvc.perform(post("/api/auth/oauth/facebook/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @DisplayName("oauth_accounts liên kết đúng user + provider + providerUserId")
    void oauthAccount_linkedCorrectly() throws Exception {
        User u = createUser("linkcheck");
        accountRepo.save(OAuthAccount.builder()
                .userId(u.getId()).provider("google").providerUserId("sub-link")
                .emailAtRegistration(u.getEmail())
                .createdAt(LocalDateTime.now()).build());

        var found = accountRepo.findByProviderAndProviderUserId("google", "sub-link");
        assertTrue(found.isPresent());
        assertEquals(u.getId(), found.get().getUserId());
    }
}

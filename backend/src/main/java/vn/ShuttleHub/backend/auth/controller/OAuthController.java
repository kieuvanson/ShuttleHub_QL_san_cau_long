package vn.ShuttleHub.backend.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.ShuttleHub.backend.auth.dto.ApiResponse;
import vn.ShuttleHub.backend.auth.dto.AuthResponse;
import vn.ShuttleHub.backend.auth.dto.OAuthPhoneVerifyRequest;
import vn.ShuttleHub.backend.auth.dto.OAuthExchangeRequest;
import vn.ShuttleHub.backend.auth.dto.OAuthTicketStatus;
import vn.ShuttleHub.backend.auth.exception.OAuthTicketException;
import vn.ShuttleHub.backend.auth.oauth.OAuthTicketService;
import vn.ShuttleHub.backend.auth.service.AuthService;
import vn.ShuttleHub.backend.auth.service.OAuthAuthService;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthTicketService ticketService;
    private final OAuthAuthService oauthAuthService;
    private final AuthService authService;
    private final UserRepository userRepo;

    /**
     * Repository chứa các provider OAuth đang được bật.
     *
     * ⚠️ Inject bằng CONSTRUCTOR (không phải method parameter) — nếu để ở
     * method parameter, Spring MVC sẽ coi nó là `@ModelAttribute` và cố bind
     * từ query string → lỗi `IllegalStateException: No primary or single
     * unique constructor found for interface ClientRegistrationRepository`.
     */
    private final ClientRegistrationRepository registrations;

    /**
     * Danh sách provider đang bật.
     *
     * ⚠️ Chỉ trả về provider có `client-id` khác rỗng — nếu chưa cấu hình
     * credential thì frontend ẨN nút tương ứng thay vì báo lỗi.
     *
     * ⚠️ Spring Security 7: `ClientRegistrationRepository` KHÔNG còn có
     * `findAll()` — interface chỉ có `findByRegistrationId`. Bean thực tế
     * implement `Iterable`, nên ta duyệt qua Iterable thay vì gọi findAll().
     */
    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> providers() {
        List<String> enabled = new ArrayList<>();
        if (registrations instanceof Iterable<?> iterable) {
            for (Object o : iterable) {
                if (o instanceof ClientRegistration r && clientIdNotBlank(r)) {
                    enabled.add(r.getRegistrationId());
                }
            }
        }
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of("providers", enabled)));
    }
    /**
     * Hỏi ticket này cần làm gì: đổi thẳng JWT hay phải hoàn thiện hồ sơ.
     */
    @GetMapping("/ticket/{ticket}")
    public ResponseEntity<ApiResponse<OAuthTicketStatus>> ticketStatus(@PathVariable String ticket) {
        OAuthTicket t = ticketService.peek(ticket);
        String status = t.getUserId() != null
                ? OAuthTicketStatus.READY
                : OAuthTicketStatus.NEEDS_PROFILE;
        return ResponseEntity.ok(ApiResponse.success("OK",
                new OAuthTicketStatus(status, t.getProvider(), t.getFullName())));
    }

    /**
     * Đổi ticket lấy access + refresh token.
     *
     * ⚠️ Đây là nơi DUY NHẤT JWT được trả về frontend — qua body của POST,
     * không phải qua URL.
     */
    @PostMapping("/exchange")
    public ResponseEntity<ApiResponse<AuthResponse>> exchange(
            @Valid @RequestBody OAuthExchangeRequest req
    ) {
        OAuthTicket t = ticketService.consume(req.ticket());
        User user = userRepo.findById(t.getUserId())
                .orElseThrow(() -> new OAuthTicketException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
        AuthResponse res = authService.issueTokens(user);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công.", res));
    }

    /**
     * Xác minh SĐT bằng OTP rồi tạo tài khoản — dùng khi Facebook không
     * chia sẻ email.
     */
    @PostMapping("/phone/verify")
    public ResponseEntity<ApiResponse<Map<String, String>>> phoneVerify(
            @Valid @RequestBody OAuthPhoneVerifyRequest req
    ) {
        String userId = oauthAuthService.verifyPhoneAndCreateUser(
                req.ticket(), req.phone(), req.otp());
        return ResponseEntity.ok(
                ApiResponse.success("Xác minh thành công.", Map.of("userId", userId)));
    }

    private static boolean clientIdNotBlank(ClientRegistration r) {
        return r.getClientId() != null && !r.getClientId().isBlank();
    }
}

package vn.ShuttleHub.backend.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfoExtractor;
import vn.ShuttleHub.backend.auth.service.OAuthAuthService;
import vn.ShuttleHub.backend.auth.service.OAuthLoginOutcome;

import java.io.IOException;

/**
 * Xử lý sau khi provider redirect về backend kèm authorization code.
 *
 * ⚠️ Chỉ truyền TICKET qua URL — KHÔNG truyền JWT.
 * URL nằm trong browser history + log server + Referer header.
 * Ticket dùng 1 lần, hết hạn 60s, không chứa PII → vô hại khi lọt.
 */
@Component
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {

    private final OAuthAuthService oauthAuthService;
    private final OAuthUserInfoExtractor extractor;
    private final String frontendRedirectUri;

    /**
     * ⚠️ Dùng constructor injection cho `frontendRedirectUri` (không phải
     * `@Value` trên field) — vì test instantiate class này trực tiếp, mà
     * `@Value` trên field sẽ không được set → luôn null.
     */
    public OAuthSuccessHandler(
            OAuthAuthService oauthAuthService,
            OAuthUserInfoExtractor extractor,
            @Value("${app.oauth.frontend-redirect-uri:http://localhost:5173}") String frontendRedirectUri
    ) {
        this.oauthAuthService = oauthAuthService;
        this.extractor = extractor;
        this.frontendRedirectUri = frontendRedirectUri;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String registrationId = resolveRegistrationId(authentication);

        OAuthUserInfo info = extractor.extract(oauth2User, registrationId);
        OAuthLoginOutcome outcome = oauthAuthService.handleCallback(info);

        String target = switch (outcome.status()) {
            case OAuthLoginOutcome.LOGGED_IN ->
                    frontendRedirectUri + "/oauth/callback?ticket=" + outcome.ticket();
            case OAuthLoginOutcome.NEEDS_PHONE ->
                    // Facebook không chia sẻ email → user phải xác minh SĐT
                    // bằng OTP trước khi ta tạo tài khoản.
                    frontendRedirectUri + "/oauth/facebook?ticket=" + outcome.ticket();
            default -> frontendRedirectUri + "/dang-nhap?error=oauth_failed";
        };

        response.sendRedirect(target);
    }

    /**
     * Lấy registrationId (tên provider) từ authentication.
     *
     * ⚠️ `request.getParameter("registrationId")` KHÔNG có trong luồng
     * authorization_code (param đó chỉ có ở bước authorize) → phải lấy từ
     * `OAuth2AuthenticationToken.getAuthorizedClientRegistrationId()`, đây
     * là nguồn đáng tin của Spring Security.
     */
    private String resolveRegistrationId(Authentication authentication) {
        if (authentication instanceof OAuth2AuthenticationToken token) {
            String id = token.getAuthorizedClientRegistrationId();
            if (id != null && !id.isBlank()) {
                return id;
            }
        }
        return "";
    }
}

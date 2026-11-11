package vn.ShuttleHub.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

import java.util.ArrayList;
import java.util.List;

/**
 * Tự build danh sách OAuth client registration.
 *
 * ⚠️ Vì sao KHÔNG dùng `spring.security.oauth2.client.registration.*`?
 *   Spring Boot 4.1 (Spring Security 7) ném `IllegalStateException:
 *   "Client id of registration 'google' must not be empty"` NGAY LÚC START
 *   nếu client-id rỗng. Mà ta cần app vẫn khởi động được khi user CHƯA
 *   đăng ký Google/Meta (chưa có credential).
 *   → Ta tự build ClientRegistration, chỉ thêm provider có client-id khác
 *     rỗng. Còn lại thì provider đó đơn giản là "chưa bật".
 *
 * ⚠️ Vì sao không dùng `CommonOAuth2Provider`?
 *   Bản mặc định của Spring cho Facebook dùng Graph API **v2.8** (đã lỗi
 *   thời từ 2019). Ta override sang version mới nhất (v27.0).
 */
@Configuration
public class OAuth2ClientConfig {

    @Value("${app.oauth.google.client-id:}")
    private String googleClientId;

    @Value("${app.oauth.google.client-secret:}")
    private String googleClientSecret;

    @Value("${app.oauth.facebook.client-id:}")
    private String facebookClientId;

    @Value("${app.oauth.facebook.client-secret:}")
    private String facebookClientSecret;

    @Value("${app.oauth.facebook.graph-version:v27.0}")
    private String facebookGraphVersion;

    /**
     * Danh sách provider đang bật.
     *
     * ⚠️ Bean luôn được tạo (kể cả rỗng) để `oauth2Login()` trong
     * SecurityConfig luôn tìm thấy repository. Nếu không có repository,
     * Spring Security sẽ ném lỗi lúc build filter chain.
     */
    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        List<ClientRegistration> registrations = new ArrayList<>();

        if (isNotBlank(googleClientId)) {
            registrations.add(buildGoogle());
        }
        if (isNotBlank(facebookClientId)) {
            registrations.add(buildFacebook());
        }

        return new OAuthClientRegistrationRepository(registrations);
    }

    private ClientRegistration buildGoogle() {
        return ClientRegistration.withRegistrationId("google")
                .clientId(googleClientId)
                .clientSecret(googleClientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("openid", "email", "profile")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://www.googleapis.com/oauth2/v4/token")
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .issuerUri("https://accounts.google.com")
                .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                .userNameAttributeName("sub")
                .clientName("Google")
                .build();
    }

    private ClientRegistration buildFacebook() {
        // ⚠️ Chuẩn hoá version về dạng "27.0" (bỏ tiền tố "v" nếu có).
        // Vì template URL đã chứa sẵn chữ "v" → nếu không bỏ sẽ ra "vv27.0"
        // và Facebook trả về lỗi.
        String v = facebookGraphVersion.trim().replaceFirst("^[vV]", "");
        return ClientRegistration.withRegistrationId("facebook")
                .clientId(facebookClientId)
                .clientSecret(facebookClientSecret)
                // Facebook yêu cầu client_secret trong BODY của token request,
                // không phải header Basic → phải dùng CLIENT_SECRET_POST.
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("email", "public_profile")
                .authorizationUri("https://www.facebook.com/v" + v + "/dialog/oauth")
                .tokenUri("https://graph.facebook.com/v" + v + "/oauth/access_token")
                .userInfoUri("https://graph.facebook.com/v" + v + "/me?fields=id,name,email")
                .userNameAttributeName("id")
                .clientName("Facebook")
                .build();
    }

    private boolean isNotBlank(String s) {
        return s != null && !s.isBlank();
    }
}

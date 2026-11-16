package vn.ShuttleHub.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test cấu hình OAuth client registration.
 *
 * ⚠️ Test quan trọng: `facebookVersion_doesNotDoublePrefixV`.
 * Lỗi thật: URL sinh ra là `facebook.com/vv27.0/dialog/oauth` (double "v")
 * vì property đã có "v" mà template lại thêm "v" nữa → Facebook trả 400.
 *
 * ⚠️ Spring Security 7: các getter URI đã chuyển xuống
 * `ClientRegistration.ProviderDetails` — `getAuthorizationUri()` không còn
 * tồn tại trực tiếp trên `ClientRegistration`.
 */
class OAuth2ClientConfigTest {

    private OAuth2ClientConfig configWith(String googleId, String fbId, String graphVersion) {
        OAuth2ClientConfig config = new OAuth2ClientConfig();
        ReflectionTestUtils.setField(config, "googleClientId", googleId);
        ReflectionTestUtils.setField(config, "googleClientSecret", "secret");
        ReflectionTestUtils.setField(config, "facebookClientId", fbId);
        ReflectionTestUtils.setField(config, "facebookClientSecret", "secret");
        ReflectionTestUtils.setField(config, "facebookGraphVersion", graphVersion);
        return config;
    }

    private static String authUri(ClientRegistration r) {
        return r.getProviderDetails().getAuthorizationUri();
    }

    private static String tokenUri(ClientRegistration r) {
        return r.getProviderDetails().getTokenUri();
    }

    private static String userInfoUri(ClientRegistration r) {
        return r.getProviderDetails().getUserInfoEndpoint().getUri();
    }

    @Test
    @DisplayName("Không có credential nào → repository rỗng, app vẫn khởi động được")
    void noCredentials_emptyRepository() {
        ClientRegistrationRepository repo =
                configWith("", "", "v27.0").clientRegistrationRepository();

        assertNotNull(repo);
        assertFalse(repo instanceof Iterable<?> iterable && iterable.iterator().hasNext(),
                "repository phải rỗng nhưng vẫn hợp lệ");
    }

    @Test
    @DisplayName("Có credential → provider tương ứng được đăng ký")
    void credentials_registerProviders() {
        ClientRegistrationRepository repo =
                configWith("gid", "fid", "v27.0").clientRegistrationRepository();

        assertNotNull(repo.findByRegistrationId("google"));
        assertNotNull(repo.findByRegistrationId("facebook"));
    }

    @Test
    @DisplayName("Graph API version KHÔNG bị double prefix 'v'")
    void facebookVersion_doesNotDoublePrefixV() {
        ClientRegistrationRepository repo =
                configWith("", "fid", "v27.0").clientRegistrationRepository();

        ClientRegistration fb = repo.findByRegistrationId("facebook");

        assertTrue(authUri(fb).contains("/v27.0/"),
                "authorizationUri sai: " + authUri(fb));
        assertFalse(authUri(fb).contains("vv"),
                "authorizationUri có double 'v': " + authUri(fb));
        assertTrue(tokenUri(fb).contains("/v27.0/"),
                "tokenUri sai: " + tokenUri(fb));
        assertTrue(userInfoUri(fb).contains("/v27.0/"),
                "userInfoUri sai: " + userInfoUri(fb));
    }

    @Test
    @DisplayName("Graph API version dạng '27.0' (không có 'v') → vẫn sinh URL đúng")
    void facebookVersion_withoutPrefixV() {
        ClientRegistrationRepository repo =
                configWith("", "fid", "27.0").clientRegistrationRepository();

        ClientRegistration fb = repo.findByRegistrationId("facebook");

        assertTrue(authUri(fb).contains("/v27.0/"),
                "authorizationUri sai: " + authUri(fb));
        assertFalse(authUri(fb).contains("vv"));
    }

    @Test
    @DisplayName("Google dùng scope openid+email+profile và redirect URI chuẩn")
    void google_standardConfig() {
        ClientRegistrationRepository repo =
                configWith("gid", "", "v27.0").clientRegistrationRepository();

        ClientRegistration g = repo.findByRegistrationId("google");

        assertTrue(g.getScopes().contains("openid"));
        assertTrue(g.getScopes().contains("email"));
        assertTrue(g.getScopes().contains("profile"));
        assertEquals("{baseUrl}/login/oauth2/code/{registrationId}", g.getRedirectUri());
        assertTrue(authUri(g).startsWith("https://accounts.google.com/"));
    }

    @Test
    @DisplayName("Facebook dùng CLIENT_SECRET_POST (Meta yêu cầu secret trong body)")
    void facebook_usesClientSecretPost() {
        ClientRegistrationRepository repo =
                configWith("", "fid", "v27.0").clientRegistrationRepository();

        ClientRegistration fb = repo.findByRegistrationId("facebook");

        assertEquals(ClientAuthenticationMethod.CLIENT_SECRET_POST,
                fb.getClientAuthenticationMethod());
    }

    @Test
    @DisplayName("Facebook: userInfoUri yêu cầu picture.type(large) để lấy ảnh đại diện")
    void facebook_userInfoUri_requestsPicture() {
        ClientRegistrationRepository repo =
                configWith("", "fid", "v27.0").clientRegistrationRepository();

        ClientRegistration fb = repo.findByRegistrationId("facebook");

        assertTrue(userInfoUri(fb).contains("picture.type(large)"),
                "userInfoUri phải yêu cầu picture: " + userInfoUri(fb));
    }
}

package vn.ShuttleHub.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;
import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfoExtractor;
import vn.ShuttleHub.backend.auth.service.OAuthAuthService;
import vn.ShuttleHub.backend.auth.service.OAuthLoginOutcome;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test OAuthSuccessHandler — nơi quyết định URL redirect về frontend.
 *
 * ⚠️ Test quan trọng nhất: URL redirect KHÔNG BAO GIỜ được chứa JWT.
 * Chỉ được chứa `ticket` (dùng 1 lần, hết hạn 60s).
 */
@ExtendWith(MockitoExtension.class)
class OAuthSuccessHandlerTest {

    @Mock
    private OAuthAuthService oauthAuthService;

    @Mock
    private OAuthUserInfoExtractor extractor;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    private OAuthSuccessHandler handler() {
        return new OAuthSuccessHandler(oauthAuthService, extractor, "http://localhost:5173");
    }

    private OAuth2User googleUser() {
        Map<String, Object> claims = Map.of(
                "sub", "sub-1", "email", "a@b.com", "email_verified", true, "name", "A");
        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")), claims, "sub");
    }

    private Authentication authWithRegistrationId(String registrationId) {
        OAuth2User user = googleUser();
        return new OAuth2AuthenticationToken(
                user, user.getAuthorities(), registrationId);
    }

    @Test
    @DisplayName("Callback thành công → redirect về FE kèm ticket, KHÔNG chứa JWT trong URL")
    void success_redirectsWithTicket() throws Exception {
        OAuthUserInfo info = new OAuthUserInfo("google", "sub-1", "a@b.com", true, "A");
        when(extractor.extract(any(), anyString())).thenReturn(info);
        when(oauthAuthService.handleCallback(info))
                .thenReturn(OAuthLoginOutcome.loggedIn(info, "u-1", "ticket-abc"));

        handler().onAuthenticationSuccess(request, response, authWithRegistrationId("google"));

        verify(response).sendRedirect("http://localhost:5173/oauth/callback?ticket=ticket-abc");
    }

    @Test
    @DisplayName("Facebook chưa có email → redirect về /oauth/facebook để verify SĐT")
    void success_needsPhone_redirectsToFacebookPage() throws Exception {
        OAuthUserInfo info = new OAuthUserInfo("facebook", "fb-1", null, false, "A");
        when(extractor.extract(any(), anyString())).thenReturn(info);
        when(oauthAuthService.handleCallback(info))
                .thenReturn(OAuthLoginOutcome.needsPhone(info, "pending-abc"));

        handler().onAuthenticationSuccess(request, response, authWithRegistrationId("facebook"));

        verify(response).sendRedirect("http://localhost:5173/oauth/facebook?ticket=pending-abc");
    }
}

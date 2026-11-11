package vn.ShuttleHub.backend.auth.oauth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test chuẩn hoá claim từ provider về OAuthUserInfo.
 *
 * ⚠️ Test quan trọng nhất: `facebook_neverVerified`.
 * Facebook KHÔNG cung cấp cờ email_verified. Nếu ta tin claim đó thì kẻ xấu
 * dùng một tài khoản Facebook bất kỳ (email trùng người khác) để chiếm đoạt
 * tài khoản. → Với Facebook, emailVerified LUÔN false.
 */
class OAuthUserInfoExtractorTest {

    private final OAuthUserInfoExtractor extractor = new OAuthUserInfoExtractor();

    private OAuth2User googleUser(Map<String, Object> claims) {
        return new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority("ROLE_USER", claims, "sub")), claims, "sub");
    }

    @Test
    @DisplayName("Google: email_verified=true (boolean) → emailVerified = true")
    void google_booleanTrue_verified() {
        OAuth2User u = googleUser(Map.of(
                "sub", "123",
                "email", "a@b.com",
                "email_verified", true,
                "name", "Nguyen Van A"));

        OAuthUserInfo info = extractor.extract(u, "google");

        assertEquals("google", info.provider());
        assertEquals("123", info.providerUserId());
        assertEquals("a@b.com", info.email());
        assertTrue(info.emailVerified());
        assertEquals("Nguyen Van A", info.fullName());
    }

    @Test
    @DisplayName("Google: email_verified là CHUỖI \"true\" → vẫn phải verified = true")
    void google_stringTrue_verified() {
        // ⚠️ Google đôi khi trả claim dạng string thay vì boolean.
        OAuth2User u = googleUser(Map.of(
                "sub", "123",
                "email", "a@b.com",
                "email_verified", "true",
                "name", "Nguyen Van A"));

        assertTrue(extractor.extract(u, "google").emailVerified());
    }

    @Test
    @DisplayName("Google: email_verified=false → emailVerified = false")
    void google_false_notVerified() {
        OAuth2User u = googleUser(Map.of(
                "sub", "123", "email", "a@b.com", "email_verified", false));

        assertFalse(extractor.extract(u, "google").emailVerified());
    }

    @Test
    @DisplayName("Google: thiếu email_verified → emailVerified = false (KHÔNG đoán)")
    void google_missingVerified_notVerified() {
        OAuth2User u = googleUser(Map.of("sub", "123", "email", "a@b.com"));

        assertFalse(extractor.extract(u, "google").emailVerified());
    }

    @Test
    @DisplayName("Facebook: KHÔNG BAO GIỜ verified, kể cả khi provider gửi email_verified=true")
    void facebook_neverVerified() {
        // ⚠️ Đây là bảo mật cốt lõi: Facebook không chứng minh được sở hữu
        // email. Nếu ta tin claim này thì kẻ xấu chiếm đoạt được tài khoản.
        OAuth2User u = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority("ROLE_USER",
                        Map.of("id", "fb-999"), "id")),
                Map.of("id", "fb-999", "email", "victim@b.com", "email_verified", true, "name", "Attacker"),
                "id");

        OAuthUserInfo info = extractor.extract(u, "facebook");

        assertEquals("facebook", info.provider());
        assertEquals("fb-999", info.providerUserId());
        assertFalse(info.emailVerified(), "Facebook KHÔNG BAO GIỜ được coi là đã xác minh email");
        assertEquals("victim@b.com", info.email());
    }

    @Test
    @DisplayName("Facebook: thiếu email → email = null (không lỗi)")
    void facebook_missingEmail_null() {
        OAuth2User u = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority("ROLE_USER", Map.of("id", "fb-999"), "id")),
                Map.of("id", "fb-999", "name", "Nam"),
                "id");

        OAuthUserInfo info = extractor.extract(u, "facebook");

        assertNull(info.email());
        assertEquals("Nam", info.fullName());
    }

    @Test
    @DisplayName("providerUserId lấy từ attributeName (Google=sub, Facebook=id)")
    void providerUserId_fromAttributeName() {
        OAuth2User u = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority("ROLE_USER", Map.of("id", "fb-777"), "id")),
                Map.of("id", "fb-777"),
                "id");

        assertEquals("fb-777", extractor.extract(u, "facebook").providerUserId());
    }
}

package vn.ShuttleHub.backend.auth.oauth;

import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * Chuyển dữ liệu thô từ provider về {@link OAuthUserInfo} đã chuẩn hoá.
 *
 * ⚠️ Quy tắc bảo mật cốt lõi:
 *   Chỉ provider trong {@link #TRUSTED_EMAIL_VERIFICATION_PROVIDERS} mới
 *   được coi là "email đã xác minh". Facebook KHÔNG có trong danh sách này
 *   vì Graph API không cung cấp cờ email_verified — nếu tin claim đó thì
 *   kẻ xấu có thể dùng một tài khoản Facebook bất kỳ để chiếm đoạt tài
 *   khoản của người khác (email trùng → tự động gộp → chiếm tài khoản).
 */
@Component
public class OAuthUserInfoExtractor {

    /**
     * Provider được phép coi là đã xác minh email.
     * Thêm provider mới vào đây ⇒ phải chắc chắn provider đó thực sự
     * xác minh quyền sở hữu email (có `email_verified` từ nguồn đáng tin).
     */
    private static final Set<String> TRUSTED_EMAIL_VERIFICATION_PROVIDERS =
            Set.of(OAuthUserInfo.GOOGLE);

    public OAuthUserInfo extract(OAuth2User user, String registrationId) {
        Map<String, Object> claims = user.getAttributes();

        String provider = registrationId == null ? "" : registrationId.toLowerCase();
        String providerUserId = resolveProviderUserId(user, claims);
        String email = asString(claims.get("email"));
        boolean emailVerified = resolveEmailVerified(provider, claims);
        String fullName = resolveFullName(claims);

        return new OAuthUserInfo(provider, providerUserId, email, emailVerified, fullName);
    }

    /**
     * ID user ở phía provider.
     *
     * ⚠️ Google dùng claim `sub`, Facebook dùng `id`. `user.getName()` trả về
     * giá trị của `userNameAttributeName` mà provider đã khai báo → dùng nó
     * là đúng nhất, fallback sang `sub` rồi `id`.
     */
    private String resolveProviderUserId(OAuth2User user, Map<String, Object> claims) {
        String name = user.getName();
        if (name != null && !name.isBlank()) {
            return name;
        }
        Object sub = claims.get("sub");
        if (sub != null) {
            return String.valueOf(sub);
        }
        Object id = claims.get("id");
        return id != null ? String.valueOf(id) : null;
    }

    /**
     * ⚠️ Chỉ provider tin cậy mới được trả về true.
     * Với provider khác → luôn false, bất kể provider gửi gì.
     */
    private boolean resolveEmailVerified(String provider, Map<String, Object> claims) {
        if (!TRUSTED_EMAIL_VERIFICATION_PROVIDERS.contains(provider)) {
            return false;
        }
        Object raw = claims.get("email_verified");
        if (raw instanceof Boolean b) {
            return b;
        }
        // Google đôi khi trả claim dạng chuỗi "true"/"false".
        if (raw instanceof String s) {
            return Boolean.parseBoolean(s.trim());
        }
        // Thiếu claim → KHÔNG đoán, coi như chưa xác minh.
        return false;
    }

    private String resolveFullName(Map<String, Object> claims) {
        Object name = claims.get("name");
        if (name == null) {
            return null;
        }
        String s = String.valueOf(name).trim();
        return s.isEmpty() ? null : s;
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }
}

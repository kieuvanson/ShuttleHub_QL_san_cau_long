package vn.ShuttleHub.backend.auth.oauth;

/**
 * Thông tin user đã chuẩn hoá từ provider.
 *
 * ⚠️ `emailVerified` là trường QUAN TRỌNG NHẤT — nó quyết định có được
 * phép gộp vào tài khoản đã tồn tại hay không. Chỉ Google trả trường này
 * một cách đáng tin cậy; Facebook luôn = false.
 */
public record OAuthUserInfo(
    String provider,
    String providerUserId,
    String email,
    boolean emailVerified,
    String fullName,
    String avatarUrl
) {
    /** Provider duy nhất được phép cung cấp cờ email_verified đáng tin. */
    public static final String GOOGLE = "google";
    public static final String FACEBOOK = "facebook";

    /**
     * Constructor 5 tham số — tương thích ngược cho provider không có
     * ảnh đại diện (Google không trả claim `picture`).
     */
    public OAuthUserInfo(String provider, String providerUserId, String email,
                         boolean emailVerified, String fullName) {
        this(provider, providerUserId, email, emailVerified, fullName, null);
    }
}

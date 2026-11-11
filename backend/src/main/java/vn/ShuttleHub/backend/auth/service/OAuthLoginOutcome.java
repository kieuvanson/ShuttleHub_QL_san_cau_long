package vn.ShuttleHub.backend.auth.service;

import vn.ShuttleHub.backend.auth.oauth.OAuthUserInfo;

/**
 * Kết quả xử lý OAuth callback.
 *
 * `status`:
 *   • "LOGGED_IN"     — đã có user → frontend đổi ticket lấy JWT.
 *   • "NEEDS_PROFILE" — Facebook lần đầu → user phải hoàn thiện hồ sơ.
 */
public record OAuthLoginOutcome(
        String status,
        OAuthUserInfo userInfo,
        String userId,
        String ticket
) {
    public static final String LOGGED_IN = "LOGGED_IN";
    public static final String NEEDS_PROFILE = "NEEDS_PROFILE";

    public static OAuthLoginOutcome loggedIn(OAuthUserInfo info, String userId, String ticket) {
        return new OAuthLoginOutcome(LOGGED_IN, info, userId, ticket);
    }

    public static OAuthLoginOutcome needsProfile(OAuthUserInfo info, String ticket) {
        return new OAuthLoginOutcome(NEEDS_PROFILE, info, null, ticket);
    }
}

package vn.ShuttleHub.backend.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Xử lý khi provider trả về lỗi (user từ chối cấp quyền, state sai...).
 *
 * ⚠️ KHÔNG đưa message gốc của provider vào URL — có thể chứa thông tin
 * nhạy cảm. Chỉ truyền mã lỗi ngắn gọn, frontend tự hiển thị tiếng Việt.
 */
@Component
public class OAuthFailureHandler implements AuthenticationFailureHandler {

    private final String frontendRedirectUri;

    public OAuthFailureHandler(
            @Value("${app.oauth.frontend-redirect-uri:http://localhost:5173}") String frontendRedirectUri
    ) {
        this.frontendRedirectUri = frontendRedirectUri;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException, ServletException {
        response.sendRedirect(frontendRedirectUri + "/dang-nhap?error=oauth_failed");
    }
}

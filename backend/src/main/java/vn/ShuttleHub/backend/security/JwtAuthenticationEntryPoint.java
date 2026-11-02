package vn.ShuttleHub.backend.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Trả 401 JSON thống nhất khi request tới endpoint yêu cầu auth
 * mà không có token hợp lệ (hoặc token sai/hết hạn).
 */
@Slf4j
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(
        jakarta.servlet.http.HttpServletRequest request,
        jakarta.servlet.http.HttpServletResponse response,
        AuthenticationException authException
    ) throws IOException {

        log.debug("401 Unauthorized: {} {}", request.getMethod(), request.getRequestURI());

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        String body = """
            {
              "code": 401,
              "message": "Bạn cần đăng nhập để tiếp tục.",
              "data": null
            }
            """;

        response.getWriter().write(body);
    }
}

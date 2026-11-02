package vn.ShuttleHub.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.ShuttleHub.backend.auth.service.JwtService;

import java.io.IOException;
import java.util.List;

/**
 * Filter xác thực JWT cho mỗi request.
 *
 * Luồng:
 *   1. Đọc header "Authorization: Bearer <token>"
 *   2. Parse + verify token (chữ ký, hạn, type phải là "access")
 *   3. Nếu hợp lệ → set SecurityContext (user đã đăng nhập)
 *   4. Nếu không hợp lệ → bỏ qua, để các rule trong SecurityConfig xử lý
 *      (endpoint permitAll vẫn qua được, endpoint yêu cầu auth sẽ trả 401)
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length()).trim();

            try {
                Claims claims = jwtService.parseAccessToken(token);

                String userId = claims.getSubject();
                String role = (String) claims.get("role");
                String email = (String) claims.get("email");

                // Chỉ set context nếu chưa có authentication (không ghi đè)
                if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    var authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + (role != null ? role : "CUSTOMER"))
                    );

                    var auth = new UsernamePasswordAuthenticationToken(
                        userId,       // principal = userId
                        null,         // credentials = null (đã xác thực rồi)
                        authorities
                    );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (JwtException | IllegalArgumentException ex) {
                // Token sai/hết hạn → không set context.
                // KHÔNG throw ở đây, để SecurityConfig quyết định 401 hay permit.
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}

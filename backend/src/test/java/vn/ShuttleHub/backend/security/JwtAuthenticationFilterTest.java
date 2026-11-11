package vn.ShuttleHub.backend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.ShuttleHub.backend.auth.service.JwtService;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test filter JWT: user bị khoá (isActive=false) KHÔNG được set vào
 * SecurityContext.
 *
 * ⚠️ Vì sao quan trọng?
 * Access token sống 15 phút. Nếu chủ sân khoá tài khoản (isActive=false)
 * mà filter không kiểm tra → user bị khoá vẫn dùng được token cũ thêm 15
 * phút (và có thể refresh token 7 ngày!). Đó là lỗ hổng soft-delete.
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepo;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    @Test
    @DisplayName("Token hợp lệ + user active → set SecurityContext")
    void filter_activeUser_setsAuthentication() throws Exception {
        io.jsonwebtoken.Claims claims = mockClaims("u1", "CUSTOMER");
        when(jwtService.parseAccessToken("tok")).thenReturn(claims);
        when(userRepo.findById("u1")).thenReturn(Optional.of(
                User.builder().id("u1").isActive(true).build()));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer tok");
        request.setRequestURI("/api/courts");

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
        });

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Token hợp lệ nhưng user đã bị khoá (isActive=false) → KHÔNG set SecurityContext")
    void filter_inactiveUser_doesNotSetAuthentication() throws Exception {
        io.jsonwebtoken.Claims claims = mockClaims("u1", "CUSTOMER");
        when(jwtService.parseAccessToken("tok")).thenReturn(claims);
        when(userRepo.findById("u1")).thenReturn(Optional.of(
                User.builder().id("u1").isActive(false).build()));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer tok");
        request.setRequestURI("/api/courts");

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
        });

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("User đã bị xoá khỏi DB → KHÔNG set SecurityContext")
    void filter_userNotFound_doesNotSetAuthentication() throws Exception {
        io.jsonwebtoken.Claims claims = mockClaims("u1", "CUSTOMER");
        when(jwtService.parseAccessToken("tok")).thenReturn(claims);
        when(userRepo.findById("u1")).thenReturn(Optional.empty());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer tok");
        request.setRequestURI("/api/courts");

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
        });

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Không có header Authorization → không gọi DB")
    void filter_noAuthHeader_doesNotQueryDb() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/courts");

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
        });

        verify(userRepo, never()).findById(anyString());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private io.jsonwebtoken.Claims mockClaims(String userId, String role) {
        io.jsonwebtoken.Claims claims = org.mockito.Mockito.mock(io.jsonwebtoken.Claims.class);
        when(claims.getSubject()).thenReturn(userId);
        when(claims.get("role")).thenReturn(role);
        when(claims.get("email")).thenReturn("a@b.com");
        return claims;
    }
}

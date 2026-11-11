package vn.ShuttleHub.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import vn.ShuttleHub.backend.security.JwtAccessDeniedHandler;
import vn.ShuttleHub.backend.security.JwtAuthenticationEntryPoint;
import vn.ShuttleHub.backend.security.JwtAuthenticationFilter;

import java.util.Arrays;
import java.util.List;

/**
 * Cấu hình bảo mật.
 *  • CSRF: tắt (API JSON + JWT trong header, không dùng cookie)
 *  • Session: STATELESS (mỗi request tự xác thực qua JWT)
 *  • CORS: cho phép frontend ở localhost:5173 (đọc từ app.cors.allowed-origins)
 *  • PasswordEncoder: BCrypt
 *  • JWT filter: chạy TRƯỚC UsernamePasswordAuthenticationFilter
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final OAuthSuccessHandler oauthSuccessHandler;
    private final OAuthFailureHandler oauthFailureHandler;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Preflight CORS — luôn cho phép
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // OAuth2: các endpoint do Spring Security xử lý (authorize + callback)
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/login/oauth2/code/**").permitAll()

                // Endpoint auth: không cần token
                .requestMatchers("/api/auth/send-otp").permitAll()
                .requestMatchers("/api/auth/register").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/refresh").permitAll()
                // OAuth: đổi ticket lấy token & tra cứu trạng thái ticket
                .requestMatchers("/api/auth/oauth/**").permitAll()

                // Health check
                .requestMatchers("/actuator/**").permitAll()

                // Mọi endpoint khác BẮT BUỘC có JWT hợp lệ
                .anyRequest().authenticated()
            )
            // OAuth2 login: provider redirect về /login/oauth2/code/{provider}
            .oauth2Login(oauth -> oauth
                .successHandler(oauthSuccessHandler)
                .failureHandler(oauthFailureHandler)
            )
            // JWT filter phải chạy trước filter xác thực mặc định
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();

        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(origins);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}

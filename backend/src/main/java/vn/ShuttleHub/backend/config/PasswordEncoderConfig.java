package vn.ShuttleHub.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Bean PasswordEncoder — TÁCH RIÊNG khỏi {@link SecurityConfig}.
 *
 * ⚠️ Vì sao phải tách?
 *   SecurityConfig khai báo field `OAuthSuccessHandler` → handler cần
 *   `OAuthAuthService` → service cần `PasswordEncoder`. Nếu bean
 *   `passwordEncoder` nằm trong SecurityConfig thì Spring tạo vòng lặp:
 *     SecurityConfig → OAuthSuccessHandler → OAuthAuthService → passwordEncoder
 *     (đang tạo SecurityConfig → "Requested bean is currently in creation")
 *   Tách ra class riêng → `passwordEncoder` không phụ thuộc SecurityConfig
 *   → vòng lặp được phá.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

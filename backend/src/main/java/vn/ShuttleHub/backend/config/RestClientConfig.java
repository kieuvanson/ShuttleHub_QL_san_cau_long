package vn.ShuttleHub.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Cấu hình HTTP client dùng để gọi API bên ngoài (SpeedSMS).
 *
 * ⚠️ Vì sao phải khai báo bean thủ công?
 * Spring Boot chỉ tự động cấu `RestClient.Builder` khi có module
 * `spring-boot-restclient` trên classpath. Dự án này không dùng module đó
 * (offline, không có artifact trong local repo) → nếu không khai báo ở đây,
 * `SpeedSmsSender` sẽ không khởi tạo được và app FAIL lúc start.
 *
 * `@ConditionalOnMissingBean` để nếu sau này thêm module auto-config,
 * bean của Spring Boot sẽ được dùng thay cho bean này (không bị trùng).
 */
@Configuration
public class RestClientConfig {

    @Bean
    @ConditionalOnMissingBean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }
}

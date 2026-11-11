package vn.ShuttleHub.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ⚠️ {@code @EnableScheduling} bật cơ chế job định kỳ của Spring
 * (dùng cho {@code AuthCleanupService} dọn refresh token hết hạn).
 * Không có annotation này thì các method {@code @Scheduled} sẽ không bao giờ
 * được gọi.
 */
@EnableScheduling
@SpringBootApplication(scanBasePackages = "vn.ShuttleHub")
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}

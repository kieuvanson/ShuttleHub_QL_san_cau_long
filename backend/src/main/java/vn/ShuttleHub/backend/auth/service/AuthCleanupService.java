package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.repository.RefreshTokenRepository;

import java.time.LocalDateTime;

/**
 * Dọn dữ liệu định kỳ các bảng auth.
 *
 * ⚠️ Vì sao cần job này?
 * `RefreshTokenRepository.deleteExpired()` đã được viết từ trước nhưng
 * KHÔNG có ai gọi → bảng `refresh_tokens` phình vô hạn theo thời gian.
 * → Đăng ký job `@Scheduled` để gọi định kỳ mỗi đêm.
 *
 * ⚠️ Vì sao không dùng trigger DB?
 * Trigger không ghi log, không báo cáo, và khó debug hơn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthCleanupService {

    private final RefreshTokenRepository refreshTokenRepo;

    /**
     * Xoá refresh token đã hết hạn — chạy mỗi ngày lúc 03:00.
     *
     * cron: giây phút giờ ngày-tháng-năm
     * → "0 0 3 * * *" = 03:00:00 mỗi ngày.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpiredRefreshTokens() {
        int deleted = refreshTokenRepo.deleteExpired(LocalDateTime.now());
        if (deleted > 0) {
            log.info("[Auth cleanup] Đã xoá {} refresh token hết hạn.", deleted);
        }
    }
}

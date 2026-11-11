package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.ShuttleHub.backend.repository.RefreshTokenRepository;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthCleanupServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepo;

    @InjectMocks
    private AuthCleanupService service;

    @Test
    @DisplayName("Job dọn gọi deleteExpired với thời điểm hiện tại")
    void purgeExpiredRefreshTokens_callsDeleteExpired() {
        when(refreshTokenRepo.deleteExpired(any())).thenReturn(5);

        service.purgeExpiredRefreshTokens();

        verify(refreshTokenRepo).deleteExpired(any());
    }
}

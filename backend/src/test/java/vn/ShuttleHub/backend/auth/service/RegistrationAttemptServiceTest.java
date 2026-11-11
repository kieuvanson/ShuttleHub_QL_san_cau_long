package vn.ShuttleHub.backend.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.ShuttleHub.backend.entity.RegistrationAttempt;
import vn.ShuttleHub.backend.repository.RegistrationAttemptRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegistrationAttemptServiceTest {

    @Mock
    private RegistrationAttemptRepository repo;

    @InjectMocks
    private RegistrationAttemptService service;

    @Test
    @DisplayName("Đếm lần đăng ký trong 24h → trả về kết quả từ repository")
    void countRegistrationsInLast24h_delegatesToRepository() {
        when(repo.countByPhoneAndCreatedAtAfter(anyString(), any())).thenReturn(2L);

        assertEquals(2L, service.countRegistrationsInLast24h("84912345678"));
    }

    @Test
    @DisplayName("Đếm → xoá dọn dòng cũ hơn 7 ngày trước (dọn lười)")
    void countRegistrationsInLast24h_deletesOldRowsFirst() {
        when(repo.countByPhoneAndCreatedAtAfter(anyString(), any())).thenReturn(0L);

        service.countRegistrationsInLast24h("84912345678");

        verify(repo, times(1)).deleteByPhoneAndCreatedAtBefore(eq("84912345678"), any());
    }

    @Test
    @DisplayName("Ghi lần đăng ký → lưu đúng SĐT + createdAt khác null")
    void recordRegistration_savesRowWithPhoneAndCreatedAt() {
        service.recordRegistration("84912345678");

        ArgumentCaptor<RegistrationAttempt> captor = ArgumentCaptor.forClass(RegistrationAttempt.class);
        verify(repo).save(captor.capture());

        RegistrationAttempt saved = captor.getValue();
        assertEquals("84912345678", saved.getPhone());
        assertNotNull(saved.getCreatedAt());
    }

    @Test
    @DisplayName("Ghi lần đăng ký KHÔNG tự xoá dòng cũ (chỉ đếm mới dọn)")
    void recordRegistration_doesNotDeleteOldRows() {
        service.recordRegistration("84912345678");

        verify(repo, never()).deleteByPhoneAndCreatedAtBefore(anyString(), any());
    }
}

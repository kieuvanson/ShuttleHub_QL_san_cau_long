package vn.ShuttleHub.backend.auth.oauth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.ShuttleHub.backend.auth.exception.OAuthTicketException;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.repository.OAuthTicketRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test cơ chế ticket dùng-một-lần.
 *
 * ⚠️ Test quan trọng nhất: `consume_twice_throws`.
 * Nếu ticket dùng được nhiều lần, kẻ xấu lấy được URL (qua log server,
 * Referer header, lịch sử trình duyệt) sẽ đổi được JWT nhiều lần.
 */
@ExtendWith(MockitoExtension.class)
class OAuthTicketServiceTest {

    @Mock
    private OAuthTicketRepository repo;

    private OAuthTicketService service;

    /**
     * ⚠️ Instantiate trực tiếp (không dùng `@InjectMocks`) vì service dùng
     * constructor injection cho `ttlSeconds` — Mockito không biết lấy giá
     * trị nào cho tham số `@Value`.
     */
    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new OAuthTicketService(repo, 60);
    }

    private OAuthTicket ticket(String userId, boolean used, LocalDateTime expiresAt) {
        return OAuthTicket.builder()
                .ticket("t1").userId(userId).provider("google")
                .providerUserId("s1").expiresAt(expiresAt).used(used)
                .createdAt(LocalDateTime.now()).build();
    }

    @Test
    @DisplayName("Sinh ticket chờ (Facebook) → userId null, hết hạn sau 60 giây")
    void issuePending_setsNullUserAndExpiry() {
        ArgumentCaptor<OAuthTicket> captor = ArgumentCaptor.forClass(OAuthTicket.class);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String ticket = service.issuePending("facebook", "pid-1", "Nguyen Van A");

        assertNotNull(ticket);
        assertTrue(ticket.length() >= 40, "ticket phải đủ dài để không đoán được");
        verify(repo).save(captor.capture());
        OAuthTicket saved = captor.getValue();
        assertNull(saved.getUserId());
        assertEquals("facebook", saved.getProvider());
        assertEquals("pid-1", saved.getProviderUserId());
        assertEquals("Nguyen Van A", saved.getFullName());
        assertFalse(saved.getUsed());
        assertTrue(saved.getExpiresAt().isAfter(LocalDateTime.now().plusSeconds(50)));
    }

    @Test
    @DisplayName("Sinh ticket đăng nhập (Google) → userId đã gắn")
    void issueForUser_setsUserId() {
        ArgumentCaptor<OAuthTicket> captor = ArgumentCaptor.forClass(OAuthTicket.class);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.issueForUser("user-1", "google", "sub-1");

        verify(repo).save(captor.capture());
        assertEquals("user-1", captor.getValue().getUserId());
    }

    @Test
    @DisplayName("Đổi ticket: đánh dấu used=true, trả về ticket")
    void consume_marksUsed() {
        OAuthTicket t = ticket("u1", false, LocalDateTime.now().plusSeconds(60));
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        OAuthTicket result = service.consume("t1");

        assertTrue(result.getUsed());
        verify(repo).save(t);
    }

    @Test
    @DisplayName("Đổi ticket lần 2 (đã used) → ném OAuthTicketException")
    void consume_twice_throws() {
        OAuthTicket t = ticket("u1", true, LocalDateTime.now().plusSeconds(60));
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        assertThrows(OAuthTicketException.class, () -> service.consume("t1"));
    }

    @Test
    @DisplayName("Ticket quá hạn (60s) → ném OAuthTicketException")
    void consume_expired_throws() {
        OAuthTicket t = ticket("u1", false, LocalDateTime.now().minusSeconds(1));
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        assertThrows(OAuthTicketException.class, () -> service.consume("t1"));
    }

    @Test
    @DisplayName("Ticket không tồn tại → ném OAuthTicketException")
    void consume_notFound_throws() {
        when(repo.findByTicket("khong")).thenReturn(Optional.empty());

        assertThrows(OAuthTicketException.class, () -> service.consume("khong"));
    }

    @Test
    @DisplayName("Ticket chờ (userId null) chưa đủ điều kiện đổi → ném OAuthTicketException")
    void consume_pendingTicket_throws() {
        OAuthTicket t = ticket(null, false, LocalDateTime.now().plusSeconds(60));
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        assertThrows(OAuthTicketException.class, () -> service.consume("t1"));
    }

    @Test
    @DisplayName("attachUser: nâng ticket chờ thành ticket đăng nhập")
    void attachUser_setsUserId() {
        OAuthTicket t = ticket(null, false, LocalDateTime.now().plusSeconds(60));
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        service.attachUser("t1", "user-9");

        assertEquals("user-9", t.getUserId());
        verify(repo).save(t);
    }

    @Test
    @DisplayName("peek KHÔNG đánh dấu used — đọc nhiều lần vẫn được")
    void peek_doesNotConsume() {
        OAuthTicket t = ticket("u1", false, LocalDateTime.now().plusSeconds(60));
        when(repo.findByTicket("t1")).thenReturn(Optional.of(t));

        service.peek("t1");
        service.peek("t1");

        assertFalse(t.getUsed());
        verify(repo, never()).save(t);
    }

    @Test
    @DisplayName("Message lỗi KHÔNG tiết lộ ticket nào còn tồn tại")
    void errorMessage_isGeneric() {
        when(repo.findByTicket("khong")).thenReturn(Optional.empty());

        OAuthTicketException ex = assertThrows(OAuthTicketException.class, () -> service.consume("khong"));

        assertEquals("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", ex.getMessage());
    }
}

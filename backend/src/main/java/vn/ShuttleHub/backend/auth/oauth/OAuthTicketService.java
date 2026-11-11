package vn.ShuttleHub.backend.auth.oauth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.exception.OAuthTicketException;
import vn.ShuttleHub.backend.entity.OAuthTicket;
import vn.ShuttleHub.backend.repository.OAuthTicketRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * Quản lý ticket dùng-một-lần để trao JWT cho frontend sau OAuth callback.
 *
 * ⚠️ Vì sao cần ticket thay vì đưa JWT vào URL?
 *   URL nằm trong browser history, log access của nginx/APM, và header
 *   Referer khi user bấm link ra ngoài. Ticket chỉ dùng được 1 lần,
 *   hết hạn sau 60 giây và không chứa PII → vô hại khi lọt.
 */
@Service
public class OAuthTicketService {

    /** Message chung — không tiết lộ trạng thái thật của ticket. */
    private static final String INVALID_MESSAGE = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.";

    private final OAuthTicketRepository repo;

    /** TTL của ticket (giây). */
    private final int ttlSeconds;

    private final SecureRandom random = new SecureRandom();

    /**
     * ⚠️ Dùng constructor injection cho `ttlSeconds` (không phải `@Value`
     * trên field) — vì unit test instantiate class này trực tiếp, mà
     * `@Value` trên field sẽ không được set → TTL = 0 → ticket hết hạn
     * ngay lập tức.
     */
    public OAuthTicketService(
            OAuthTicketRepository repo,
            @Value("${app.oauth.ticket-ttl-seconds:60}") int ttlSeconds
    ) {
        this.repo = repo;
        this.ttlSeconds = ttlSeconds;
    }

    /**
     * Sinh ticket CHỜ — dùng khi user chưa có tài khoản (Facebook cần hoàn
     * thiện hồ sơ). Ticket này KHÔNG đổi được JWT cho tới khi user hoàn
     * thiện hồ sơ và {@link #attachUser} được gọi.
     */
    @Transactional
    public String issuePending(String provider, String providerUserId, String fullName) {
        return save(provider, providerUserId, fullName, null);
    }

    /**
     * Sinh ticket ĐĂNG NHẬP — dùng khi đã xác định được user.
     */
    @Transactional
    public String issueForUser(String userId, String provider, String providerUserId) {
        return save(provider, providerUserId, null, userId);
    }

    private String save(String provider, String providerUserId, String fullName, String userId) {
        String ticket = generateTicket();
        repo.save(OAuthTicket.builder()
                .ticket(ticket)
                .userId(userId)
                .provider(provider)
                .providerUserId(providerUserId)
                .fullName(fullName)
                .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build());
        return ticket;
    }

    /**
     * Đọc ticket mà KHÔNG tiêu thụ — dùng để FE hỏi "ticket này cần làm gì?".
     */
    @Transactional(readOnly = true)
    public OAuthTicket peek(String ticket) {
        OAuthTicket t = repo.findByTicket(ticket)
                .orElseThrow(() -> new OAuthTicketException(INVALID_MESSAGE));
        assertUsable(t);
        return t;
    }

    /**
     * Tiêu thụ ticket — trả về ticket đã đánh dấu used=true.
     *
     * ⚠️ Đánh dấu used TRƯỚC khi trả về: nếu 2 request cùng lúc gọi,
     * request thứ 2 sẽ thấy used=true → bị từ chối. Đây là cơ chế
     * single-use.
     */
    @Transactional
    public OAuthTicket consume(String ticket) {
        OAuthTicket t = peek(ticket);
        if (t.getUserId() == null) {
            throw new OAuthTicketException("Vui lòng hoàn thiện thông tin trước khi tiếp tục.");
        }
        t.setUsed(true);
        repo.save(t);
        return t;
    }

    /**
     * Gắn user vào ticket đang chờ → biến nó thành ticket đăng nhập.
     */
    @Transactional
    public void attachUser(String ticket, String userId) {
        OAuthTicket t = repo.findByTicket(ticket)
                .orElseThrow(() -> new OAuthTicketException(INVALID_MESSAGE));
        assertUsable(t);
        t.setUserId(userId);
        repo.save(t);
    }

    /**
     * Kiểm tra ticket còn dùng được: chưa dùng + chưa hết hạn.
     */
    private void assertUsable(OAuthTicket t) {
        if (Boolean.TRUE.equals(t.getUsed())) {
            throw new OAuthTicketException(INVALID_MESSAGE);
        }
        if (t.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new OAuthTicketException(INVALID_MESSAGE);
        }
    }

    /**
     * Ticket = 32 byte ngẫu nhiên → base64url (43 ký tự).
     *
     * ⚠️ Dùng SecureRandom (CSPRNG), KHÔNG dùng UUID v4 — một số JDK sinh
     * UUID từ Math.random, không đủ mạnh cho bearer token.
     */
    private String generateTicket() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

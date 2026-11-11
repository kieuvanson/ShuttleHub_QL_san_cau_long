package vn.ShuttleHub.backend.auth.exception;

/**
 * Ticket OAuth không hợp lệ: không tồn tại, đã dùng, hoặc hết hạn.
 *
 * ⚠️ Message cố tình CHUNG chung ("không hợp lệ hoặc đã hết hạn") — không
 * tiết lộ ticket nào còn tồn tại, tránh việc kẻ xấu dò xem ticket họ đoán
 * ra đã hết hạn hay chưa.
 */
public class OAuthTicketException extends RuntimeException {
    public OAuthTicketException(String message) {
        super(message);
    }
}

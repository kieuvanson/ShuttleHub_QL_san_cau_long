package vn.ShuttleHub.backend.auth.exception;

/**
 * Lỗi khi không gửi được SMS (thiếu token, số điện thoại sai, API lỗi...).
 *
 * Khác với OTP sai: đây là lỗi HỆ THỐNG, user không nhập sai gì cả.
 * → HTTP 503 (Service Unavailable) để client biết có thể thử lại sau.
 */
public class SmsSendException extends RuntimeException {

    public SmsSendException(String message) {
        super(message);
    }
}

package vn.ShuttleHub.backend.auth.exception;

/**
 * Lỗi nghiệp vụ 400 — request đúng format nhưng thiếu/thừa thông tin.
 *
 * ⚠️ Vì sao không dùng {@link InvalidCredentialsException}?
 *   Exception đó map về 401 (sai credentials). Lỗi "thiếu OTP khi đổi hồ sơ"
 *   không phải lỗi xác thực — user ĐÃ đăng nhập rồi, chỉ là request thiếu
 *   thông tin → phải là 400.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}

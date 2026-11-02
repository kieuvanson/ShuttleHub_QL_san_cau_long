package vn.ShuttleHub.backend.auth.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import vn.ShuttleHub.backend.auth.dto.ApiResponse;

import java.util.stream.Collectors;

/**
 * Bắt mọi exception trong controller và trả về ApiResponse thống nhất.
 *  • 400: validation fail
 *  • 401: sai credentials / OTP
 *  • 409: email/username đã tồn tại
 *  • 429: rate limit (spam OTP)
 *  • 500: lỗi server không mong đợi
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(ApiResponse.error(400, message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleConstraint(ConstraintViolationException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(400, ex.getMessage()));
    }

    @ExceptionHandler(OtpInvalidException.class)
    public ResponseEntity<ApiResponse<Object>> handleOtp(OtpInvalidException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(401, ex.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleAuth(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(401, ex.getMessage()));
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ApiResponse<Object>> handleConflict(EmailAlreadyExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(409, ex.getMessage()));
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ApiResponse<Object>> handleRateLimit(RateLimitException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error(429, ex.getMessage()));
    }

    /**
     * Lỗi gửi SMS → 503 (lỗi dịch vụ ngoài, user có thể thử lại).
     */
    @ExceptionHandler(SmsSendException.class)
    public ResponseEntity<ApiResponse<Object>> handleSms(SmsSendException ex) {
        log.warn("Gửi SMS thất bại: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(ApiResponse.error(503, ex.getMessage()));
    }

    /**
     * JSON body không parse được (thiếu dấu ", sai kiểu, body rỗng...).
     *
     * ⚠️ Trước đây lỗi này rơi vào handler 500 → client tưởng server hỏng.
     * Đúng ra phải là 400: "bạn gửi dữ liệu sai", không phải "lỗi hệ thống".
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        log.debug("Body không đọc được: {}", ex.getMessage());
        return ResponseEntity.badRequest()
            .body(ApiResponse.error(400, "Dữ liệu gửi lên không đúng định dạng."));
    }

    /**
     * Lỗi 500: KHÔNG trả message gốc cho client.
     *
     * ⚠️ `ex.getMessage()` có thể chứa thông tin nhạy cảm:
     *    • tên bảng, cột, câu SQL (SQL injection info leak)
     *    • đường dẫn file trên server
     *    • tên class, tên bean
     * Attacker đọc được → hiểu cấu trúc DB → tấn công tiếp.
     *
     * → Chỉ log ra server, trả về client message chung chung.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleAll(Exception ex) {
        log.error("Lỗi server không mong đợi", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(500, "Đã xảy ra lỗi. Vui lòng thử lại sau."));
    }
}

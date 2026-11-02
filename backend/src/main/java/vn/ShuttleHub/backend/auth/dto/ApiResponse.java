package vn.ShuttleHub.backend.auth.dto;

/**
 * Wrapper chuẩn cho mọi response từ BE.
 * FE sẽ đọc `code` để biết thành công/thất bại,
 * `message` để hiển thị, `data` chứa payload.
 */
public record ApiResponse<T>(
    int code,
    String message,
    T data
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "Success", data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(200, message, data);
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}

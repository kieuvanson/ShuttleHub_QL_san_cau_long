package vn.ShuttleHub.backend.auth.sms;

/**
 * Kết quả gửi SMS.
 *
 * ⚠️ Vì sao dùng record thay vì boolean?
 * Provider trả về nhiều lý do thất bại (hết tiền, IP bị khoá, số sai…)
 * — mỗi lý do cần một message tiếng Việt KHÁC NHAU cho user.
 * boolean chỉ nói "thất bại" → user không biết phải làm gì.
 */
public record SmsSendResult(
    boolean success,
    String errorCode,
    String errorMessage
) {

    /** Gửi thành công. */
    public static SmsSendResult ok() {
        return new SmsSendResult(true, null, null);
    }

    /**
     * Gửi thất bại.
     *
     * @param errorCode    mã lỗi từ nhà cung cấp (để log/debug server)
     * @param errorMessage message tiếng Việt hiển thị cho user
     */
    public static SmsSendResult fail(String errorCode, String errorMessage) {
        return new SmsSendResult(false, errorCode, errorMessage);
    }
}

package vn.ShuttleHub.backend.auth.sms;

/**
 * Interface gửi tin nhắn OTP.
 *
 * ⚠️ Vì sao có interface?
 * Tách "gửi SMS" khỏi "luồng đăng ký" để:
 *   1. Đổi nhà cung cấp SMS chỉ cần thêm 1 class + 1 dòng config.
 *   2. Có bản mock để dev/test trọn luồng mà KHÔNG tốn tiền tin nhắn.
 */
public interface SmsSender {

    /**
     * Gửi mã OTP tới số điện thoại.
     *
     * @param phone   số điện thoại đã chuẩn hoá E.164 (84912345678)
     * @param otpCode mã OTP (6 chữ số)
     * @return kết quả gửi, KHÔNG ném exception ra ngoài — lý do thất bại
     *         được mang trong {@link SmsSendResult}
     */
    SmsSendResult sendOtp(String phone, String otpCode);

    /**
     * Provider có lộ mã OTP ra HTTP response không?
     *
     * ⚠️ CHỈ mock mới trả true. Ở production, mã OTP tuyệt đối KHÔNG được
     * xuất hiện trong response — nếu không, bất kỳ ai cũng đăng ký được
     * tài khoản mà không cần nhận tin nhắn.
     */
    default boolean exposesCode() {
        return false;
    }
}

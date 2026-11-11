package vn.ShuttleHub.backend.auth.sms;

import java.util.Map;

/**
 * Bảng ánh xạ error code của SpeedSMS → message tiếng Việt cho user.
 *
 * ⚠️ Vì sao cần?
 * SpeedSMS trả về mã lỗi cụ thể (hết tiền, IP bị khoá, số sai…). Nếu đưa
 * thẳng message của SpeedSMS cho user, họ sẽ thấy tiếng Anh kỹ thuật
 * ("Your account balance not enough to send sms") và không biết phải làm gì.
 * → Map sang message tiếng Việt nói rõ nguyên nhân + hành động.
 */
public final class SmsErrorMessages {

    private SmsErrorMessages() {
        // Class tiện ích chỉ có hằng + hàm tĩnh.
    }

    /** Lỗi chung — không rõ nguyên nhân cụ thể. */
    private static final String DEFAULT_MESSAGE =
            "Không thể gửi mã xác nhận. Vui lòng thử lại sau.";

    /** Tài khoản/IP bị chặn ở phía nhà cung cấp — lỗi tạm thời. */
    private static final String UNAVAILABLE_MESSAGE =
            "Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.";

    private static final Map<String, String> BY_CODE = Map.ofEntries(
            Map.entry("007", UNAVAILABLE_MESSAGE),   // IP locked
            Map.entry("008", UNAVAILABLE_MESSAGE),   // Account blocked
            Map.entry("009", UNAVAILABLE_MESSAGE),   // Account not allow to call API
            Map.entry("101", DEFAULT_MESSAGE),       // Invalid or missing parameters
            Map.entry("105", "Số điện thoại không hợp lệ."),
            Map.entry("110", "Nội dung tin nhắn không được hỗ trợ. Vui lòng thử lại sau."),
            Map.entry("113", "Nội dung tin nhắn quá dài."),
            Map.entry("300", "Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau."),
            Map.entry("500", DEFAULT_MESSAGE)        // Internal error
    );

    /**
     * Lấy message tiếng Việt theo error code của SpeedSMS.
     *
     * @param code mã lỗi (có thể null)
     * @return message tiếng Việt, không bao giờ null
     */
    public static String forCode(String code) {
        if (code == null) {
            return DEFAULT_MESSAGE;
        }
        return BY_CODE.getOrDefault(code.trim(), DEFAULT_MESSAGE);
    }
}

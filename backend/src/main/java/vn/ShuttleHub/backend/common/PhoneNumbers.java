package vn.ShuttleHub.backend.common;

/**
 * Chuẩn hoá số điện thoại Việt Nam về định dạng E.164 (84912345678).
 *
 * ⚠️ Vì sao cần class này?
 * Nếu lưu số điện thoại "nguyên văn" như user gõ, cùng một người có thể
 * tồn tại dưới nhiều dạng: "0912345678", "+84912345678", "0912 345 678"…
 * Hậu quả:
 *   1. OTP không khớp — gửi mã bằng "+84912345678" nhưng đăng ký bằng
 *      "0912345678" → "Mã OTP không tồn tại" dù user nhận đúng mã.
 *   2. Đăng ký trùng — cùng 1 số nhưng 2 cách viết → 2 tài khoản.
 *
 * → Chuẩn hoá tại BIÊN (compact constructor của record DTO), giống cách
 *   đang chuẩn hoá email. Mọi thứ về sau chỉ thấy 1 dạng duy nhất.
 */
public final class PhoneNumbers {

    private PhoneNumbers() {
        // Class tiện ích chỉ có hàm tĩnh → không cho khởi tạo.
    }

    /** Số chữ số của số di động Việt Nam (bỏ mã quốc gia và số 0 đầu). */
    public static final int VN_MOBILE_DIGITS = 9;

    /** Mã quốc gia Việt Nam. */
    private static final String COUNTRY_CODE = "84";

    /**
     * Chuẩn hoá số điện thoại về E.164.
     *
     * @return dạng "84" + 9 chữ số, hoặc {@code null} nếu sai định dạng
     *         (để Bean Validation bắt lỗi với message tiếng Việt).
     */
    public static String normalize(String phone) {
        if (phone == null) {
            return null;
        }

        // Bỏ mọi ký tự không phải số: xử lý được "+", khoảng trắng,
        // gạch nối, dấu chấm.
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return null;
        }

        // 11 chữ số bắt đầu "84" → đã là E.164
        if (digits.length() == 11 && digits.startsWith(COUNTRY_CODE)) {
            return digits;
        }

        // 12 chữ số bắt đầu "840" → số 10 số kiểu cũ (bỏ số 0 ở vị trí 3)
        if (digits.length() == 12 && digits.startsWith(COUNTRY_CODE + "0")) {
            return COUNTRY_CODE + digits.substring(3);
        }

        // 10 chữ số bắt đầu "0" → bỏ số 0 đầu, thêm mã quốc gia
        if (digits.length() == 10 && digits.startsWith("0")) {
            return COUNTRY_CODE + digits.substring(1);
        }

        // 11 chữ số bắt đầu "0" → số 10 số kiểu cũ, lấy 9 chữ số kế tiếp
        if (digits.length() == 11 && digits.startsWith("0")) {
            return COUNTRY_CODE + digits.substring(1, 1 + VN_MOBILE_DIGITS);
        }

        // 9 chữ số bắt đầu "9" → thêm mã quốc gia
        if (digits.length() == VN_MOBILE_DIGITS && digits.startsWith("9")) {
            return COUNTRY_CODE + digits;
        }

        return null;
    }
}

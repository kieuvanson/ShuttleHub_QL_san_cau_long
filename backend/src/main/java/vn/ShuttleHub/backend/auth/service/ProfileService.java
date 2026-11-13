package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.auth.dto.ProfileUpdateRequest;
import vn.ShuttleHub.backend.auth.dto.UserDto;
import vn.ShuttleHub.backend.auth.exception.BadRequestException;
import vn.ShuttleHub.backend.auth.exception.EmailAlreadyExistsException;
import vn.ShuttleHub.backend.entity.User;
import vn.ShuttleHub.backend.repository.UserRepository;

import java.time.LocalDateTime;

/**
 * Cập nhật hồ sơ (email / SĐT) cho user hiện tại.
 *
 * ⚠️ Vì sao tách khỏi {@link AuthService}?
 *   AuthService lo đăng nhập / đăng ký / refresh token. Cập nhật hồ sơ là
 *   trách nhiệm khác → tách riêng để class gọn và test không phải mock
 *   7 dependency không liên quan.
 */
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepo;
    private final OtpService otpService;

    /**
     * Cập nhật hồ sơ cho user hiện tại.
     *
     * ⚠️ Quy tắc bảo mật:
     *   • Đổi SĐT → BẮT BUỘC có OTP hợp lệ cho đúng SĐT đó (chứng minh sở hữu).
     *   • Đổi email khi user CHƯA có SĐT → BẮT BUỘC kèm SĐT + OTP hợp lệ
     *     trong cùng request. Nếu không, kẻ xấu có thể chiếm email người
     *     khác chỉ bằng cách gọi 1 API.
     *   • Email/SĐT đã tồn tại → 409.
     */
    @Transactional
    public UserDto updateProfile(String userId, ProfileUpdateRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new BadRequestException("User không tồn tại."));

        String email = req.email();
        String phone = req.phone();
        String otp = req.otp();

        if (email == null && phone == null) {
            throw new BadRequestException("Không có thông tin nào để cập nhật.");
        }

        boolean hasPhone = user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank();
        boolean phoneChanged = phone != null && !phone.equals(user.getPhoneNumber());
        boolean emailChanged = email != null && !email.equals(user.getEmail());

        // Đổi SĐT → bắt buộc OTP.
        if (phoneChanged) {
            if (otp == null || otp.isBlank()) {
                throw new BadRequestException("Vui lòng xác minh số điện thoại bằng mã OTP.");
            }
            otpService.verifyOtp(phone, otp);
            if (userRepo.existsByPhoneNumber(phone)) {
                throw new EmailAlreadyExistsException("Số điện thoại này đã được đăng ký.");
            }
        }

        // Đổi email mà user chưa có SĐT → bắt buộc kèm SĐT + OTP.
        if (emailChanged) {
            if (!hasPhone && !phoneChanged) {
                throw new BadRequestException(
                        "Vui lòng xác minh số điện thoại trước khi đổi email.");
            }
            if (userRepo.existsByEmail(email)) {
                throw new EmailAlreadyExistsException("Email này đã được sử dụng.");
            }
        }

        if (phoneChanged) {
            user.setPhoneNumber(phone);
        }
        if (emailChanged) {
            user.setEmail(email);
        }
        user.setUpdatedAt(LocalDateTime.now());
        user = userRepo.save(user);

        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }
}

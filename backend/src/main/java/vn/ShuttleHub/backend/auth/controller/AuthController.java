package vn.ShuttleHub.backend.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.ShuttleHub.backend.auth.dto.*;
import vn.ShuttleHub.backend.auth.service.AuthService;
import vn.ShuttleHub.backend.auth.service.OtpService;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    /**
     * Gửi mã OTP về SĐT.
     * POST /api/auth/send-otp
     * Body: { "phone": "0912345678" }
     *
     * ⚠️ Khi app.sms.mock=true, mã OTP được trả về trong response để dev
     * test được mà không cần SMS thật. Production PHẢI đặt mock=false.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<Map<String, String>>> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        String otp = otpService.sendOtp(req.phone());

        Map<String, String> data = null;
        if (otp != null) {
            // Mock mode: trả mã về cho FE hiển thị (dev only)
            data = Map.of("otp", otp, "mock", "true");
        }

        return ResponseEntity.ok(
            ApiResponse.success("Mã OTP đã được gửi về SĐT của bạn.", data)
        );
    }

    /**
     * Đăng ký tài khoản mới (yêu cầu OTP đã verify).
     * POST /api/auth/register
     * Body: { "username", "email", "phone", "password", "otp", "fullName" }
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest req) {
        AuthResponse res = authService.register(req);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công.", res));
    }

    /**
     * Đăng nhập bằng email + password.
     * POST /api/auth/login
     * Body: { "email", "password" }
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse res = authService.login(req);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công.", res));
    }

    /**
     * Cấp access token mới từ refresh token (có rotation).
     * POST /api/auth/refresh
     * Body: { "refreshToken": "..." }
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest req) {
        AuthResponse res = authService.refresh(req.refreshToken());
        return ResponseEntity.ok(ApiResponse.success("Refresh thành công.", res));
    }

    /**
     * Lấy thông tin user hiện tại (dựa trên access token trong header).
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> me(@AuthenticationPrincipal String userId) {
        UserDto user = authService.currentUser(userId);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    /**
     * Đăng xuất — vô hiệu hoá toàn bộ refresh token của user.
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal String userId) {
        authService.logout(userId);
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công.", null));
    }
}

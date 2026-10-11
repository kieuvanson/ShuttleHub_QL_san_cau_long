package vn.ShuttleHub.backend.entity;

/**
 * Enum định nghĩa các vai trò của User
 * Enum = tập hợp các hằng số cố định
 * Giúp code an toàn, tránh nhập sai vai trò
 */
public enum Role {
    // ✅ Các giá trị cố định
    ADMIN,      // Quản trị viên
    EMPLOYEE,   // Nhân viên
    CUSTOMER    // Khách hàng

    // ✅ Khi lưu database sẽ là: "ADMIN" hoặc "CUSTOMER"
    // ✅ Khi so sánh: if (user.getRole() == Role.ADMIN)
}

package vn.ShuttleHub.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entity đại diện cho bảng "users" trong database
 * Mỗi instance của class này = 1 dòng trong bảng
 */
@Entity
// ✅ @Entity: Đánh dấu class này là JPA Entity
// Spring Boot sẽ tự động tạo bảng trong database
// Tên class "User" → tên bảng mặc định là "user"

@Table(name = "users")
// ✅ @Table: Tùy chỉnh tên bảng (không dùng tên mặc định)
// "users" thay vì "user" vì "user" là từ khóa trong PostgreSQL

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
// ✅ LOMBOK: Thư viện giúp giảm code boilerplate
// @Getter: tự tạo getter cho tất cả field (getId(), getUsername(), ...)
// @Setter: tự tạo setter cho tất cả field (setId(), setUsername(), ...)
// @NoArgsConstructor: tự tạo constructor không tham số (User())
// @AllArgsConstructor: tự tạo constructor đầy đủ tham số (User(id, username, ...))
// @Builder: cho phép tạo object theo pattern Builder (User.builder().id(1L).build())

public class User {

    @Id
    // ✅ @Id: Đánh dấu đây là khóa chính (Primary Key)
    // Mỗi dòng phải có giá trị duy nhất ở cột này

    @GeneratedValue(strategy = GenerationType.UUID)
    // ✅ @GeneratedValue: Tự động sinh giá trị
    // UUID: Sinh chuỗi ngẫu nhiên duy nhất toàn cầu
    // ID sẽ là: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    // ✅ Ưu điểm: Gần như KHÔNG BAO GIỜ trùng lặp
    // ✅ Dùng khi: cần bảo mật (không đoán được ID), hệ thống phân tán

    @Column(name = "id")
    // ✅ @Column: Tùy chỉnh thuộc tính cột
    // name = "id": tên cột là "id"
    // Nếu không có @Column, tên cột sẽ trùng tên field

    private String id;

    @Column(name = "username", nullable = false, length = 50)
    // ✅ nullable = false: KHÔNG được phép NULL (bắt buộc nhập)
    // ✅ length = 50: Độ dài tối đa 50 ký tự
    // → Tạo cột: username VARCHAR(50) NOT NULL UNIQUE

    private String username;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    // ✅ unique = true: Giá trị phải DUY NHẤT (không trùng)
    private String email;

    @Column(name = "password", nullable = false, length = 255)
    // ✅ length = 255: Đủ dài cho password đã mã hóa (BCrypt = 60 ký tự)
    private String password;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Size(min = 10, max = 15)
    // ✅ @Size: Validation giới hạn độ dài chuỗi
    // min = 10: Tối thiểu 10 ký tự
    // max = 15: Tối đa 15 ký tự
    // ⚠️ CHỈ kiểm tra khi validate (không tự động lúc insert DB)
    @Column(name = "phone_number", length = 15)
    // ✅ length = 15: Tạo cột VARCHAR(15) trong database
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    // ✅ @Enumerated: Lưu Enum vào database
    // EnumType.STRING: Lưu dạng chuỗi ("ADMIN", "CUSTOMER")
    // EnumType.ORDINAL: Lưu dạng số (0, 1) - KHÔNG dùng vì khó đọc
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    @Column(name = "is_active", nullable = false)
    // ✅ Soft Delete: Không xóa user mà chỉ đánh dấu "không hoạt động"
    // Giữ lại lịch sử đặt sân
    private Boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    // ✅ updatable = false: Không cho phép UPDATE cột này
    // Chỉ set giá trị khi tạo mới
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

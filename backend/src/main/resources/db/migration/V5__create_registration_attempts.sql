-- =====================================================================
-- V5__create_registration_attempts.sql
-- Bảng đếm số lần đăng ký tài khoản theo số điện thoại.
--
-- ⚠️ Vì sao cần bảng riêng (không dùng bảng users)?
--   users chỉ chứa user ĐĂNG KÝ THÀNH CÔNG. Kẻ spam dùng 1 số điện
--   thoại để đăng ký nhiều tài khoản (đổi email mỗi lần) → users sẽ
--   chặn (unique phone) nhưng vẫn tốn 1 tin SMS cho MỖI lần đăng ký
--   thất bại. Bảng này đếm MỌI lần đăng ký để chặn đốt tiền SMS.
--
-- Bảng này được Flyway quản lý (ddl-auto=validate ⇒ Hibernate KHÔNG tự
-- tạo/sửa bảng, chỉ kiểm tra schema có khớp entity hay không).
-- =====================================================================

CREATE TABLE registration_attempts (
    id          VARCHAR(255)  PRIMARY KEY,
    phone       VARCHAR(15)   NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index phục vụ query "đếm lần đăng ký của SĐT trong 24h"
CREATE INDEX idx_reg_attempt_phone_created
    ON registration_attempts(phone, created_at);

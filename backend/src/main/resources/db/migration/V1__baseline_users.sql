-- =====================================================================
-- V1__baseline_users.sql
-- Tạo bảng `users` — khớp 1-1 với entity User.java.
--
-- Bảng này được Flyway quản lý (ddl-auto=validate ⇒ Hibernate KHÔNG tự
-- tạo/sửa bảng, chỉ kiểm tra schema có khớp entity hay không).
--
-- Lưu ý: đây là migration version 1, đã chạy trước V2__create_otp_codes.sql
-- và được Flyway ghi vào flyway_schema_history.
-- =====================================================================

CREATE TABLE users (
    id            VARCHAR(255)  PRIMARY KEY,
    username      VARCHAR(50)   NOT NULL,
    email         VARCHAR(100)  NOT NULL,
    password      VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(100),
    phone_number  VARCHAR(15),
    role          VARCHAR(20)   NOT NULL,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP
);

-- UNIQUE constraint cho username & email (entity khai báo unique = true)
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT users_email_unique    UNIQUE (email);

-- Index phục vụ query tìm theo email / username
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone    ON users(phone_number);

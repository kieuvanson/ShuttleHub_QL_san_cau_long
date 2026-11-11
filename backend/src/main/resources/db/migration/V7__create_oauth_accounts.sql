-- =====================================================================
-- V7__create_oauth_accounts.sql
-- Bảng liên kết tài khoản OAuth (Google/Facebook) với user trong hệ thống.
--
-- ⚠️ Vì sao cần bảng riêng (không thêm cột provider vào bảng users)?
--   - 1 user có thể gắn N provider (đăng nhập bằng Google VÀ Facebook).
--   - UNIQUE (provider, provider_user_id) chặn việc 1 provider-user bị
--     gắn vào 2 account khác nhau — đây là lớp bảo vệ CUỐI CÙNG chống
--     race condition khi user mở 2 tab đăng nhập Google đồng thời.
--   - email_at_registration lưu lại email tại thời điểm liên kết để
--     đối chiếu khi user đổi email.
--
-- Bảng này được Flyway quản lý (ddl-auto=validate ⇒ Hibernate KHÔNG tự
-- tạo/sửa bảng, chỉ kiểm tra schema có khớp entity hay không).
-- =====================================================================

CREATE TABLE oauth_accounts (
    id                     VARCHAR(255)  PRIMARY KEY,
    user_id                VARCHAR(255)  NOT NULL REFERENCES users(id),
    provider               VARCHAR(20)   NOT NULL,
    provider_user_id       VARCHAR(255)  NOT NULL,
    email_at_registration  VARCHAR(100),
    created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT oauth_accounts_provider_uid_unique UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

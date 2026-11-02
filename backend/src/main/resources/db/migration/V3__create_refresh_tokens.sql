-- =====================================================================
-- V3__create_refresh_tokens.sql
-- Bảng lưu refresh token để thực hiện ROTATION.
--
-- Mỗi lần gọi /api/auth/refresh: token cũ bị revoke, token mới được cấp.
-- Nếu token đã revoke lại được dùng → phát hiện trộm → vô hiệu hoá
-- toàn bộ session của user đó.
-- =====================================================================

CREATE TABLE refresh_tokens (
    id           VARCHAR(255) PRIMARY KEY,
    user_id      VARCHAR(255) NOT NULL,
    token_hash   VARCHAR(64)  NOT NULL,
    revoked      BOOLEAN      NOT NULL DEFAULT FALSE,
    replaced_by  VARCHAR(255),
    expires_at   TIMESTAMP    NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at   TIMESTAMP
);

-- token_hash là duy nhất → mỗi token chỉ có 1 dòng
ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash);

CREATE INDEX idx_refresh_user    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

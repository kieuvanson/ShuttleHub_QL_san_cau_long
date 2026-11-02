-- =====================================================================
-- V2__create_otp_codes.sql
-- Bảng lưu OTP xác nhận SĐT khi đăng ký tài khoản.
--
-- Lưu ý: code_hash là BCrypt hash (~60 ký tự), KHÔNG lưu plaintext.
-- =====================================================================

CREATE TABLE otp_codes (
    id              VARCHAR(255)     PRIMARY KEY,
    phone           VARCHAR(15)      NOT NULL,
    code_hash       VARCHAR(255)     NOT NULL,
    used            BOOLEAN          NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMP        NOT NULL,
    attempt_count   INT              NOT NULL DEFAULT 0,
    created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index phục vụ query "OTP mới nhất của SĐT, chưa dùng, còn hạn"
CREATE INDEX idx_otp_phone_used_expires
    ON otp_codes(phone, used, expires_at);

-- Index phục vụ rate-limit "đếm OTP gửi trong khoảng"
CREATE INDEX idx_otp_phone_created
    ON otp_codes(phone, created_at);

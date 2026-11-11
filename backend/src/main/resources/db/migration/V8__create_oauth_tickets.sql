-- =====================================================================
-- V8__create_oauth_tickets.sql
-- Bảng ticket dùng-một-lần để trao JWT cho frontend sau OAuth callback.
--
-- ⚠️ Vì sao không đưa thẳng JWT vào URL?
--   URL nằm trong browser history, log access của nginx/APM, và header
--   Referer khi user bấm link ra ngoài. Ticket thì vô hại khi lọt:
--   chỉ dùng được 1 lần, hết hạn sau 60 giây, không chứa PII.
--
-- user_id NULL = ticket đang chờ user hoàn thiện hồ sơ (Facebook).
--
-- Bảng này được Flyway quản lý (ddl-auto=validate ⇒ Hibernate KHÔNG tự
-- tạo/sửa bảng, chỉ kiểm tra schema có khớp entity hay không).
-- =====================================================================

CREATE TABLE oauth_tickets (
    ticket            VARCHAR(64)   PRIMARY KEY,
    user_id           VARCHAR(255)  REFERENCES users(id),
    provider          VARCHAR(20)   NOT NULL,
    provider_user_id  VARCHAR(255)  NOT NULL,
    full_name         VARCHAR(100),
    expires_at        TIMESTAMP     NOT NULL,
    used              BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oauth_tickets_expires_at ON oauth_tickets(expires_at);

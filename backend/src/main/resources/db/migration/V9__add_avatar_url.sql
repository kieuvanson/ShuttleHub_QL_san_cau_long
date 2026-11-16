-- =====================================================================
-- V9__add_avatar_url.sql
-- Thêm cột avatar_url cho user + ticket OAuth.
--
-- ⚠️ Vì sao lưu URL ảnh thay vì dựng động?
--   URL ảnh Facebook (picture.data.url) có chữ ký tạm thời → dựng động
--   cần access token và tốn 1 request mỗi lần render. Ta lưu lại lúc
--   đăng nhập và cập nhật mỗi lần user đăng nhập Facebook lại.
--   Ảnh hỏng (URL hết hạn) → frontend fallback về chữ cái đầu.
--
-- ⚠️ users.avatar_url NULL = user không đăng nhập qua OAuth.
--
-- Bảng này được Flyway quản lý (ddl-auto=validate ⇒ Hibernate KHÔNG tự
-- tạo/sửa bảng, chỉ kiểm tra schema có khớp entity hay không).
-- =====================================================================

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE oauth_tickets ADD COLUMN avatar_url VARCHAR(500);

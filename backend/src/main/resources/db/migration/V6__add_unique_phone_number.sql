-- =====================================================================
-- V6__add_unique_phone_number.sql
-- Thêm ràng buộc UNIQUE cho users.phone_number.
--
-- ⚠️ Vì sao cần?
-- Trước đây `phone_number` chỉ có INDEX (không UNIQUE) → việc chặn
-- "1 số điện thoại = 1 tài khoản" hoàn toàn dựa vào code ở tầng
-- application (`existsByPhoneNumber`). Code thì có thể bị bypass (race
-- condition: 2 request đăng ký song song cùng SĐT → cả 2 đều pass
-- check → tạo 2 user).
--
-- → UNIQUE constraint ở DB là lớp bảo vệ CUỐI CÙNG: dù code có sai,
-- database vẫn không cho phép 2 tài khoản cùng 1 số điện thoại.
--
-- ⚠️ Đã kiểm tra dữ liệu trước khi chạy:
--    SELECT phone_number, count(*) FROM users WHERE phone_number IS NOT NULL
--    GROUP BY phone_number HAVING count(*) > 1;
--    → 0 dòng trùng lặp, 0 số điện thoại NULL.
-- =====================================================================

-- Bỏ index thường (không cần thiết nữa — UNIQUE constraint đã tạo index)
DROP INDEX IF EXISTS idx_users_phone;

-- Thêm ràng buộc UNIQUE
ALTER TABLE users ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);

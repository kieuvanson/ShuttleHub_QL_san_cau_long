-- =====================================================================
-- V4__normalize_phone_numbers.sql
-- Chuẩn hoá dữ liệu số điện thoại cũ về định dạng E.164 (84912345678).
--
-- ⚠️ Vì sao cần migration này?
-- Trước V4, code lưu số điện thoại "nguyên văn" như user gõ:
--   "0912345678", "+84912345678", "0912 345 678"… đều là 3 tài khoản khác nhau.
-- Sau V4, code luôn chuẩn hoá về E.164 trước khi ghi (PhoneNumbers.normalize).
-- Migration này đưa dữ liệu CŨ về đúng chuẩn đó, để các bản ghi đã tồn tại
-- khớp với bản ghi mới (tránh tạo user trùng hoặc OTP không khớp).
--
-- ⚠️ Bảng `otp_codes` KHÔNG cần migrate: dữ liệu OTP chỉ sống 5 phút
-- (TTL), các dòng cũ tự hết hạn. Tránh UPDATE không cần thiết.
--
-- ⚠️ BACKUP bảng `users` TRƯỚC khi chạy migration này trên dữ liệu thật:
--   CREATE TABLE users_backup_v4 AS SELECT * FROM users;
-- =====================================================================

-- +84912345678 → 84912345678
-- (bỏ 3 ký tự đầu "+84", thêm lại "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 4)
 WHERE phone_number ~ '^\+84[0-9]{9}$';

-- +840912345678 → 84912345678
-- (bỏ 4 ký tự đầu "+840", thêm lại "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 5)
 WHERE phone_number ~ '^\+840[0-9]{9}$';

-- 0912345678 → 84912345678
-- (bỏ ký tự đầu "0", thêm "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 2)
 WHERE phone_number ~ '^0[0-9]{9}$';

-- 09123456789 → 84912345678
-- (bỏ "0", lấy 9 chữ số kế tiếp, thêm "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 2, 9)
 WHERE phone_number ~ '^0[0-9]{10}$';

-- 840912345678 → 84912345678
-- (bỏ 3 ký tự đầu "840", thêm "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 4)
 WHERE phone_number ~ '^840[0-9]{9}$';

-- 912345678 → 84912345678
-- (thêm "84" vào trước)
UPDATE users SET phone_number = '84' || phone_number
 WHERE phone_number ~ '^9[0-9]{8}$';

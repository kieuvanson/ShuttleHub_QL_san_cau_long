# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Backend: Spring Boot 4.1.1 + Java + PostgreSQL + Maven
Frontend: Vite + React 19 + TypeScript

## Users

Three audiences on a single web product:

1. **Khách thuê sân (Customer)** — primary user. Tìm sân cầu lông trống gần họ, xem giá và khung giờ, đặt sân, thanh toán. Thường dùng mobile khi đang ở nhà hoặc trên đường đi chơi. Kỳ vọng flow tìm-đặt nhanh trong vài phút.
2. **Chủ sân (Owner / ADMIN)** — người sở hữu cụm sân. Tạo và quản lý sân, đặt giá theo khung giờ, duyệt booking, xem doanh thu, quản lý nhân viên.
3. **Nhân viên (Employee)** — do chủ sân tuyển. Check-in khách tại sân, hỗ trợ vận hành hằng ngày. Không thấy báo cáo tài chính đầy đủ như chủ.

## Product Purpose

ShuttleHub giúp khách tìm và đặt sân cầu lông trong vài phút thay vì gọi điện hoặc đến tận nơi, đồng thời giúp chủ sân vận hành nhiều sân cùng lúc mà không cần sổ tay.

Success = tỉ lệ khách tìm được sân trống và đặt thành công trong một lần truy cập, và chủ sân giảm thời gian xử lý thủ công.

## Positioning

Một bảng điều khiển quản lý sân cầu lông end-to-end: khách thấy sân thật theo vị trí và giờ thật, chủ sân thấy booking, nhân viên, doanh thu trong cùng một sản phẩm. Cơ chế khác biệt: thực tế thao tác thường ngày của một cụm sân (tìm–đặt–check-in–đối soát) hợp nhất trong một web app, thay vì rải ra nhóm Zalo, Google Sheet và sổ tay.

## Operating Context

Khách thường mở điện thoại vào buổi tối hoặc cuối tuần để đặt sân cho hôm sau hoặc ngay tại chỗ. Chủ sân thao tác trên laptop ở văn phòng hoặc tablet tại quầy. Nhân viên đứng tại quầy lễ tân, dùng tablet hoặc desktop. Web là đủ — không cần app native giai đoạn này.

## Capabilities and Constraints

Đã xác nhận:

- Đăng ký / đăng nhập với role ADMIN, EMPLOYEE, CUSTOMER (đã có entity `User` + `Role`).
- Tìm sân trống là use case khách ưu tiên đầu tiên.
- Database: PostgreSQL.
- Soft delete cho user (giữ lịch sử booking).

Chưa quyết định:

- Thanh toán online: chưa xác nhận dùng cổng nào (VNPay, Momo, MoMo, Stripe, hay chỉ thu tiền mặt tại sân).
- Số sân tối đa một chủ quản lý: chưa rõ.
- Có cần app native hay không: hiện tại không.

## Brand Commitments

Tên: ShuttleHub. Thương hiệu của chính dự án — không phải thương hiệu đối tác.
Phong cách: năng động, trẻ trung, hướng thể thao (đã chốt với người dùng).
Chưa có logo, palette, hay font chính thức — sẽ chọn trong `new-work` chứ không trong `init`.

## Evidence on Hand

- Source code backend với entity `User` và enum `Role` đã rõ (xem `backend/src/main/java/vn/ShuttleHub/backend/entity/`).
- README tiếng Việt mô tả sản phẩm.
- Frontend scaffold Vite + React + TypeScript (chưa có giao diện sản phẩm).

Không có: khách hàng thật, testimonial, số liệu, ảnh sân thật. Không được tự đặt số liệu giả.

## Product Principles

1. Khách đặt sân phải nhanh — tối đa vài phút từ lúc mở app đến lúc nhận xác nhận.
2. Chủ sân nhìn một nơi duy nhất ra doanh thu, booking, nhân viên — không cần mở nhiều bảng tính.
3. Vai trò phân quyền rõ ràng: khách không thấy dữ liệu nội bộ, nhân viên không thấy tài chính đầy đủ, chủ sân thấy tất cả.
4. Số liệu thật, ngôn ngữ Việt — không bịa đặt khách hàng, doanh thu, đánh giá.

## Accessibility & Inclusion

Chưa có yêu cầu cụ thể từ phía người dùng. Sẽ áp dụng baseline web chuẩn (contrast, keyboard, semantic HTML) khi thiết kế, nhưng chưa cam kết mức WCAG cụ thể.

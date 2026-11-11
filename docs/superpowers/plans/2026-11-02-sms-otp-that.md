# SMS OTP thật (SpeedSMS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gửi OTP qua SpeedSMS thật về điện thoại (đúng format API JSON + Basic Auth + `sms_type=2`), chuẩn hoá số điện thoại về E.164, tách môi trường dev/prod, và chặn spam đăng ký tài khoản.

**Architecture:** Tách `SmsService` thành interface `SmsSender` + 2 implementation (`MockSmsSender`, `SpeedSmsSender`) chọn bằng `@ConditionalOnProperty` theo `app.sms.provider`. Chuẩn hoá SĐT tại biên DTO (compact constructor) về E.164. Rate-limit 2 tầng: theo IP (in-memory, chặn đốt tiền SMS) và theo số điện thoại (bảng DB, chặn spam tạo account).

**Tech Stack:** Spring Boot 4.1.1 · Java 25 · PostgreSQL · Flyway · Jackson · RestClient · JUnit 5 · Mockito · MockRestServiceServer

**Spec:** `docs/superpowers/specs/2026-11-02-sms-otp-that-design.md`

---

## Global Constraints

- Package backend gốc: `vn.ShuttleHub.backend`. Backend chạy ở `backend/`, frontend ở `frontend/`.
- **Ngôn ngữ:** comment và message trả về cho user viết **tiếng Việt**; tên class/biến/hàm viết tiếng Anh.
- **Không** dùng `any` (frontend). **Không** đưa Kotlin vào dự án.
- Entity: Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`, `@Id @GeneratedValue(strategy = GenerationType.UUID)` → `String id`, `@Enumerated(EnumType.STRING)`. Không đặt `@Size`/`@NotBlank` trên entity (chỉ ở DTO). `createdAt` có `updatable = false`.
- Migration: file mới `backend/src/main/resources/db/migration/V{n}__{snake_case}.sql`. **Không sửa migration đã chạy.** `ddl-auto=validate` → thiếu bảng = thiếu migration.
- Lỗi 500 **không** được trả `ex.getMessage()` cho client.
- Comment giải thích **tại sao**, không phải **cái gì**.
- **Cấu hình SMS bắt buộc (copy chính xác):**

  | Key | Value | Ý nghĩa |
  |---|---|---|
  | `app.sms.provider` | `speedsms` \| `mock` | Provider đang dùng. Giá trị khác → app **fail lúc start** |
  | `app.sms.access-token` | `${SPEEDSMS_ACCESS_TOKEN:}` | Token SpeedSMS |
  | `app.sms.sender` | `${SPEEDSMS_SENDER:CauLongDee}` | Brand (chỉ dùng khi `sms_type` = 3 hoặc 5) |
  | `app.sms.type` | `2` | 2=CSKH (không cần brand duyệt, có dấu) · 3=brandname (không dấu) · 6=đầu số cố định |
  | `app.sms.phone-format` | `national` | `national` → gửi `0912345678` (khớp ví dụ chính thức) · `e164` → gửi `84912345678` |
  | `app.sms.max-sends-per-hour-per-ip` | `10` | Chặn đốt tiền tài khoản |
  | `app.otp.max-registrations-per-phone-per-day` | `3` | Chặn spam tạo account |

- **Nội dung tin nhắn (chốt cửa, dùng đúng chuỗi này):**
  `[Cầu Lông dee] Ma xac nhan: {otp}. Het han sau 5 phut.`
  → 61 ký tự không dấu → **1 tin** (dưới ngưỡng 160 ký tự).
- **API SpeedSMS:** `POST https://api.speedsms.vn/index.php/sms/send`, `Content-Type: application/json`, HTTP Basic `-u "{token}:x"`, body `{"to":[...],"content":"...","sms_type":<int>,"sender":"<brand>"}`.
- **Error code SpeedSMS → message tiếng Việt** (bắt buộc map đúng):
  `007` IP locked · `008` Account blocked · `009` Account not allow to call API → *"Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau."* · `101` Invalid params → *"Không thể gửi mã xác nhận. Vui lòng thử lại sau."* · `105` Phone invalid → *"Số điện thoại không hợp lệ."* · `110` Not support encoding → *"Nội dung tin nhắn không được hỗ trợ. Vui lòng thử lại sau."* · `113` Content too long → *"Nội dung tin nhắn quá dài."* · `300` Balance not enough → *"Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau."* · `500` Internal error → *"Không thể gửi mã xác nhận. Vui lòng thử lại sau."*
- **Quy tắc chuẩn hoá SĐT** (`PhoneNumbers.normalize`, trả `null` nếu sai định dạng):
  1. Bỏ mọi ký tự không phải số → chỉ giữ `0-9`
  2. 11 chữ số, bắt đầu `84` → giữ nguyên (`84912345678`)
  3. 12 chữ số, bắt đầu `840` → `84` + bỏ 3 ký tự đầu (`840912345678` → `84912345678`)
  4. 10 chữ số, bắt đầu `0` → `84` + bỏ ký tự đầu (`0912345678` → `84912345678`)
  5. 11 chữ số, bắt đầu `0` → `84` + 9 ký tự kế tiếp (`09123456789` → `84912345678`)
  6. 9 chữ số, bắt đầu `9` → `84` + nguyên chuỗi (`912345678` → `84912345678`)
  7. Còn lại → `null`

---

## Review Focus

Năm trường hợp người dùng thật sẽ gặp mà spec không nói rõ — mỗi dòng dưới đây có test tương ứng trong task sở hữu code:

1. **Người dùng gõ SĐT khác nhau ở 2 bước** — gõ `+84912345678` khi bấm "Gửi mã" nhưng gõ `0912345678` ở form đăng ký → đăng ký phải **thành công**, không phải "Mã OTP không tồn tại". *(Task 1, Task 6)*
2. **SĐT có khoảng trắng / gạch nối** — `0912 345 678`, `0912-345-678` → phải chuẩn hoá giống hệt `0912345678`. *(Task 1)*
3. **SpeedSMS trả lỗi trong body JSON** (`code` = `105`, `300`, `101`…) → user phải nhận message tiếng Việt nói rõ nguyên nhân qua HTTP **503**, không phải 500 chung chung. *(Task 3)*
4. **SpeedSMS trả lỗi HTTP** (401/500) hoặc body không phải JSON → phải ra **503** với message chung, **không** lộ raw body của SpeedSMS ra client. *(Task 3)*
5. **Đăng ký fail vì email trùng** → bộ đếm `registration_attempts` **không được tăng** (người dùng thật bị phạt oan vì lỗi của họ). *(Task 6)*

Ngoài 5 dòng trên: **OTP không bao giờ được trả về HTTP response khi provider là `speedsms`** — chỉ `mock` mới lộ mã. *(Task 2, Task 4)*

---

## Cấu trúc file

**Tạo mới:**

| File | Trách nhiệm |
|---|---|
| `backend/src/main/java/vn/ShuttleHub/backend/common/PhoneNumbers.java` | Chuẩn hoá SĐT về E.164. Hàm tĩnh, không phụ thuộc Spring |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsSender.java` | Interface: `SmsSendResult sendOtp(String phone, String otpCode)` + `default boolean exposesCode()` |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsSendResult.java` | Record `(boolean success, String errorCode, String errorMessage)` + factory `ok()` / `fail(code, msg)` |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/MockSmsSender.java` | `@ConditionalOnProperty(havingValue="mock")`. Log OTP, không gọi mạng, `exposesCode()` = true |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SpeedSmsSender.java` | `@ConditionalOnProperty(havingValue="speedsms")`. Gọi API thật, parse JSON, map error code |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsErrorMessages.java` | Map error code SpeedSMS → message tiếng Việt (hằng, dễ test) |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/service/SmsRateLimiter.java` | Giới hạn số lần gửi / giờ / IP, lưu in-memory |
| `backend/src/main/java/vn/ShuttleHub/backend/entity/RegistrationAttempt.java` | Entity bảng `registration_attempts` |
| `backend/src/main/java/vn/ShuttleHub/backend/repository/RegistrationAttemptRepository.java` | Query đếm + xoá dòng cũ |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/service/RegistrationAttemptService.java` | Đếm trong 24h (kèm dọn lười) + ghi lần đăng ký (`REQUIRES_NEW`) |
| `backend/src/main/resources/db/migration/V4__normalize_phone_numbers.sql` | Chuẩn hoá `users.phone_number` cũ → E.164 |
| `backend/src/main/resources/db/migration/V5__create_registration_attempts.sql` | Tạo bảng `registration_attempts` |
| `backend/src/main/resources/application-local.properties.template` | File mẫu profile dev (`app.sms.provider=mock`) |
| `backend/src/test/java/vn/ShuttleHub/backend/common/PhoneNumbersTest.java` | Test chuẩn hoá SĐT |
| `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/MockSmsSenderTest.java` | Test mock sender |
| `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/SpeedSmsSenderTest.java` | Test format request + parse response + map lỗi |
| `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/SmsErrorMessagesTest.java` | Test bảng map error code |
| `backend/src/test/java/vn/ShuttleHub/backend/auth/service/SmsRateLimiterTest.java` | Test giới hạn IP |
| `backend/src/test/java/vn/ShuttleHub/backend/auth/service/RegistrationAttemptServiceTest.java` | Test đếm + ghi |
| `backend/src/test/java/vn/ShuttleHub/backend/auth/service/AuthServiceRegistrationLimitTest.java` | Test giới hạn đăng ký trong `AuthService` |

**Sửa:**

| File | Thay đổi |
|---|---|
| `backend/pom.xml` | Thêm `spring-boot-starter-test` (scope test) |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/SendOtpRequest.java` | Compact constructor → `PhoneNumbers.normalize(phone)` |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/RegisterRequest.java` | Compact constructor → `PhoneNumbers.normalize(phone)` |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OtpService.java` | Dùng `SmsSender`; thêm tham số `clientIp`; dùng `SmsRateLimiter` |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java` | Kiểm tra + ghi `registration_attempts` |
| `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/AuthController.java` | Lấy IP từ `HttpServletRequest`, truyền xuống `OtpService` |
| `backend/src/main/resources/application.properties` | Bỏ `app.sms.mock`, thêm 4 key mới |
| `backend/src/main/resources/application.properties.template` | Đồng bộ key mới |
| `README.md` | Cập nhật tiến trình + API endpoints |

**Xoá:** `backend/src/main/java/vn/ShuttleHub/backend/auth/service/SmsService.java`

---

### Task 1: Chuẩn hoá số điện thoại về E.164

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/common/PhoneNumbers.java`
- Create: `backend/src/test/java/vn/ShuttleHub/backend/common/PhoneNumbersTest.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/SendOtpRequest.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/dto/RegisterRequest.java`
- Create: `backend/src/main/resources/db/migration/V4__normalize_phone_numbers.sql`
- Modify: `backend/pom.xml`

**Interfaces:**
- Consumes: không có
- Produces: `public final class vn.ShuttleHub.backend.common.PhoneNumbers` với `public static String normalize(String phone)` — trả E.164 (`84912345678`) hoặc `null` nếu sai định dạng. Hằng `public static final int VN_MOBILE_DIGITS = 9`.

- [ ] **Step 1: Thêm dependency test vào `pom.xml`**

Thêm vào `<dependencies>` (cạnh `spring-boot-starter-webmvc-test`):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

- [ ] **Step 2: Verify dependency đã có trong classpath**

Run: `cd backend; .\mvnw.cmd -o dependency:tree -Dincludes=org.mockito:mockito-core,org.junit.jupiter:junit-jupiter`
Expected: In ra `org.mockito:mockito-core` và `org.junit.jupiter:junit-jupiter` với version khác null. Nếu `mockito-core` không có → dừng, báo lại (không tự thêm dependency khác ngoài pom đã sửa ở Step 1).

- [ ] **Step 3: Viết test failing cho `PhoneNumbers`**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/common/PhoneNumbersTest.java`. Bảng case bắt buộc — mỗi dòng là 1 test method riêng:

| Input | Expected |
|---|---|
| `"0912345678"` | `"84912345678"` |
| `"+84912345678"` | `"84912345678"` |
| `"84912345678"` | `"84912345678"` |
| `"912345678"` | `"84912345678"` |
| `"0912 345 678"` | `"84912345678"` |
| `"0912-345-678"` | `"84912345678"` |
| `"+84 912 345 678"` | `"84912345678"` |
| `"840912345678"` | `"84912345678"` |
| `"09123456789"` | `"84912345678"` |
| `null` | `null` |
| `""` | `null` |
| `"12345"` | `null` |
| `"abcdefghij"` | `null` |

Test method dùng tên `normalize` + mô tả, ví dụ `normalize_stripsSpacesAndDashes`, `normalize_null_returnsNull`, `normalize_tooShort_returnsNull`. Dùng `org.junit.jupiter.api.Test` + `Assertions.assertEquals` / `assertNull`.

- [ ] **Step 4: Chạy test để xác nhận FAIL**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=PhoneNumbersTest`
Expected: FAIL — biên dịch lỗi vì `PhoneNumbers` chưa tồn tại.

- [ ] **Step 5: Implement `PhoneNumbers`**

Tạo `backend/src/main/java/vn/ShuttleHub/backend/common/PhoneNumbers.java`:

```java
public final class PhoneNumbers {
    private PhoneNumbers() {}   // class tiện ích → không cho khởi tạo

    public static final int VN_MOBILE_DIGITS = 9;

    public static String normalize(String phone) { /* theo Global Constraints, quy tắc 1-7 */ }
}
```

Cách implement (implementer tự viết thân hàm, chỉ cần khớp bảng case ở Step 3):

- Bước 1: `String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");` — `null` → `""`.
- Bước 2: `if (digits.isEmpty()) return null;`
- Bước 3: áp dụng lần lượt các quy tắc theo thứ tự 2→6 ở Global Constraints; quy tắc nào khớp thì `return` kết quả luôn.
- Bước 4: không khớp quy tắc nào → `return null`.

⚠️ `replaceAll` với regex `[^0-9]` xử lý được cả `+`, khoảng trắng, gạch nối, dấu chấm.

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=PhoneNumbersTest`
Expected: PASS — hết test đỏ.

- [ ] **Step 7: Áp dụng chuẩn hoá vào 2 DTO**

`SendOtpRequest.java` — thêm vào compact constructor đang có:

```java
public SendOtpRequest {
    phone = PhoneNumbers.normalize(phone);
}
```

Thêm import `vn.ShuttleHub.backend.common.PhoneNumbers`.

`RegisterRequest.java` — trong compact constructor đang có, thay dòng `phone = phone == null ? null : phone.trim();` bằng `phone = PhoneNumbers.normalize(phone);` và thêm import.

⚠️ `@Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$")` trên `phone` **phải bỏ** ở cả 2 DTO — sau khi chuẩn hoá, giá trị luôn là `84` + 9 chữ số, regex cũ sẽ reject hết. Thay bằng `@Pattern(regexp = "^84[0-9]{9}$", message = "Số điện thoại chưa hợp lệ")` để vẫn có message tiếng Việt.

- [ ] **Step 8: Viết test cho compact constructor của DTO**

Thêm vào `backend/src/test/java/vn/ShuttleHub/backend/auth/dto/PhoneNormalizationDtoTest.java` (file mới):

| Test | Khẳng định |
|---|---|
| `sendOtpRequest_normalizesPhone` | `new SendOtpRequest("0912 345 678").phone()` equals `"84912345678"` |
| `registerRequest_normalizesPhone` | `new RegisterRequest("Nguyễn A", "a@b.com", "+84912345678", "matkhau", "123456", "user01").phone()` equals `"84912345678"` |
| `sendOtpRequest_invalidPhone_becomesNull` | `new SendOtpRequest("abc").phone()` is null |

Không dùng Spring context — gọi constructor trực tiếp.

- [ ] **Step 9: Chạy test DTO**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=PhoneNormalizationDtoTest`
Expected: PASS.

- [ ] **Step 10: Viết migration `V4__normalize_phone_numbers.sql`**

Tạo `backend/src/main/resources/db/migration/V4__normalize_phone_numbers.sql`. Chạy đúng 6 lệnh UPDATE theo thứ tự này (thứ tự quan trọng — regex loại trừ lẫn nhau nên không giao, nhưng giữ nguyên thứ tự để dễ đọc):

```sql
-- +84912345678 → 84912345678  (bỏ 3 ký tự đầu "+84", thêm lại "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 4) WHERE phone_number ~ '^\+84[0-9]{9}$';
-- +840912345678 → 84912345678  (bỏ 4 ký tự đầu "+840", thêm lại "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 5) WHERE phone_number ~ '^\+840[0-9]{9}$';
-- 0912345678 → 84912345678  (bỏ ký tự đầu "0", thêm "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 2) WHERE phone_number ~ '^0[0-9]{9}$';
-- 09123456789 → 84912345678  (bỏ "0", lấy 9 ký tự kế tiếp, thêm "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 2, 9) WHERE phone_number ~ '^0[0-9]{10}$';
-- 840912345678 → 84912345678  (bỏ 3 ký tự đầu "840", thêm "84")
UPDATE users SET phone_number = '84' || substr(phone_number, 4) WHERE phone_number ~ '^840[0-9]{9}$';
-- 912345678 → 84912345678  (thêm "84" vào trước)
UPDATE users SET phone_number = '84' || phone_number WHERE phone_number ~ '^9[0-9]{8}$';
```

Thêm comment ở đầu file giải thích: chuyển dữ liệu cũ sang chuẩn E.164 để khớp `PhoneNumbers.normalize()`; bảng `otp_codes` không cần migrate vì dữ liệu TTL 5 phút tự hết hạn.

⚠️ **KHÔNG** thêm `UPDATE` nào cho `otp_codes`.

- [ ] **Step 11: Backup bảng `users` trước khi chạy migration**

⚠️ Bắt buộc — migration sửa dữ liệu thật.

Run:
```powershell
cd backend
psql -U postgres -d postgres -c "CREATE TABLE users_backup_v4 AS SELECT * FROM users;"
```
Expected: `CREATE TABLE`. Nếu `psql` không có trong PATH → báo lại cho user chạy tay qua pgAdmin, **không** bỏ qua bước này.

- [ ] **Step 12: Chạy app để Flyway apply V4 và verify**

Run: `cd backend; .\mvnw.cmd spring-boot:run`
Expected trong log: `Successfully applied 1 migration` và `Started BackendApplication`.

Sau đó verify dữ liệu:
```powershell
psql -U postgres -d postgres -c "SELECT id, phone_number FROM users;"
```
Expected: mọi `phone_number` khác `NULL` đều có dạng `84` + 9 chữ số.

- [ ] **Step 13: Commit**

```bash
git add backend/pom.xml backend/src/main/java/vn/ShuttleHub/backend/common/PhoneNumbers.java backend/src/main/java/vn/ShuttleHub/backend/auth/dto/SendOtpRequest.java backend/src/main/java/vn/ShuttleHub/backend/auth/dto/RegisterRequest.java backend/src/main/resources/db/migration/V4__normalize_phone_numbers.sql backend/src/test/java/vn/ShuttleHub/backend/common/PhoneNumbersTest.java backend/src/test/java/vn/ShuttleHub/backend/auth/dto/PhoneNormalizationDtoTest.java
git commit -m "feat(auth): chuan hoa so dien thoai ve E.164 truoc khi luu DB"
```

---

### Task 2: Interface `SmsSender` + `SmsSendResult` + `MockSmsSender`

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsSender.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsSendResult.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/MockSmsSender.java`
- Create: `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/MockSmsSenderTest.java`

**Interfaces:**
- Consumes: không có
- Produces:
  - `public record vn.ShuttleHub.backend.auth.sms.SmsSendResult(boolean success, String errorCode, String errorMessage)` với `public static SmsSendResult ok()` và `public static SmsSendResult fail(String errorCode, String errorMessage)`. Accessor: `success()`, `errorCode()`, `errorMessage()`.
  - `public interface vn.ShuttleHub.backend.auth.sms.SmsSender` với `SmsSendResult sendOtp(String phone, String otpCode)` và `default boolean exposesCode() { return false; }`

- [ ] **Step 1: Viết test failing cho `MockSmsSender`**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/MockSmsSenderTest.java`:

| Test | Khẳng định |
|---|---|
| `sendOtp_returnsSuccess` | `new MockSmsSender().sendOtp("84912345678", "123456").success()` is `true` |
| `sendOtp_hasNoErrorCode` | `...errorCode()` is `null` |
| `exposesCode_isTrue` | `new MockSmsSender().exposesCode()` is `true` |

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=MockSmsSenderTest`
Expected: FAIL — chưa có `MockSmsSender`.

- [ ] **Step 3: Tạo `SmsSendResult`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsSendResult.java`:

```java
package vn.ShuttleHub.backend.auth.sms;

/**
 * Kết quả gửi SMS. Mang cả mã lỗi để tầng trên log lại và hiển thị
 * message tiếng Việt đúng nguyên nhân, thay vì lỗi chung chung.
 */
public record SmsSendResult(boolean success, String errorCode, String errorMessage) {

    public static SmsSendResult ok() {
        return new SmsSendResult(true, null, null);
    }

    public static SmsSendResult fail(String errorCode, String errorMessage) {
        return new SmsSendResult(false, errorCode, errorMessage);
    }
}
```

- [ ] **Step 4: Tạo `SmsSender`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsSender.java`:

```java
package vn.ShuttleHub.backend.auth.sms;

public interface SmsSender {

    /**
     * Gửi mã OTP tới số điện thoại (đã chuẩn hoá E.164).
     */
    SmsSendResult sendOtp(String phone, String otpCode);

    /**
     * Provider có lộ mã OTP ra response HTTP không?
     * Chỉ mock mới true — production KHÔNG BAO GIỜ lộ mã.
     */
    default boolean exposesCode() {
        return false;
    }
}
```

- [ ] **Step 5: Tạo `MockSmsSender`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/sms/MockSmsSender.java`:

```java
package vn.ShuttleHub.backend.auth.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "mock")
public class MockSmsSender implements SmsSender {

    @Override
    public SmsSendResult sendOtp(String phone, String otpCode) {
        log.info("╔══════════════════════════════════════════╗");
        log.info("║  [SMS MOCK] Gửi tới: {}", phone);
        log.info("║  Nội dung: [Cầu Lông dee] Ma xac nhan: {}. Het han sau 5 phut.", otpCode);
        log.info("║  🔑 OTP: {}", otpCode);
        log.info("╚══════════════════════════════════════════╝");
        return SmsSendResult.ok();
    }

    @Override
    public boolean exposesCode() {
        return true;
    }
}
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=MockSmsSenderTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/vn/ShuttleHub/backend/auth/sms backend/src/test/java/vn/ShuttleHub/backend/auth/sms
git commit -m "feat(sms): them interface SmsSender va MockSmsSender"
```

---

### Task 3: `SpeedSmsSender` — format API đúng + map lỗi

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsErrorMessages.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SpeedSmsSender.java`
- Create: `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/SmsErrorMessagesTest.java`
- Create: `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/SpeedSmsSenderTest.java`

**Interfaces:**
- Consumes: `SmsSendResult`, `SmsSender` (Task 2)
- Produces:
  - `public final class vn.ShuttleHub.backend.auth.sms.SmsErrorMessages` với `public static String forCode(String code)` → message tiếng Việt; code không biết → trả message mặc định *"Không thể gửi mã xác nhận. Vui lòng thử lại sau."*
  - `public class vn.ShuttleHub.backend.auth.sms.SpeedSmsSender implements SmsSender` — constructor: `public SpeedSmsSender(RestClient.Builder builder, String accessToken, String sender, int smsType, String phoneFormat)`; `@Component` + `@ConditionalOnProperty(name = "app.sms.provider", havingValue = "speedsms")`

- [ ] **Step 1: Viết test failing cho `SmsErrorMessages`**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/SmsErrorMessagesTest.java`:

| Test | Khẳng định |
|---|---|
| `forCode_105_returnsPhoneInvalid` | equals `"Số điện thoại không hợp lệ."` |
| `forCode_300_returnsOverload` | equals `"Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau."` |
| `forCode_110_returnsUnsupportedContent` | equals `"Nội dung tin nhắn không được hỗ trợ. Vui lòng thử lại sau."` |
| `forCode_113_returnsTooLong` | equals `"Nội dung tin nhắn quá dài."` |
| `forCode_101_returnsGeneric` | equals `"Không thể gửi mã xác nhận. Vui lòng thử lại sau."` |
| `forCode_007_returnsUnavailable` | equals `"Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau."` |
| `forCode_008_returnsUnavailable` | equals *"Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau."* |
| `forCode_009_returnsUnavailable` | equals *"Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau."* |
| `forCode_500_returnsGeneric` | equals *"Không thể gửi mã xác nhận. Vui lòng thử lại sau."* |
| `forCode_unknown_returnsGeneric` | `forCode("999")` equals *"Không thể gửi mã xác nhận. Vui lòng thử lại sau."* |
| `forCode_null_returnsGeneric` | `forCode(null)` equals message mặc định |

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=SmsErrorMessagesTest`
Expected: FAIL — chưa có `SmsErrorMessages`.

- [ ] **Step 3: Implement `SmsErrorMessages`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SmsErrorMessages.java`:

```java
package vn.ShuttleHub.backend.auth.sms;

import java.util.Map;

public final class SmsErrorMessages {

    private SmsErrorMessages() {}

    private static final String DEFAULT_MESSAGE = "Không thể gửi mã xác nhận. Vui lòng thử lại sau.";
    private static final String UNAVAILABLE_MESSAGE = "Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau.";

    private static final Map<String, String> BY_CODE = Map.ofEntries(
        Map.entry("007", UNAVAILABLE_MESSAGE),
        Map.entry("008", UNAVAILABLE_MESSAGE),
        Map.entry("009", UNAVAILABLE_MESSAGE),
        Map.entry("101", DEFAULT_MESSAGE),
        Map.entry("105", "Số điện thoại không hợp lệ."),
        Map.entry("110", "Nội dung tin nhắn không được hỗ trợ. Vui lòng thử lại sau."),
        Map.entry("113", "Nội dung tin nhắn quá dài."),
        Map.entry("300", "Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau."),
        Map.entry("500", DEFAULT_MESSAGE)
    );

    public static String forCode(String code) {
        if (code == null) {
            return DEFAULT_MESSAGE;
        }
        return BY_CODE.getOrDefault(code.trim(), DEFAULT_MESSAGE);
    }
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=SmsErrorMessagesTest`
Expected: PASS.

- [ ] **Step 5: Viết test failing cho `SpeedSmsSender`**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/sms/SpeedSmsSenderTest.java`.

Dùng `org.springframework.test.web.client.MockRestServiceServer` bind vào `RestClient.Builder` để kiểm tra **format request** và **parse response** mà không gọi mạng:

```java
RestClient.Builder builder = RestClient.builder();
MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
SpeedSmsSender sender = new SpeedSmsSender(builder, "TOKEN123", "CauLongDee", 2, "national");
```

Bảng test bắt buộc:

| Test | Kỳ vọng |
|---|---|
| `sendOtp_postsJsonToCorrectUrl` | Request tới `https://api.speedsms.vn/index.php/sms/send`, method `POST`, header `Content-Type` chứa `application/json`, header `Authorization` chứa `Basic ` + Base64 của `"TOKEN123:x"` |
| `sendOtp_bodyHasToContentSmsTypeSender` | Body JSON: `to` = `["0912345678"]` (vì `phoneFormat=national`), `content` chứa `"Ma xac nhan: 123456"`, `sms_type` = `2`, `sender` = `""` (vì type 2 không dùng brand) |
| `sendOtp_bodyUsesE164WhenConfigured` | Với `phoneFormat="e164"` → `to` = `["84912345678"]` |
| `sendOtp_usesSenderForBrandnameType` | Với `smsType=3` → `sender` = `"CauLongDee"` |
| `sendOtp_successResponse_returnsOk` | Response `{"status":"success","code":"00","data":{"tranId":"1","totalSMS":1,"totalPrice":350,"invalidPhone":[]}}` → `success()` is `true`, `errorCode()` is `null` |
| `sendOtp_errorCode300_failsWithVietnameseMessage` | Response `{"status":"error","code":"300","message":"..."}` → `success()` is `false`, `errorCode()` equals `"300"`, `errorMessage()` equals *"Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau."* |
| `sendOtp_errorCode105_failsWithPhoneInvalid` | Response `{"status":"error","code":"105",...}` → `errorMessage()` equals *"Số điện thoại không hợp lệ."* |
| `sendOtp_httpError500_failsWithoutLeakingBody` | Server trả HTTP 500 với body chứa `"SUPER_SECRET_INTERNAL_DETAIL"` → `success()` is `false`, `errorCode()` equals `"http_error"`, `errorMessage()` equals *"Không thể gửi mã xác nhận. Vui lòng thử lại sau."*, và `errorMessage()` **không** chứa `"SUPER_SECRET_INTERNAL_DETAIL"` |
| `sendOtp_malformedJson_failsWithoutLeakingBody` | Response body `"not-json"` → `success()` is `false`, `errorCode()` equals `"invalid_response"`, `errorMessage()` không chứa raw body |
| `exposesCode_isFalse` | `sender.exposesCode()` is `false` |

Để đọc body request dùng `ContentRequest.getBodyAsString()`; `MockRestServiceServer` cần `expect(requestTo(...))`, `andExpect(method(...))`, `andExpect(header(...))`, `andRespond(withSuccess(json, MediaType.APPLICATION_JSON))`.

- [ ] **Step 6: Chạy test để xác nhận FAIL**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=SpeedSmsSenderTest`
Expected: FAIL — chưa có `SpeedSmsSender`.

- [ ] **Step 7: Implement `SpeedSmsSender`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/sms/SpeedSmsSender.java`:

```java
package vn.ShuttleHub.backend.auth.sms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "speedsms")
public class SpeedSmsSender implements SmsSender {

    private static final String SEND_URL = "https://api.speedsms.vn/index.php/sms/send";
    private static final String MESSAGE_TEMPLATE =
        "[Cầu Lông dee] Ma xac nhan: %s. Het han sau 5 phut.";

    private final RestClient restClient;
    private final String accessToken;
    private final String sender;
    private final int smsType;
    private final String phoneFormat;
    private final ObjectMapper objectMapper;

    public SpeedSmsSender(
        RestClient.Builder builder,
        @Value("${app.sms.access-token}") String accessToken,
        @Value("${app.sms.sender}") String sender,
        @Value("${app.sms.type}") int smsType,
        @Value("${app.sms.phone-format}") String phoneFormat
    ) {
        this.restClient = builder.build();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.sender = sender == null ? "" : sender.trim();
        this.smsType = smsType;
        this.phoneFormat = phoneFormat == null ? "national" : phoneFormat.trim();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public SmsSendResult sendOtp(String phone, String otpCode) {
        if (accessToken.isEmpty()) {
            log.error("[SMS] Thiếu SPEEDSMS_ACCESS_TOKEN. Không thể gửi OTP tới {}.", phone);
            return SmsSendResult.fail("missing_token", SmsErrorMessages.forCode("101"));
        }

        String content = String.format(MESSAGE_TEMPLATE, otpCode);
        String recipient = formatPhone(phone);
        // brand chỉ dùng cho sms_type 3 (brandname) và 5 (app android).
        // sms_type 2 (CSKH) không cần brand → gửi chuỗi rỗng cho đúng tài liệu.
        String brand = (smsType == 3 || smsType == 5) ? sender : "";

        try {
            String body = restClient.post()
                .uri(SEND_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", basicAuth())
                .body(new SendSmsRequest(new String[]{recipient}, content, smsType, brand))
                .retrieve()
                .body(String.class);

            return parseResponse(body, recipient);
        } catch (RestClientException ex) {
            // Không lộ raw body của SpeedSMS cho client — chỉ log server.
            log.error("[SMS] Gửi OTP tới {} thất bại: {}", recipient, ex.getMessage());
            return SmsSendResult.fail("http_error", SmsErrorMessages.forCode("500"));
        }
    }

    private String basicAuth() {
        String credentials = accessToken + ":x";
        return "Basic " + Base64.getEncoder()
            .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    private String formatPhone(String phone) {
        // phone đã chuẩn hoá E.164 (84xxxxxxxxx) ở tầng DTO.
        if ("e164".equalsIgnoreCase(phoneFormat)) {
            return phone;
        }
        // national: 84912345678 → 0912345678 (khớp ví dụ chính thức của SpeedSMS)
        if (phone != null && phone.startsWith("84") && phone.length() == 11) {
            return "0" + phone.substring(2);
        }
        return phone;
    }

    private SmsSendResult parseResponse(String body, String recipient) {
        if (body == null || body.isBlank()) {
            log.error("[SMS] SpeedSMS trả về body rỗng cho {}", recipient);
            return SmsSendResult.fail("empty_response", SmsErrorMessages.forCode("500"));
        }
        try {
            JsonNode node = objectMapper.readTree(body);
            String status = node.path("status").asText("");
            if ("success".equalsIgnoreCase(status)) {
                return SmsSendResult.ok();
            }
            String code = node.path("code").asText(null);
            log.error("[SMS] SpeedSMS từ chối tới {}: code={} message={}", recipient, code, node.path("message").asText(""));
            return SmsSendResult.fail(code, SmsErrorMessages.forCode(code));
        } catch (Exception ex) {
            log.error("[SMS] Không parse được response SpeedSMS cho {}: {}", recipient, ex.getMessage());
            return SmsSendResult.fail("invalid_response", SmsErrorMessages.forCode("500"));
        }
    }

    /** Body JSON đúng format SpeedSMS yêu cầu. */
    public record SendSmsRequest(String[] to, String content, int sms_type, String sender) {}
}
```

⚠️ **Quan trọng — 2 điểm dễ sai:**
- Record `SendSmsRequest` dùng tên field `sms_type` (có dấu gạch dưới) để JSON ra đúng tên mà SpeedSMS yêu cầu. Jackson mặc định đặt tên property theo đúng tên field.
- `RestClient.Builder` là bean do Spring Boot auto-config (`RestClientAutoConfiguration`). Class nhận builder qua constructor → Spring inject được.

- [ ] **Step 8: Chạy test để xác nhận PASS**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=SpeedSmsSenderTest`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/vn/ShuttleHub/backend/auth/sms backend/src/test/java/vn/ShuttleHub/backend/auth/sms
git commit -m "feat(sms): them SpeedSmsSender goi API JSON dung chuan SpeedSMS"
```

---

### Task 4: Chọn provider theo config + profile môi trường + wiring lại luồng OTP

**Files:**
- Modify: `backend/src/main/resources/application.properties`
- Modify: `backend/src/main/resources/application.properties.template`
- Create: `backend/src/main/resources/application-local.properties.template`
- Delete: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/SmsService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OtpService.java`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/AuthController.java`

**Interfaces:**
- Consumes: `SmsSender`, `SmsSendResult` (Task 2), `SpeedSmsSender`/`MockSmsSender` (Task 2, 3)
- Produces:
  - `public String vn.ShuttleHub.backend.auth.service.OtpService.sendOtp(String phone, String clientIp)` → trả mã OTP nếu provider là mock, ngược lại `null`. Ném `RateLimitException` khi vượt giới hạn IP.
  - `public AuthResponse vn.ShuttleHub.backend.auth.service.AuthService.register(RegisterRequest req)` — không đổi chữ ký.

- [ ] **Step 1: Cập nhật `application.properties`**

Xoá khối `app.sms.mock=true` và toàn bộ comment MOCK MODE đi kèm. Thay bằng:

```properties
# ----- SMS (SpeedSMS.vn) -----
# provider: mock | speedsms
#   mock     → in OTP ra log, KHÔNG gọi mạng, không tốn tiền (dùng cho dev)
#   speedsms → gọi API SpeedSMS thật
# Giá trị khác → app FAIL lúc start (bắt buộc, không fallback im lặng)
app.sms.provider=speedsms
# Lấy access token tại https://speedsms.vn/my-account/api
app.sms.access-token=${SPEEDSMS_ACCESS_TOKEN:}
# Tên brand người gửi — CHỈ dùng khi app.sms.type=3 hoặc 5.
# Brand phải được SpeedSMS duyệt trước, nếu không sẽ bị từ chối.
app.sms.sender=${SPEEDSMS_SENDER:CauLongDee}
# Loại tin: 2=CSKH (không cần brand, hỗ trợ tiếng Việt có dấu)
#           3=brandname (cần brand duyệt, KHÔNG hỗ trợ tiếng Việt có dấu)
#           6=đầu số cố định
app.sms.type=2
# Định dạng số gửi đi: national (0912345678) | e164 (84912345678)
app.sms.phone-format=national
# Tối đa số lần gửi OTP / giờ / IP (chặn đốt tiền tài khoản)
app.sms.max-sends-per-hour-per-ip=10

# Số lần đăng ký tối đa / 1 số điện thoại / 24 giờ (chặn spam tạo account)
app.otp.max-registrations-per-phone-per-day=3
```

Thêm cùng các key `app.sms.*` và `app.otp.max-registrations-per-phone-per-day` vào `application.properties.template` (giữ nguyên phần comment giải thích trong file template).

- [ ] **Step 2: Tạo `application-local.properties.template`**

Tạo `backend/src/main/resources/application-local.properties.template`:

```properties
# =====================================================================
# application-local.properties
# Profile DEV — KHÔNG commit file thật lên git (đã có trong .gitignore)
#
# Cách dùng:
#   1. Copy file này thành application-local.properties
#   2. Chạy: .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
#
# Profile này CHỈ ghi đè những key cần khác. Mọi key còn lại vẫn lấy
# từ application.properties (DB, JWT, CORS...).
# =====================================================================

# Provider SMS: mock → in OTP ra console log, KHÔNG gửi tin thật, không tốn tiền.
# Nhờ vậy test được trọn luồng đăng ký mà không mất tiền SMS.
app.sms.provider=mock
```

- [ ] **Step 3: Xoá `SmsService.java`**

Xoá file `backend/src/main/java/vn/ShuttleHub/backend/auth/service/SmsService.java`.

⚠️ Sau bước này project **sẽ không compile** cho tới khi Step 5 sửa `OtpService`. Đó là chấp nhận được — các bước tiếp theo sửa ngay.

- [ ] **Step 4: Viết `SmsRateLimiter` (cần cho Task 4 vì `OtpService` sẽ dùng)**

Tạo `backend/src/main/java/vn/ShuttleHub/backend/auth/service/SmsRateLimiter.java`:

```java
package vn.ShuttleHub.backend.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn số lần gửi OTP theo IP trong 1 giờ.
 *
 * ⚠️ Vì sao cần? Rate-limit theo SĐT (cooldown 60s) KHÔNG chặn được
 * kẻ xấu gọi send-otp với 1000 số khác nhau → mỗi lần là 1 tin SMS thật
 * → đốt tiền tài khoản SpeedSMS. Giới hạn theo IP chặn được việc này.
 *
 * ⚠️ Giới hạn đã biết: lưu in-memory nên restart backend là reset,
 * và KHÔNG áp dụng khi chạy nhiều instance. Chấp nhận ở giai đoạn hiện tại.
 */
@Slf4j
@Component
public class SmsRateLimiter {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final int maxPerWindow;
    private final Map<String, Deque<Instant>> hitsByIp = new ConcurrentHashMap<>();

    public SmsRateLimiter(@Value("${app.sms.max-sends-per-hour-per-ip}") int maxPerWindow) {
        this.maxPerWindow = maxPerWindow;
    }

    /**
     * Ghi nhận 1 lần gửi cho IP.
     *
     * @return true nếu được phép gửi; false nếu đã vượt giới hạn
     */
    public boolean tryAcquire(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return true;   // không xác định IP → không chặn (fallback an toàn cho dev)
        }
        Instant now = Instant.now();
        Deque<Instant> hits = hitsByIp.computeIfAbsent(clientIp, k -> new ArrayDeque<>());

        synchronized (hits) {
            hits.removeIf(t -> t.isBefore(now.minus(WINDOW)));
            if (hits.size() >= maxPerWindow) {
                return false;
            }
            hits.addLast(now);
            return true;
        }
    }
}
```

- [ ] **Step 5: Viết test cho `SmsRateLimiter`**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/service/SmsRateLimiterTest.java`:

| Test | Khẳng định |
|---|---|
| `tryAcquire_allowsUpToLimit` | `new SmsRateLimiter(3)` → 3 lần đầu `true` |
| `tryAcquire_blocksOverLimit` | lần thứ 4 → `false` |
| `tryAcquire_isolatesPerIp` | IP khác → `true` |
| `tryAcquire_nullIp_isAllowed` | `tryAcquire(null)` → `true` |

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=SmsRateLimiterTest`
Expected: PASS.

- [ ] **Step 7: Sửa `OtpService` dùng `SmsSender` + `SmsRateLimiter`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/service/OtpService.java`:

- Đổi field `private final SmsService smsService;` → `private final SmsSender smsSender;`
- Thêm field `private final SmsRateLimiter smsRateLimiter;`
- Đổi chữ ký method: `public String sendOtp(String phone)` → `public String sendOtp(String phone, String clientIp)`
- Đầu method (sau khi check cooldown theo SĐT), thêm check IP:

```java
if (!smsRateLimiter.tryAcquire(clientIp)) {
    throw new RateLimitException("Bạn đã gửi quá nhiều mã xác nhận. Vui lòng thử lại sau.");
}
```

- Thay đoạn gửi SMS:

```java
SmsSendResult result = smsSender.sendOtp(phone, code);
if (!result.success()) {
    log.error("[SMS] Gửi OTP tới {} thất bại: {} (code={})", phone, result.errorMessage(), result.errorCode());
    throw new SmsSendException(result.errorMessage());
}
```

- Thay đoạn trả mã: `return smsService.isMock() ? code : null;` → `return smsSender.exposesCode() ? code : null;`
- Thêm import: `vn.ShuttleHub.backend.auth.sms.SmsSender`, `vn.ShuttleHub.backend.auth.sms.SmsSendResult`.

⚠️ Giữ nguyên `@Transactional` và toàn bộ logic rate-limit theo SĐT hiện có. **Không** xoá `otpRepo.countByPhoneAndCreatedAtAfter(...)`.

- [ ] **Step 8: Sửa `AuthController` truyền IP xuống**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/controller/AuthController.java`:

- Import `jakarta.servlet.http.HttpServletRequest`.
- Đổi method `sendOtp`:

```java
@PostMapping("/send-otp")
public ResponseEntity<ApiResponse<Map<String, String>>> sendOtp(
        @Valid @RequestBody SendOtpRequest req,
        HttpServletRequest httpRequest) {
    String otp = otpService.sendOtp(req.phone(), httpRequest.getRemoteAddr());

    Map<String, String> data = null;
    if (otp != null) {
        // Mock mode: trả mã về cho FE hiển thị (dev only)
        data = Map.of("otp", otp, "mock", "true");
    }

    return ResponseEntity.ok(
        ApiResponse.success("Mã OTP đã được gửi về SĐT của bạn.", data)
    );
}
```

⚠️ Comment cũ trong method nói "Khi app.sms.mock=true" → sửa thành "Khi provider là mock".

- [ ] **Step 9: Build để kiểm tra compile**

Run: `cd backend; .\mvnw.cmd -o -q package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 10: Test profile dev (mock) — chưa tốn tiền**

Tạo file local (KHÔNG commit): `backend/src/main/resources/application-local.properties` với nội dung:
```properties
app.sms.provider=mock
```

Run: `cd backend; .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`
Expected trong log: `Started BackendApplication`.

Test API:
```powershell
curl.exe -X POST http://localhost:8080/api/auth/send-otp -H "Content-Type: application/json" -d '{"phone":"0912345678"}'
```
Expected: HTTP 200, `data.otp` có 6 chữ số, `data.mock` = `"true"`.

- [ ] **Step 11: Test provider không hợp lệ → app fail lúc start**

Tạm sửa `application-local.properties` thành `app.sms.provider=bogus`, chạy lại app.
Expected: startup FAIL với message Spring Boot nói rõ không có bean `SmsSender` phù hợp. Sửa lại thành `mock`.

- [ ] **Step 12: Commit**

```bash
git add backend/src/main/resources backend/src/main/java/vn/ShuttleHub/backend/auth/service/OtpService.java backend/src/main/java/vn/ShuttleHub/backend/auth/service/SmsRateLimiter.java backend/src/main/java/vn/ShuttleHub/backend/auth/controller/AuthController.java backend/src/test/java/vn/ShuttleHub/backend/auth/service/SmsRateLimiterTest.java
git rm backend/src/main/java/vn/ShuttleHub/backend/auth/service/SmsService.java
git commit -m "refactor(sms): tach SmsSender thanh 2 provider, them rate-limit theo IP"
```

---

### Task 5: Giới hạn số lần đăng ký trên 1 số điện thoại

**Files:**
- Create: `backend/src/main/java/vn/ShuttleHub/backend/entity/RegistrationAttempt.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/repository/RegistrationAttemptRepository.java`
- Create: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/RegistrationAttemptService.java`
- Create: `backend/src/main/resources/db/migration/V5__create_registration_attempts.sql`
- Modify: `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java`
- Create: `backend/src/test/java/vn/ShuttleHub/backend/auth/service/RegistrationAttemptServiceTest.java`
- Create: `backend/src/test/java/vn/ShuttleHub/backend/auth/service/AuthServiceRegistrationLimitTest.java`

**Interfaces:**
- Consumes: `UserRepository`, `OtpService`, `PasswordEncoder`, `JwtService` (đã có sẵn trong `AuthService`)
- Produces:
  - `public class vn.ShuttleHub.backend.entity.RegistrationAttempt` — field `id` (String, UUID), `phone` (String), `createdAt` (LocalDateTime). Bảng `registration_attempts`.
  - `public interface vn.ShuttleHub.backend.repository.RegistrationAttemptRepository extends JpaRepository<RegistrationAttempt, String>` với `long countByPhoneAndCreatedAtAfter(String phone, LocalDateTime after)` và `long deleteByPhoneAndCreatedAtBefore(String phone, LocalDateTime before)`
  - `public class vn.ShuttleHub.backend.auth.service.RegistrationAttemptService` với `public long countRegistrationsInLast24h(String phone)` và `public void recordRegistration(String phone)`
  - `AuthService.register(RegisterRequest req)` — giữ nguyên chữ ký, thêm check giới hạn.

- [ ] **Step 1: Viết migration `V5__create_registration_attempts.sql`**

Tạo `backend/src/main/resources/db/migration/V5__create_registration_attempts.sql`:

```sql
-- =====================================================================
-- V5__create_registration_attempts.sql
-- Bảng đếm số lần đăng ký tài khoản theo số điện thoại.
--
-- ⚠️ Vì sao cần bảng riêng (không dùng bảng users)?
--   users chỉ chứa user ĐĂNG KÝ THÀNH CÔNG. Kẻ spam dùng 1 số điện
--   thoại để đăng ký nhiều tài khoản → users sẽ chặn (unique) nhưng
--   vẫn tốn 1 tin SMS cho mỗi lần đăng ký thất bại.
--   Bảng này đếm MỌI lần đăng ký (kể cả thất bại) để chặn đốt tiền SMS.
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
```

- [ ] **Step 2: Tạo entity `RegistrationAttempt`**

`backend/src/main/java/vn/ShuttleHub/backend/entity/RegistrationAttempt.java`:

```java
package vn.ShuttleHub.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Ghi lại mỗi lần user thử đăng ký, để giới hạn spam theo số điện thoại.
 */
@Entity
@Table(
    name = "registration_attempts",
    indexes = {
        @Index(name = "idx_reg_attempt_phone_created", columnList = "phone, created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private String id;

    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
```

- [ ] **Step 3: Tạo `RegistrationAttemptRepository`**

`backend/src/main/java/vn/ShuttleHub/backend/repository/RegistrationAttemptRepository.java`:

```java
package vn.ShuttleHub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.ShuttleHub.backend.entity.RegistrationAttempt;

import java.time.LocalDateTime;

@Repository
public interface RegistrationAttemptRepository extends JpaRepository<RegistrationAttempt, String> {

    long countByPhoneAndCreatedAtAfter(String phone, LocalDateTime after);

    long deleteByPhoneAndCreatedAtBefore(String phone, LocalDateTime before);
}
```

- [ ] **Step 4: Viết test failing cho `RegistrationAttemptService`**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/service/RegistrationAttemptServiceTest.java` dùng Mockito (`@ExtendWith(MockitoExtension.class)`, `@Mock RegistrationAttemptRepository`, `@InjectMocks RegistrationAttemptService`).

| Test | Kỳng định |
|---|---|
| `countRegistrationsInLast24h_delegatesToRepository` | Stub `countByPhoneAndCreatedAtAfter(anyString(), any())` → `2L` → kết quả `2L` |
| `countRegistrationsInLast24h_deletesOldRowsFirst` | Verify `deleteByPhoneAndCreatedAtBefore(eq("84912345678"), any())` được gọi **1 lần** |
| `recordRegistration_savesRowWithPhoneAndCreatedAt` | Verify `save(any(RegistrationAttempt.class))` được gọi, và entity lưu có `phone` = số truyền vào, `createdAt` khác null |

- [ ] **Step 5: Chạy test để xác nhận FAIL**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=RegistrationAttemptServiceTest`
Expected: FAIL — chưa có `RegistrationAttemptService`.

- [ ] **Step 6: Implement `RegistrationAttemptService`**

`backend/src/main/java/vn/ShuttleHub/backend/auth/service/RegistrationAttemptService.java`:

```java
package vn.ShuttleHub.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.ShuttleHub.backend.entity.RegistrationAttempt;
import vn.ShuttleHub.backend.repository.RegistrationAttemptRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RegistrationAttemptService {

    private static final int WINDOW_HOURS = 24;
    private static final int RETENTION_DAYS = 7;

    private final RegistrationAttemptRepository repo;

    /**
     * Đếm số lần đăng ký của SĐT trong 24h gần nhất.
     *
     * ⚠️ Đồng thời xoá bản ghi cũ hơn 7 ngày (dọn lười) để bảng không
     * phình vô hạn — không cần job @Scheduled.
     */
    @Transactional
    public long countRegistrationsInLast24h(String phone) {
        LocalDateTime now = LocalDateTime.now();
        repo.deleteByPhoneAndCreatedAtBefore(phone, now.minusDays(RETENTION_DAYS));
        return repo.countByPhoneAndCreatedAtAfter(phone, now.minusHours(WINDOW_HOURS));
    }

    /**
     * Ghi lại 1 lần đăng ký.
     *
     * ⚠️ REQUIRES_NEW: lần ghi phải được COMMIT kể cả khi transaction cha
     * (register) rollback sau đó — nếu không, kẻ spam đăng ký lỗi liên tục
     * sẽ không bao giờ bị đếm.
     *
     * ⚠️ Tách class riêng (không gọi this.recordRegistration) vì Spring
     * quản lý transaction qua PROXY — tự gọi sẽ bỏ qua @Transactional.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRegistration(String phone) {
        repo.save(RegistrationAttempt.builder()
            .phone(phone)
            .createdAt(LocalDateTime.now())
            .build());
    }
}
```

- [ ] **Step 7: Chạy test để xác nhận PASS**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=RegistrationAttemptServiceTest`
Expected: PASS.

- [ ] **Step 8: Viết test failing cho giới hạn trong `AuthService`**

Tạo `backend/src/test/java/vn/ShuttleHub/backend/auth/service/AuthServiceRegistrationLimitTest.java` dùng Mockito.

Mock: `UserRepository`, `RefreshTokenRepository`, `OtpService`, `JwtService`, `PasswordEncoder`, `RegistrationAttemptService`.

| Test | Kỳ vịnh | Khẳng định |
|---|---|---|
| `register_blocksWhenLimitReached` | `countRegistrationsInLast24h` → `3L` | Ném `RateLimitException`; `userRepo.save` **không** được gọi |
| `register_allowsBelowLimit` | → `2L` | Không ném; `userRepo.save` được gọi 1 lần |
| `register_doesNotCountWhenEmailExists` | `existsByEmail` → `true` | Ném `EmailAlreadyExistsException`; verify `registrationAttemptService.recordRegistration(...)` **không** được gọi |
| `register_recordsAttemptAfterSuccess` | `countRegistrationsInLast24h` → `0L` | verify `registrationAttemptService.recordRegistration(eq("84912345678"))` được gọi 1 lần |

⚠️ `AuthService` hiện dùng `@RequiredArgsConstructor` → các field mock sẽ được inject qua constructor. Thêm `RegistrationAttemptService` vào danh sách field của `AuthService` (Step 9) thì test tự động khớp.

⚠️ Với `register_allowsBelowLimit` và `register_recordsAttemptAfterSuccess`: `AuthService.register()` gọi `buildAuthResponse(user)` → cần `jwtService.generateAccessToken(...)` và `generateRefreshToken(...)` trả giá trị khác null, và `refreshTokenRepo.save(...)` không ném.

- [ ] **Step 9: Sửa `AuthService`**

Trong `backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java`:

- Thêm field: `private final RegistrationAttemptService registrationAttemptService;`
- Thêm field `@Value("${app.otp.max-registrations-per-phone-per-day}") private int maxRegistrationsPerPhonePerDay;`

⚠️ `AuthService` dùng `@RequiredArgsConstructor` → field `@Value` **không** được constructor-inject. Dùng `@Value` trên field sẽ không được set. → Phải dùng constructor injection thủ công cho key này. Cách an toàn: **không** dùng `@Value` trên field; khai báo hằng số cấu hình qua constructor:

Sửa thành:
```java
private final RegistrationAttemptService registrationAttemptService;
private final int maxRegistrationsPerPhonePerDay;

public AuthService(
    UserRepository userRepo,
    RefreshTokenRepository refreshTokenRepo,
    OtpService otpService,
    JwtService jwtService,
    PasswordEncoder passwordEncoder,
    RegistrationAttemptService registrationAttemptService,
    @Value("${app.otp.max-registrations-per-phone-per-day}") int maxRegistrationsPerPhonePerDay
) {
    this.userRepo = userRepo;
    this.refreshTokenRepo = refreshTokenRepo;
    this.otpService = otpService;
    this.jwtService = jwtService;
    this.passwordEncoder = passwordEncoder;
    this.registrationAttemptService = registrationAttemptService;
    this.maxRegistrationsPerPhonePerDay = maxRegistrationsPerPhonePerDay;
}
```

⚠️ Bỏ `@RequiredArgsConstructor` khỏi class khi chuyển sang constructor thủ công.

- Trong `register()`, sau khi check trùng email/username/phone, chèn:

```java
// Chặn spam đăng ký: giới hạn số lần đăng ký trên 1 số điện thoại.
// Kiểm tra TRƯỚC khi tạo user → không tạo user rác.
long attempts = registrationAttemptService.countRegistrationsInLast24h(req.phone());
if (attempts >= maxRegistrationsPerPhonePerDay) {
    throw new RateLimitException(
        "Số điện thoại này đã đăng ký quá nhiều lần. Vui lòng thử lại sau."
    );
}
```

- Sau `user = userRepo.save(user);`, thêm:

```java
// Ghi lại lần đăng ký SAU khi tạo user thành công → chỉ tính lần đăng ký thật.
// Nếu đăng ký fail do email trùng, lần đó KHÔNG bị tính.
registrationAttemptService.recordRegistration(req.phone());
```

- Thêm import `vn.ShuttleHub.backend.auth.exception.RateLimitException` và `org.springframework.beans.factory.annotation.Value`.

⚠️ `req.phone()` đã chuẩn hoá E.164 ở DTO (Task 1) → dùng thẳng, không cần normalize lại.

- [ ] **Step 10: Chạy test để xác nhận PASS**

Run: `cd backend; .\mvnw.cmd -o test -Dtest=AuthServiceRegistrationLimitTest`
Expected: PASS.

- [ ] **Step 11: Chạy toàn bộ test backend**

Run: `cd backend; .\mvnw.cmd -o test`
Expected: BUILD SUCCESS, tất cả test PASS (không có test nào đỏ).

- [ ] **Step 12: Chạy app để Flyway apply V5**

Run: `cd backend; .\mvnw.cmd spring-boot:run`
Expected trong log: `Successfully applied 1 migration` (V5) và `Started BackendApplication`.

Verify bảng:
```powershell
psql -U postgres -d postgres -c "\d registration_attempts"
```
Expected: có cột `id`, `phone`, `created_at` và index `idx_reg_attempt_phone_created`.

- [ ] **Step 13: Commit**

```bash
git add backend/src/main/java/vn/ShuttleHub/backend/entity/RegistrationAttempt.java backend/src/main/java/vn/ShuttleHub/backend/repository/RegistrationAttemptRepository.java backend/src/main/java/vn/ShuttleHub/backend/auth/service/RegistrationAttemptService.java backend/src/main/java/vn/ShuttleHub/backend/auth/service/AuthService.java backend/src/main/resources/db/migration/V5__create_registration_attempts.sql backend/src/test/java/vn/ShuttleHub/backend/auth/service
git commit -m "feat(auth): gioi han so lan dang ky tren 1 so dien thoai"
```

---

### Task 6: Test thực tế với SMS thật + cập nhật README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: mọi thứ từ Task 1–5
- Produces: không có interface mới

- [ ] **Step 1: Chạy backend với provider thật**

Đặt biến môi trường trước khi chạy (PowerShell):
```powershell
cd backend
$env:SPEEDSMS_ACCESS_TOKEN = "<token thật của bạn>"
.\mvnw.cmd spring-boot:run
```
Expected: `Started BackendApplication`.

- [ ] **Step 2: Test gửi SMS thật**

```powershell
curl.exe -X POST http://localhost:8080/api/auth/send-otp -H "Content-Type: application/json" -d '{"phone":"0912345678"}'
```
Expected: HTTP 200, response **KHÔNG** chứa `data.otp`.

**Nếu không nhận được tin**, đọc log server — `errorCode` trong log cho biết nguyên nhân:

| errorCode trong log | Nguyên nhân | Cách xử lý |
|---|---|---|
| `101` | Sai format payload → kiểm tra lại `Content-Type` / tên field | Kiểm tra lại Task 3 |
| `105` | Số điện thoại sai định dạng | Đổi `app.sms.phone-format` từ `national` sang `e164` |
| `300` | Hết tiền | Nạp tiền tại speedsms.vn |
| `009` | Tài khoản chưa được cấp quyền gọi API | Liên hệ SpeedSMS |
| `missing_token` | Chưa set `SPEEDSMS_ACCESS_TOKEN` | Set lại biến môi trường |
| `http_error` | Lỗi HTTP / mạng | Kiểm tra kết nối, thử lại |

- [ ] **Step 3: Test luồng đăng ký đầy đủ với SMS thật**

Nhận OTP trên điện thoại → POST `/api/auth/register` với đúng OTP đó.
Expected: HTTP 200, trả về `accessToken` + `refreshToken` + thông tin user.

- [ ] **Step 4: Test format API đúng (bằng chứng)**

Xem log server ở Step 2 — phải có dòng ghi kết quả SpeedSMS. Nếu `status=success` → format API đúng.

- [ ] **Step 5: Test lỗi token sai → 503 chứ không phải 500**

```powershell
$env:SPEEDSMS_ACCESS_TOKEN = "token_sai"
curl.exe -X POST http://localhost:8080/api/auth/send-otp -H "Content-Type: application/json" -d '{"phone":"0912345678"}'
```
Expected: HTTP **503**, `message` tiếng Việt, KHÔNG phải 500.

- [ ] **Step 6: Test rate-limit IP**

Gọi `send-otp` liên tiếp 11 lần với các số khác nhau trong 1 giờ.
Expected: từ lần thứ 11 trả HTTP **429**.

- [ ] **Step 7: Test giới hạn đăng ký**

Với profile local (`app.sms.provider=mock`), đăng ký 4 lần cùng 1 số điện thoại (đổi email mỗi lần).
Expected: lần 1–3 thành công, lần 4 trả HTTP **429** với message *"Số điện thoại này đã đăng ký quá nhiều lần. Vui lòng thử lại sau."*

Verify bộ đếm:
```powershell
psql -U postgres -d postgres -c "SELECT phone, count(*) FROM registration_attempts GROUP BY phone;"
```
Expected: đếm đúng số lần đăng ký thành công.

- [ ] **Step 8: Test lần đăng ký fail KHÔNG bị tính**

Đăng ký lại với email đã tồn tại.
Expected: HTTP 409, và `count(*)` trong bảng `registration_attempts` **không tăng**.

- [ ] **Step 9: Cập nhật `README.md`**

Cập nhật 3 mục:

1. **Mục "🌐 API Endpoints"** — thêm ghi chú: `POST /api/auth/send-otp` giờ có rate-limit theo IP (10 lần/giờ) và giới hạn đăng ký 3 lần/24h/số điện thoại.
2. **Mục "📈 Tiến trình dự án"** — cập nhật hạng mục 1.1 (Gửi OTP qua SpeedSMS) → giữ `✅` nhưng ghi rõ đã dùng `sms_type=2`; hạng mục 1.8 (Quên mật khẩu) vẫn `⬜`.
3. **Thêm hạng mục mới** vào Giai đoạn 1: `1.9 | Rate-limit gửi OTP theo IP + giới hạn đăng ký/SĐT/ngày | ✅`.

- [ ] **Step 10: Build lại toàn bộ để chắc chắn**

```powershell
cd backend
.\mvnw.cmd -o -q package -DskipTests
cd ..\frontend
.\node_modules\.bin\tsc --noEmit
npm run build
```
Expected: cả 3 lệnh thành công, không lỗi.

⚠️ Frontend **không** đổi file nào trong plan này → chỉ chạy để chắc chắn không vỡ.

- [ ] **Step 11: Commit**

```bash
git add README.md
git commit -m "docs: cap nhat tien trinh va API endpoints sau khi hoan tat SMS OTP that"
```

---

## Self-Review

**1. Spec coverage:**

| Mục spec | Task |
|---|---|
| 4.1 Cấu trúc package mới | Task 2, 3, 4, 5 |
| 4.2 Interface `SmsSender` + `SmsSendResult` | Task 2 |
| 4.3 Chọn bean bằng config, bỏ `app.sms.mock` | Task 4 (Step 1, 11) |
| 4.4 Profile môi trường | Task 4 (Step 1, 2) |
| 4.5.1 Sửa format API (JSON + Basic + `sms_type`) | Task 3 (Step 7) |
| 4.5.2 Chọn `sms_type=2` | Task 3 (Step 7), Task 4 (Step 1) |
| 4.5.3 Encode non-ASCII | Task 3 — **KHÔNG cần** vì nội dung chốt là không dấu |
| 4.5.4 Response + map 9 error code | Task 3 (Step 1, 3) |
| 4.6 Chuẩn hoá SĐT E.164 + migration V4 | Task 1 |
| 4.7 Rate-limit theo IP | Task 4 (Step 4–6, 7) |
| 4.8 Đổi `OtpService` + `AuthController` | Task 4 (Step 7, 8) |
| 4.9 Cấu hình mới | Task 4 (Step 1, 2) |
| 4.10 Giới hạn đăng ký + migration V5 | Task 5 |
| 6. Verification (7 kịch bản) | Task 6 (Step 2–8) |
| 8. Quyết định đã chốt (nội dung tin, không endpoint balance, làm giới hạn đăng ký) | Task 3 (Step 7), Task 5, Task 6 (Step 9) |

Không có mục nào của spec bị bỏ sót.

**2. Step scan:** mỗi step nêu đúng 1 hành động có kết quả kiểm chứng được. Task 3 Step 5 là bảng test 10 dòng — implementer viết mỗi dòng thành 1 method, không cần thêm quyết định nào.

**3. Type consistency:**
- `SmsSendResult.success()` / `.errorCode()` / `.errorMessage()` — Task 2 định nghĩa, Task 3 dùng, Task 4 dùng. Khớp.
- `SmsSender.sendOtp(String phone, String otpCode)` — Task 2 định nghĩa, Task 3 implement, Task 4 gọi. Khớp.
- `SmsSender.exposesCode()` — Task 2 định nghĩa, Task 2/3 implement, Task 4 gọi. Khớp.
- `OtpService.sendOtp(String phone, String clientIp)` — Task 4 định nghĩa + gọi trong `AuthController`. Khớp.
- `PhoneNumbers.normalize(String)` → `String` — Task 1 định nghĩa, Task 1 DTO dùng. Khớp.
- `RegistrationAttemptService.countRegistrationsInLast24h(String)` → `long`, `.recordRegistration(String)` → `void` — Task 5 định nghĩa, Task 5 `AuthService` dùng. Khớp.

**4. Review Focus:** cả 5 dòng đều có test:
1. SĐT gõ khác nhau ở 2 bước → Task 6 Step 3 + Task 1 bảng case
2. SĐT có khoảng trắng/gạch → Task 1 bảng case
3. Error code trong body JSON → Task 3 `sendOtp_errorCode300_failsWithVietnameseMessage`, `sendOtp_errorCode105_failsWithPhoneInvalid`
4. Lỗi HTTP / body không phải JSON → Task 3 `sendOtp_httpError500_failsWithoutLeakingBody`, `sendOtp_malformedJson_failsWithoutLeakingBody`
5. Đăng ký fail do email trùng không tăng bộ đếm → Task 5 `register_doesNotCountWhenEmailExists` + Task 6 Step 8

Ngoài ra: OTP không lộ ở production → Task 3 `exposesCode_isFalse` + Task 4 Step 10.

**5. Proportion:** plan 6 task, ~90 dòng code thực thi (chưa tính test). Spec 519 dòng. Tỷ lệ hợp lý — plan dài hơn spec vì phải chỉ rõ từng bước test, nhưng không transcribe toàn bộ code.

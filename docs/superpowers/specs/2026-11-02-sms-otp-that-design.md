# Design — Gửi OTP qua SMS thật (SpeedSMS)

- **Ngày:** 2026-11-02
- **Trạng thái:** Chờ duyệt
- **Phạm vi:** Module Auth — luồng đăng ký bằng OTP

---

## 1. Intent & Vì sao

Hiện tại luồng đăng ký **không gửi được SMS thật** vì `app.sms.mock=true`: `SmsService` chỉ in mã OTP ra console log và trả mã về cho frontend. Muốn người dùng thật nhận được mã trên điện thoại thì phải nối với nhà cung cấp SMS.

Điểm quan trọng: **code gọi API SpeedSMS đã tồn tại nhưng SAI format API** — dù có token đúng cũng không gửi được tin (chi tiết ở mục 4.5.1). Việc cần làm:

1. **Sửa lại format API** (JSON + HTTP Basic Auth + `sms_type`) — đây là nguyên nhân gốc.
2. Chuyển `SmsService` thành abstraction có thể thay provider.
3. Tách môi trường dev (mock, không tốn tiền) và production (SMS thật).
4. Sửa các lỗi sẽ "nổ" lên khi bật SMS thật.

### 1.1 Ràng buộc đã biết (từ người dùng)

| Ràng buộc | Ảnh hưởng thiết kế |
|---|---|
| **Đã có `access_token` SpeedSMS** | Có thể gọi API thật ngay |
| **Brand "CauLongDee" CHƯA được SpeedSMS duyệt** | ✅ **Đã giải quyết**: dùng `sms_type=2` (CSKH) → không cần brand, và hỗ trợ tiếng Việt có dấu |
| **Muốn nội dung SMS có dấu tiếng Việt** | Dùng `sms_type=2` + escape non-ASCII bằng Jackson. Lưu ý giới hạn 70 ký tự/sms unicode → cần rút ngắn nội dung |

---

## 2. Goals / Non-goals / Anti-goals

### Goals
- G1. Có thể gửi SMS thật về SĐT thật với 1 lần bật cấu hình.
- G2. Ở môi trường dev vẫn test được trọn vẹn luồng đăng ký **mà không tốn tiền**.
- G3. Đổi nhà cung cấp SMS trong tương lai chỉ cần thêm 1 class + 1 dòng config.
- G4. Khi SpeedSMS từ chối (hết tiền, sai format, lỗi mạng), trả về **thông báo tiếng Việt nói rõ nguyên nhân** thay vì lỗi chung chung.
- G5. Chặn việc bị spam endpoint `send-otp` làm đốt tiền tài khoản.
- G6. **Gửi được tin với tiếng Việt có dấu mà không cần brand được SpeedSMS duyệt** (dùng `sms_type=2`).
- G7. **Chặn spam tạo tài khoản** bằng giới hạn số lần đăng ký trên 1 số điện thoại (mục 4.10) — đã chốt làm trong lần này.

### Non-goals
- N1. Không làm UI mới — frontend đã có đủ ô SĐT + ô OTP + nút gửi lại.
- N2. Không hỗ trợ nhiều nhà cung cấp SMS *cùng lúc* — chỉ một provider tại một thời điểm, chọn qua config.
- N3. Không làm tích hợp Zalo ZNS / tin nhắn tự động lặp lại.
- N4. Không đụng vào luồng login, JWT, refresh token.

### Anti-goals (thành công là khi… không xảy ra)
- ❌ Không bao giờ để mã OTP lộ ra response HTTP ở môi trường production.
- ❌ Không để cấu hình dev "rò rỉ" sang production do nhầm profile.
- ❌ Không để một tài khoản đăng ký 2 lần bằng 2 cách viết cùng một số điện thoại.

---

## 3. Approaches đã cân nhắc

| | A. Bật thật, không đổi code | B. Tách provider + profile (chọn) | C. Bật thật + fallback mock |
|---|---|---|---|
| Mô tả | `app.sms.mock=false` + env token | Interface `SmsSender` + 2 impl + Spring Profile | Như A, lỗi thì trả OTP trong response |
| Ưu | Nhanh, ít rủi ro | Đúng chuẩn production, dev không tốn tiền, đổi provider dễ | Không bị chặn giữa chừng khi demo |
| Nhược | Dev tốn tiền mỗi lần test; không có đường lùi; `app.sms.provider` là config chết | Thêm 3–4 file, phải hiểu cơ chế bean condition của Spring Boot | **Rủi ro lộ OTP nếu bật nhầm ở production** |
| Kết luận | ❌ Không đủ an toàn | ✅ **Chọn** | ❌ Bị loại (rủi ro bảo mật) |

**Đề xuất: Phương án B.** Lý do chính:
- An toàn mặc định: production mặc định là SMS thật; muốn lộ OTP thì phải *cố tình* bật profile local.
- Không tốn tiền khi dev — người dùng đang học, sẽ test lại nhiều lần.
- Sửa đúng "nợ kỹ thuật" đang có: `app.sms.provider` được khai báo trong `application.properties` nhưng **không dòng nào đọc nó** (grep toàn backend xác nhận). Sau thay đổi này nó điều khiển thật.
- Học được 2 pattern dùng lại nhiều lần sau này: **Strategy** + `@ConditionalOnProperty`.

---

## 4. Thiết kế chi tiết

### 4.1 Cấu trúc package mới

```
vn.ShuttleHub.backend/
├── auth/
│   └── sms/                          ← package MỚI
│       ├── SmsSender.java            interface
│       ├── MockSmsSender.java        @ConditionalOnProperty(matching "mock")
│       ├── SpeedSmsSender.java       @ConditionalOnProperty(matching "speedsms")
│       └── SmsSendResult.java        record kết quả gửi
├── common/
│   └── PhoneNumbers.java             ← package MỚI: chuẩn hoá SĐT
```

### 4.2 Interface `SmsSender`

```java
public interface SmsSender {
    /** @return true nếu tin nhắn đã được nhà cung cấp chấp nhận */
    SmsSendResult sendOtp(String phone, String otpCode);

    /** true nếu provider này lộ mã OTP ra response (chỉ mock) */
    default boolean exposesCode() { return false; }
}
```

`SmsSendResult` — record, thay vì `boolean`, để mang **nguyên nhân thất bại** về tầng trên:

```java
public record SmsSendResult(
    boolean success,
    String errorCode,      // vd: "brand_not_approved", "insufficient_balance"
    String errorMessage    // message tiếng Việt để hiển thị cho user
) {
    public static SmsSendResult ok() { return new SmsSendResult(true, null, null); }
    public static SmsSendResult fail(String code, String message) { ... }
}
```

### 4.3 Chọn bean bằng config (thay cho `app.sms.mock`)

**Một thuộc tính duy nhất điều khiển, loại bỏ `app.sms.mock`:**

| `app.sms.provider` | Bean được nạp | Hành vi |
|---|---|---|
| `mock` | `MockSmsSender` | In OTP ra log, **không** gọi mạng, OTP được trả về FE |
| `speedsms` | `SpeedSmsSender` | Gọi API SpeedSMS thật |
| *(giá trị khác / thiếu)* | ❌ **App fail lúc start** | Báo lỗi rõ ràng thay vì chạy được nhưng không gửi được tin |

```java
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "mock")
public class MockSmsSender implements SmsSender { ... }

@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "speedsms")
public class SpeedSmsSender implements SmsSender { ... }
```

Hai bean **loại trừ nhau** theo giá trị `havingValue` → không bao giờ cùng tồn tại, không cần `@Primary`.

**Vì sao bỏ `app.sms.mock`:** có 2 cờ (`mock` + `provider`) nghĩa là 4 tổ hợp, trong đó vài tổ hợp mâu thuẫn (mock=true nhưng provider=speedsms). Một cờ là đủ và không thể cấu hình sai.

### 4.4 Profile môi trường

| File | Commit? | `app.sms.provider` | Dùng khi |
|---|---|---|---|
| `application.properties` | ❌ gitignore | `speedsms` | Mặc định — giống production |
| `application-local.properties` | ❌ gitignore | `mock` | Dev: `.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local` |
| `application-local.properties.template` | ✅ commit | (hướng dẫn) | File mẫu để copy |
| `application.properties.template` | ✅ commit | `speedsms` | File mẫu chung |

> ⚠️ `application.properties` hiện đang chứa mật khẩu DB thật (`332003`) và đã được `.gitignore`. **Không** commit file này.

### 4.5 `SpeedSmsSender` — format API đúng + parse JSON

> ⚠️ **BUG QUAN TRỌNG — code hiện tại gọi SAI format API.** Xem mục 4.5.1.

#### 4.5.1 Đối chiếu với sample chính thức của SpeedSMS

Người dùng cung cấp sample Java chính thức (`package api.speedsms.vn.SpeedSMSAPI`). Đối chiếu với tài liệu [speedsms.vn/sms-api](https://speedsms.vn/sms-api/) cho thấy code hiện tại trong dự án **sai ở 4 điểm**, khiến SMS không bao giờ gửi được dù có token đúng:

| # | Điểm | Sample chính thức / tài liệu | Code hiện tại (`SmsService`) | Hậu quả |
|---|---|---|---|---|
| 1 | **Content-Type** | `application/json` | `application/x-www-form-urlencoded` | ❌ **API từ chối request** — server không đọc được body → lỗi 101 "Invalid or missing parameters" |
| 2 | **Payload** | JSON: `{"to":["..."],"content":"...","sms_type":2,"sender":"..."}` | Form: `access_token`, `recipient`, `message`, `type` | ❌ Sai tên field → `recipient`/`message` không được đọc |
| 3 | **Auth** | HTTP **Basic**: `-u "{token}:x"` | Gửi `access_token` trong body form | ⚠️ Token nằm trong body → không đúng chuẩn, không hoạt động |
| 4 | **Loại tin** | `sms_type` (2=CSKH, 3=brandname, 4=Notify, 5=app Android, 6=đầu số cố định) | `type=1` | ⚠️ `type=1` không hợp lệ theo tài liệu |

Tài liệu chính thức (curl ví dụ):

```
curl -i -u "{Access token}" -H "Content-Type: application/json" -X POST \
  -d '{"to":["0912345678"],"content":"noi dung sms","sms_type":2,"sender":""}' \
  https://api.speedsms.vn/index.php/sms/send
```

→ **Payload đúng phải là JSON, không phải form.** Đây là nguyên nhân gốc khiến `app.sms.mock=false` vẫn không gửi được tin.

#### 4.5.2 Chọn `sms_type` — quyết định quan trọng với trạng thái brand của bạn

Tài liệu nêu rõ: *"Hiện chưa hỗ trợ tiếng Việt có dấu đối với tin nhắn brandname và đầu số cố định."*

| `sms_type` | Loại | Dùng khi | Tiếng Việt có dấu | Brand cần duyệt? |
|---|---|---|---|---|
| `2` | CSKH | ✅ **Chọn mặc định** | ✅ Có | ❌ Không |
| `3` | Brandname | Tin quảng cáo có brand | ❌ Không | ✅ Có |
| `4` | Notify (brandname mặc định) | Brand mặc định của tài khoản | ❌ Không | ✅ Có |
| `5` | App Android dùng SIM cá nhân | Gửi bằng máy Android | — | ✅ Có |
| `6` | Đầu số cố định | Tin từ số cố định `8xxxxxxx` | ❌ Không | ❌ Không |

**→ Chọn `sms_type=2` (CSKH).** Ba lý do:

1. **Không cần brand được duyệt** → giải quyết đúng rào buộc hiện tại của bạn (brand "Cầu Lông dee" chưa duyệt). Có thể gửi thật ngay.
2. **Hỗ trợ tiếng Việt có dấu** → đúng lựa chọn của bạn ở câu hỏi trước.
3. **Đúng ngữ nghĩa nghiệp vụ**: tin xác nhận OTP là tin CSKH, không phải quảng cáo.

> ⚠️ **Đánh đổi phải biết:** với `sms_type=2`, người nhận **không thấy tên "Cầu Lông dee"** hiển thị trên máy (đó là đặc quyền của brandname) — chỉ thấy số đầu số của nhà cung cấp. Tin nhắn phải tự nói rõ mình là của app: nội dung sẽ bắt đầu bằng `[Cầu Lông dee]`.
>
> Nếu sau này brand được duyệt và muốn hiện tên trên máy → đổi `sms_type=3`, nhưng **phải bỏ dấu tiếng Việt** (giới hạn của SpeedSMS) và `sender` bắt buộc = tên brand.

#### 4.5.3 Encode nội dung tiếng Việt có dấu

Sample chính thức có hàm `EncodeNonAsciiCharacters()` — chuyển mọi ký tự > 127 thành escape `\uXXXX`. Lý do: một số SMS gateway cũ không xử lý UTF-8 trực tiếp trong JSON body.

**Quyết định:** dùng **Jackson escape non-ASCII** (đã có sẵn trong Spring Boot qua `spring-boot-starter-webmvc` → `spring-boot-starter-json` → `jackson-databind`) thay vì tự viết hàm như sample:

```java
ObjectMapper mapper = JsonMapper.builder()
    .enable(JsonWriteFeature.ESCAPE_NON_ASCII)
    .build();
```

Kết quả: `Mã xác nhận` → `Mã xác nhận` (ký tự `\uXXXX`), server đọc lại đúng nội dung có dấu.

#### 4.5.4 Response & ánh xạ lỗi

Response thực tế (theo tài liệu):

```json
// thành công
{"status":"success","code":"00","data":{"tranId":"...","totalSMS":1,"totalPrice":350,"invalidPhone":[]}}

// lỗi
{"status":"error","code":"300","message":"Your account balance not enough to send sms"}
```

Sẽ parse JSON, ánh xạ `code` của SpeedSMS sang message tiếng Việt. **Error code chính thức** cần map:

| Code | Ý nghĩa (theo tài liệu) | Message tiếng Việt cho user |
|---|---|---|
| `007` | IP locked | "Hệ thống SMS tạm thời không khả dụng. Vui lòng thử lại sau." |
| `008` | Account blocked | "Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau." |
| `009` | Account not allow to call API | "Dịch vụ SMS tạm thời không khả dụng. Vui lòng thử lại sau." |
| `101` | Invalid or missing parameters | "Không thể gửi mã xác nhận. Vui lòng thử lại sau." |
| `105` | Phone number invalid | "Số điện thoại không hợp lệ." |
| `110` | Not support sms content encoding | "Nội dung tin nhắn không được hỗ trợ. Vui lòng thử lại sau." |
| `113` | Sms content too long | "Nội dung tin nhắn quá dài." |
| `300` | Balance not enough | "Hệ thống SMS tạm thời quá tải. Vui lòng thử lại sau." |
| `500` | Internal error | "Không thể gửi mã xác nhận. Vui lòng thử lại sau." |

Tất cả → `SmsSendException` → HTTP **503** (đã có handler sẵn trong `GlobalExceptionHandler`).

> 💡 **Bonus từ tài liệu — kiểm tra số dư trước khi gửi:** có API `GET /user/info` trả về `balance`. **ĐÃ QUYẾT ĐỊNH: không làm** endpoint debug `/api/auth/sms/balance` — người dùng sẽ vào web SpeedSMS tự kiểm tra. Không thêm endpoint nào ngoài scope.

Nội dung tin nhắn (có dấu, theo lựa chọn của bạn):

```
**Nội dung tin nhắn — ĐÃ CHỐT (phương án B: không dấu, 61 ký tự):**

```
[Cầu Lông dee] Ma xac nhan: 123456. Het han sau 5 phut.
```

**Lý do chọn:** 61 ký tự không dấu → dưới ngưỡng 160 ký tự/sms → **đúng 1 tin** (tiết kiệm 50% so với bản có dấu). Dùng không dấu còn giúp tương thích với mọi loại `sms_type` (2, 3, 6) — nếu sau này chuyển sang brandname `sms_type=3` thì SpeedSMS bắt buộc nội dung không dấu, không phải sửa lại message.

> ℹ️ Hệ quả nhỏ: người nhận đọc tin không dấu kém hơn một chút. Đổi lại được 1 tin thay vì 2. Đây là đánh đổi đã được người dùng chấp nhận.

> 💡 Nếu sau này muốn tin nhắn có dấu + vẫn 1 tin: dùng bản 55 ký tự `[Cầu Lông dee] Mã xác nhận: 123456. Hết hạn 5 phút.` — nhưng khi đó **bắt buộc** `sms_type=2` và không dùng được brandname.

### 4.6 Chuẩn hoá số điện thoại — `PhoneNumbers` (BUG THẬT, phải sửa)

**Vấn đề hiện tại:** `SendOtpRequest` và `RegisterRequest` chấp nhận cả `0912345678` lẫn `+84912345678` (regex `^(0|\+84)[0-9]{9,10}$`), nhưng **lưu nguyên văn** vào DB.

Hệ quả — 2 lỗi thật, cả hai đều xảy ra khi bật SMS thật:

1. **OTP không khớp:** user gõ `+84912345678` ở ô SĐT khi bấm "Gửi mã" (`OtpCode.phone = "+84912345678"`), nhưng ở form đăng ký lại gõ `0912345678` → `AuthService.register()` gọi `verifyOtp("0912345678", otp)` → không tìm thấy bản ghi → **"Mã OTP không tồn tại"** dù user đã nhận đúng mã.
2. **Trùng tài khoản:** `existsByPhoneNumber("0912345678")` = false nhưng `existsByPhoneNumber("+84912345678")` = true → user đăng ký được 2 tài khoản cho cùng 1 số.

**Cách sửa:** chuẩn hoá về **E.164** (`84912345678`) tại biên — trong compact constructor của record DTO, giống cách đang làm với email:

```java
public record SendOtpRequest(String phone) {
    public SendOtpRequest {
        phone = PhoneNumbers.normalize(phone);   // "0912345678" → "84912345678"
    }
}
```

`PhoneNumbers.normalize()` quy tắc:
- Bỏ khoảng trắng, `-`, `.`, `+`
- `0` + 9 chữ số → bỏ `0`, thêm `84`
- `84` + 9 chữ số → giữ nguyên
- `84` + 10 chữ số (số cũ 10 số của VN) → bỏ số `0` ở vị trí thứ 3 → `84` + 9 số
- Sai định dạng → trả `null` để Bean Validation bắt lỗi

**Migration `V4`:** cập nhật các dòng `users.phone_number` và `otp_codes.phone` đang lưu dạng cũ (`0...`) sang dạng E.164. Vì `otp_codes` là dữ liệu ngắn hạn (TTL 5 phút), chỉ cần cập nhật `users.phone_number`; các dòng `otp_codes` cũ sẽ tự hết hạn.

> ⚠️ Cần `EXISTS` check trước khi UPDATE, và **backup bảng `users`** trước khi chạy trên dữ liệu thật.

### 4.7 Giới hạn theo IP — chặn đốt tiền

Hiện tại `OtpService.sendOtp()` chỉ rate-limit theo SĐT (`resendCooldownSeconds=60`). Kẻ xấu gọi `send-otp` với 1000 số khác nhau → mỗi lần là 1 tin SMS thật → đốt tiền tài khoản.

Bổ sung giới hạn theo IP, lưu **trong bộ nhớ** (không cần bảng DB):

- Key: IP → danh sách timestamp các lần gửi
- Cửa sổ: 1 giờ
- Tối đa: 10 lần / giờ / IP (config `app.sms.max-sends-per-hour-per-ip`)
- Vượt → `RateLimitException` → HTTP 429 (đã có handler sẵn)

**Giới hạn đã biết và chấp nhận:** lưu in-memory nên **restart backend là reset**, và **không áp dụng khi chạy nhiều instance** (load balancer). Với dự án hiện tại (1 instance) thì chấp nhận được; ghi chú này ghi vào Javadoc của class.

Lấy IP từ `HttpServletRequest.getRemoteAddr()`. (Khi đưa lên production sau proxy, cần đọc `X-Forwarded-For` — ghi chú TODO trong code.)

### 4.10 Giới hạn số lần đăng ký — chặn spam tạo tài khoản (ĐÃ CHỐT: làm trong lần này)

**Vấn đề:** kẻ xấu có 1 số điện thoại (SIM rác) nhưng có thể đăng ký hàng loạt tài khoản → đốt tiền SMS + làm bẩn database. Giới hạn theo IP (4.7) không chặn được trường hợp này vì mỗi request đều đến từ IP khác nhau (dùng proxy/VPN).

**Cơ chế:** đếm số lần đăng ký **theo số điện thoại** trong một cửa sổ thời gian.

| Tham số | Config | Mặc định | Ý nghĩa |
|---|---|---|---|
| Số lần đăng ký tối đa / SĐT / ngày | `app.otp.max-registrations-per-phone-per-day` | `3` | Trên 3 lần/ngày → từ chối |
| Cửa sổ | — | 24 giờ (tính lùi) | |

**Vì sao chọn 3/ngày:** cho phép người dùng thật đăng ký lại khi quên tài khoản (1–2 lần) nhưng chặn được spam. Dùng `1` thì quá nghiêm — người dùng thật gõ sai email sẽ bị chặn cả ngày.

**Cách lưu trữ — 2 lựa chọn:**

| | A. Bảng DB `registration_attempts` | B. Bộ nhớ in-memory |
|---|---|---|
| Bền qua restart | ✅ | ❌ |
| Áp dụng multi-instance | ✅ | ❌ |
| Thêm bảng + migration | Có | Không |
| Độ chính xác | Cao | Thấp (restart là reset) |

**→ Chọn A (bảng DB)** vì:
1. Chống spam là mục tiêu **bảo mật** → phải bền qua restart, không được reset bằng cách restart server.
2. Số lần đăng ký là dữ liệu cần **audit** (sau này chủ sân có thể xem).
3. Dự án đã có sẵn hạ tầng Flyway + JPA → thêm 1 bảng không tốn kém.

**Thiết kế bảng mới — `V5__create_registration_attempts.sql`:**

```sql
CREATE TABLE registration_attempts (
    id          VARCHAR(36) PRIMARY KEY,
    phone       VARCHAR(15)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Truy vấn đếm số lần đăng ký trong 24h: lọc theo phone + created_at
CREATE INDEX idx_reg_attempt_phone_created
    ON registration_attempts (phone, created_at);
```

**Luồng xử lý trong `AuthService.register()`:**

```
1. verifyOtp()                          ← như hiện tại
2. Kiểm tra email/username/phone trùng   ← như hiện tại
3. Đếm số lần đăng ký của SĐT trong 24h
   → nếu >= app.otp.max-registrations-per-phone-per-day
     → throw RateLimitException("Số điện thoại này đã đăng ký quá nhiều lần. Vui lòng thử lại sau.")
4. Tạo user
5. Ghi 1 dòng vào registration_attempts
```

**Điểm quan trọng — thứ tự bước 3 và 5:**
- Bước 3 kiểm tra **trước** khi tạo user → không tạo user rác.
- Bước 5 ghi **sau** khi tạo user thành công → chỉ tính lần đăng ký thật. Nếu ghi trước mà đăng ký fail (email trùng), thì lần đó cũng bị tính → người dùng bị phạt oan.
- ⚠️ Nhưng bước 5 phải **commit được** kể cả khi có exception phía sau → dùng cùng pattern `REQUIRES_NEW` như `OtpAttemptService.incrementAttempt()` (đã có sẵn trong dự án).

**Dọn dữ liệu:** bảng `registration_attempts` chỉ dùng để đếm trong cửa sổ 24h → có thể xoá dòng cũ hơn 7 ngày. Thêm job `@Scheduled` (cron hằng ngày) hoặc xoá lười (dọn khi đếm). → Chọn **xoá lười**: mỗi lần đếm thì xoá dòng cũ hơn 7 ngày của chính SĐT đó. Không cần job, code ít hơn.

**Đặc biệt — soft delete:** user bị xoá mềm (`isActive=false`) vẫn còn trong bảng `users`, và `existsByPhoneNumber()` hiện **không** lọc theo `isActive` → số điện thoại đó vẫn bị chặn. Đây là hành vi mong muốn (không cho tái đăng ký số đã bị khoá).

### 4.11 Thay đổi trong `OtpService` và `AuthController`

```java
// Trước
boolean sent = smsService.sendOtp(phone, code);
if (!sent) throw new SmsSendException("Không thể gửi mã xác nhận...");

// Sau
SmsSendResult result = smsSender.sendOtp(phone, code);
if (!result.success()) {
    log.error("[SMS] Gửi OTP tới {} thất bại: {} ({})", phone, result.errorMessage(), result.errorCode());
    throw new SmsSendException(result.errorMessage());
}
```

```java
// Trước
return smsService.isMock() ? code : null;

// Sau — chỉ lộ mã khi provider là mock
return smsSender.exposesCode() ? code : null;
```

`AuthController` không đổi logic, chỉ đổi nguồn `data.otp`.

### 4.9 Cấu hình mới

```properties
# SMS
# provider: mock | speedsms  (giá trị khác → app fail lúc start)
app.sms.provider=speedsms
app.sms.access-token=${SPEEDSMS_ACCESS_TOKEN:}
app.sms.sender=${SPEEDSMS_SENDER:CauLongDee}
# Loại tin: 2=CSKH (không cần brand, có dấu) · 3=brandname · 6=đầu số cố định
app.sms.type=2
# Tối đa số lần gửi OTP / giờ / IP
app.sms.max-sends-per-hour-per-ip=10

# Số lần đăng ký tối đa / 1 số điện thoại / 24 giờ
app.otp.max-registrations-per-phone-per-day=3
```

**Khuyến nghị vận hành:** dùng `app.sms.type=2` (CSKH) → **không cần brand được duyệt**, gửi thật được ngay. Khi nào brand "Cầu Lông dee" được SpeedSMS duyệt thì chuyển sang `app.sms.type=3` + `SPEEDSMS_SENDER=CauLongDee` (lưu ý: phải bỏ dấu tiếng Việt vì SpeedSMS chưa hỗ trợ unicode cho brandname).

---

## 5. Ảnh hưởng lên các file

| File | Hành động |
|---|---|
| `auth/sms/SmsSender.java` | **Tạo mới** |
| `auth/sms/SmsSendResult.java` | **Tạo mới** |
| `auth/sms/MockSmsSender.java` | **Tạo mới** |
| `auth/sms/SpeedSmsSender.java` | **Tạo mới** — chứa logic cũ của `SmsService` **nhưng sửa format API** (JSON + Basic Auth + `sms_type`) |
| `auth/service/SmsService.java` | **Xoá** (thay bằng `SmsSender` + 2 impl) |
| `common/PhoneNumbers.java` | **Tạo mới** |
| `auth/dto/SendOtpRequest.java` | Sửa — chuẩn hoá phone trong compact constructor |
| `auth/dto/RegisterRequest.java` | Sửa — chuẩn hoá phone trong compact constructor |
| `auth/service/OtpService.java` | Sửa — dùng `SmsSender`, thêm rate-limit IP |
| `auth/service/AuthService.java` | Sửa — thêm kiểm tra giới hạn đăng ký / SĐT / ngày, ghi `registration_attempts` |
| `auth/repository/RegistrationAttemptRepository.java` | **Tạo mới** |
| `auth/service/RegistrationAttemptService.java` | **Tạo mới** — đếm + ghi (ghi dùng `REQUIRES_NEW`) |
| `entity/RegistrationAttempt.java` | **Tạo mới** |
| `auth/controller/AuthController.java` | Sửa nhỏ — nguồn `data.otp` |
| `application.properties` | Sửa — bỏ `app.sms.mock`, thêm `app.sms.type` + `max-sends-per-hour-per-ip` + `max-registrations-per-phone-per-day` |
| `application.properties.template` | Sửa — đồng bộ |
| `application-local.properties.template` | **Tạo mới** — profile dev, `provider=mock` |
| `db/migration/V4__normalize_phone_numbers.sql` | **Tạo mới** — chuẩn hoá SĐT cũ sang E.164 |
| `db/migration/V5__create_registration_attempts.sql` | **Tạo mới** — bảng đếm lần đăng ký |

**Frontend:** không đổi file nào. `AuthPage.tsx` đã xử lý sẵn trường hợp không có `otp` trong response.

---

## 6. Verification

Không được báo "xong" nếu chưa chạy thật.

### Backend
```powershell
cd backend
.\mvnw.cmd -o -q package -DskipTests      # phải BUILD SUCCESS
.\mvnw.cmd spring-boot:run                # phải "Started BackendApplication"
```

### Kịch bản 1 — Mock (dev, không tốn tiền)
```powershell
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
curl.exe -X POST http://localhost:8080/api/auth/send-otp `
  -H "Content-Type: application/json" -d '{"phone":"0912345678"}'
```
**Kỳ vọng:** `data.otp` có 6 chữ số, **không** có request nào ra api.speedsms.vn.

### Kịch bản 2 — SMS thật (kiểm tra format API đã đúng)
```powershell
.\mvnw.cmd spring-boot:run
curl.exe -X POST http://localhost:8080/api/auth/send-otp `
  -H "Content-Type: application/json" -d '{"phone":"0912345678"}'
```
**Kỳ vọng:** điện thoại nhận được tin; response **không** chứa `data.otp`; balance SpeedSMS giảm 1 tin.

> 🔍 **Quan trọng:** đây là kịch bản xác minh **sửa bug format API** (mục 4.5.1). Nếu vẫn không nhận được tin → kiểm tra log server xem `errorCode` SpeedSMS trả về là gì:
> - `101` → payload sai → kiểm tra lại `Content-Type` và tên field
> - `105` → số điện thoại sai → kiểm tra định dạng `84...`
> - `300` → hết tiền → nạp tiền
> - `009` → tài khoản chưa được cấp quyền gọi API

### Kịch bản 3 — Lỗi SMS trả về cho user
Tạm đặt `SPEEDSMS_ACCESS_TOKEN=sai` → gọi `send-otp`.
**Kỳ vọng:** response **503** với message tiếng Việt, **không** phải lỗi 500 chung chung; log server có `errorCode` cụ thể.

### Kịch bản 4 — Chuẩn hoá SĐT
Gửi OTP với `+84912345678`, rồi đăng ký với `0912345678` → phải **verify thành công** (trước đây sẽ báo "OTP không tồn tại").

### Kịch bản 5 — Rate limit IP
Gọi `send-otp` liên tiếp >10 lần/giờ với các số khác nhau → lần thứ 11 trả **429**.

### Kịch bản 6 — Giới hạn đăng ký / SĐT / ngày (mục 4.10)
Đăng ký thành công 3 lần với cùng 1 số điện thoại (đổi email mỗi lần) → lần thứ **4** phải trả **429** với message "Số điện thoại này đã đăng ký quá nhiều lần. Vui lòng thử lại sau."

> Lưu ý: mỗi lần đăng ký cần 1 OTP hợp lệ → dùng `app.sms.provider=mock` (profile local) để lấy mã tự động, không tốn tiền.

### Kịch bản 7 — Lần đăng ký thất bại KHÔNG bị tính
Đăng ký lại với email **đã tồn tại** → nhận lỗi 409 "Email đã được sử dụng." → số lần đăng ký trong bảng `registration_attempts` **không tăng** (kiểm tra bằng SQL):
```sql
SELECT phone, count(*) FROM registration_attempts WHERE phone = '84912345678' GROUP BY phone;
```

---

## 7. Rủi ro còn lại & việc cần làm ngoài code

| Rủi ro | Xử lý |
|---|---|
| Brand chưa duyệt | ✅ Đã giải quyết bằng `sms_type=2` (CSKH) — không cần brand |
| Tài khoản hết tiền | Nạp tiền; error code `300` được map thành message tiếng Việt |
| Tin nhắn > 70 ký tự có dấu → 2 tin, tốn gấp đôi | ✅ Đã xử lý: dùng bản không dấu 61 ký tự → 1 tin |
| Người nhận không thấy tên "Cầu Lông dee" trên máy | Chấp nhận với `sms_type=2`; nội dung tin tự nói rõ `[Cầu Lông dee]` |
| Rate-limit IP in-memory không áp dụng cho multi-instance | Chấp nhận ở giai đoạn hiện tại; nếu scale → chuyển sang Redis/DB |
| `X-Forwarded-For` chưa xử lý | TODO trong code; cần làm trước khi đưa sau reverse proxy |
| Migration `V4` sửa dữ liệu thật | Backup `users` trước khi chạy |
| Bảng `registration_attempts` phình to theo thời gian | Xoá lười: mỗi lần đếm xoá dòng cũ hơn 7 ngày của chính SĐT đó |

---

## 8. Quyết định đã chốt (chốt cửa — không còn câu hỏi mở)

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Nội dung tin nhắn | **B** — `[Cầu Lông dee] Ma xac nhan: 123456. Het han sau 5 phut.` (61 ký tự, không dấu, 1 tin) |
| 2 | Endpoint debug xem số dư SpeedSMS | **Không làm** — vào web SpeedSMS tự xem |
| 3 | Giới hạn số lần đăng ký / SĐT / ngày | **Làm trong lần này** — mục 4.10, bảng `registration_attempts`, mặc định 3 lần/24h |

---

## 9. Bước tiếp theo

Design doc này đã đủ chi tiết để lập kế hoạch triển khai.
→ Chuyển sang `superpowers:writing-plans` để tạo plan chi tiết từng bước, **rồi mới code**.


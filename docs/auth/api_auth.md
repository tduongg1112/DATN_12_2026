# API — Xác thực tài khoản (`auth`)

> **Trạng thái:** REVIEWED (build-first 21/11, review lại ở giai đoạn test) · Sinh từ `specs_auth.md` v0.2 · Định dạng response và lỗi theo TD-05 (đã chốt)
> Câu thông báo có trong specs được chép nguyên văn. Câu **Claude soạn** (nguồn không có) đánh dấu ✎, Dương đã duyệt ngày 21/11 (OQ-31 → OQ-35). Cơ chế phiên và Google: TD-21 → TD-23 (đã chốt 21/11).

## Tổng quan

Tiền tố chung: `/api/v1`. Mô-đun backend: `accounts` (`backend/src/modules/accounts/`).

| # | Method | Path | Mô tả | Quyền | Phục vụ (US/BR) |
|---|---|---|---|---|---|
| A1 | POST | `/auth/register` | Đăng ký bằng email, tự đăng nhập | Công khai | US-01 · BR-05, 06, 10, 11, 13, 14 |
| A2 | POST | `/auth/login` | Đăng nhập email + mật khẩu | Công khai | US-03 · BR-03, 07, 08, 14 |
| A3 | POST | `/auth/refresh` | Lấy access token mới từ cookie, xoay vòng refresh token | Công khai (cookie) | BR-01, 03 · TD-03, 12, 15 |
| A4 | POST | `/auth/logout` | Đăng xuất thiết bị hiện tại, thu hồi refresh token | Công khai (cookie) | US-04 · BR-12 |
| A5 | GET | `/auth/google` | Bắt đầu đăng nhập Google (chuyển hướng sang Google) | Công khai | US-02 · BR-02, 04 |
| A6 | GET | `/auth/google/callback` | Google gọi lại: tạo hoặc gắn tài khoản, tạo phiên, chuyển về frontend | Công khai | US-02 · BR-04, 09 |
| U1 | GET | `/users/me` | Hồ sơ của người đang đăng nhập | USER, ADMIN | US-05 · BR-16, 17 |
| U2 | PATCH | `/users/me` | Sửa họ tên, ảnh đại diện | USER, ADMIN | US-05 · BR-16 |
| U3 | PUT | `/users/me/password` | Đổi mật khẩu | USER, ADMIN | US-05 · BR-17 |

- "Công khai" = gắn `@Public()`, bỏ qua `JwtAuthGuard` (specs mục 6; be-coding-rules mục 4). A3, A4 tự đọc cookie refresh token.
- U1 → U3 không nhận id trên đường dẫn: luôn thao tác trên `user.id` lấy từ access token, nên người dùng chỉ chạm được tài khoản của chính mình (BR-G03). ADMIN dùng như USER (BR-15, OQ-22).
- Không có endpoint quản trị trong feature này. Tài khoản ADMIN tạo bằng `npm run seed` (BR-13).

## Quy ước chung

**Phiên đăng nhập (TD-03, TD-12, TD-23):**

| Thành phần | Cách làm |
|---|---|
| Access token | JWT ký bằng `JWT_ACCESS_SECRET`, payload `{ sub: userId, role }`, hạn `JWT_ACCESS_EXPIRES_IN` (30 phút, TD-16). Trả trong body; frontend giữ trong bộ nhớ, gửi bằng `Authorization: Bearer` |
| Refresh token | JWT ký bằng `JWT_REFRESH_SECRET`, payload `{ sub: userId, sid, jti }` (`sid` = mã phiên ngẫu nhiên của một thiết bị; `jti` ngẫu nhiên để hai lần xoay vòng trong cùng một giây vẫn ra token khác nhau), hạn `JWT_REFRESH_EXPIRES_IN` (7 ngày, TD-16) |
| Cookie | Tên `refresh_token`; `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`, `Max-Age` = thời hạn còn lại của token; `Secure` khi `NODE_ENV=production` |
| Redis | Khoá `auth:rt:<sid>` → `{ userId, hash }`, `hash` = SHA-256 của refresh token. TTL = thời hạn token. Mỗi thiết bị một phiên; đăng xuất chỉ xoá phiên hiện tại (FL AUTH-03) |
| Xoay vòng | Mỗi lần A3 thành công: cấp refresh token mới cùng `sid`, ghi đè `hash` và đặt lại TTL 7 ngày. Token cũ hết dùng được |

**Quy tắc mật khẩu (BR-05):** 8 → 72 ký tự, có ít nhất một chữ cái (`\p{L}`) và một chữ số (`0-9`). Giới hạn 72 là giới hạn của bcrypt, không có trong specs (OQ-32). Băm bằng bcrypt 10 vòng (TD-16).

**Email (BR-14):** cắt khoảng trắng hai đầu, đổi về chữ thường trước khi kiểm tra và lưu. Tối đa 255 ký tự.

**Họ tên:** cắt khoảng trắng hai đầu, bắt buộc, tối đa 100 ký tự (`users.full_name`).

**Lỗi chung:** thiếu hoặc sai access token ở U1 → U3 trả `401 UNAUTHORIZED` "Vui lòng đăng nhập" (câu dự phòng, OQ-29). Lỗi validation trả `400 VALIDATION_ERROR` "Dữ liệu không hợp lệ" (OQ-29) kèm `errors[]` theo từng trường; câu của từng trường ở bảng dưới (OQ-32).

**Câu lỗi theo trường (✎ OQ-32, dùng chung A1, A2, U2, U3):**

| Trường | Khi nào | Câu |
|---|---|---|
| `fullName` | Trống | ✎ "Vui lòng nhập họ tên" |
| `fullName` | Quá 100 ký tự | ✎ "Họ tên tối đa 100 ký tự" |
| `email` | Trống | ✎ "Vui lòng nhập email" |
| `email` | Sai định dạng hoặc quá 255 ký tự | ✎ "Email không hợp lệ" |
| `password`, `currentPassword` | Trống | ✎ "Vui lòng nhập mật khẩu" |
| `password`, `newPassword` | Dưới 8 ký tự, thiếu chữ hoặc thiếu số | ✎ "Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số" (diễn lại BR-05) |
| `password`, `newPassword` | Quá 72 ký tự | ✎ "Mật khẩu tối đa 72 ký tự" |
| `confirmPassword`, `confirmNewPassword` | Không trùng mật khẩu | ✎ "Mật khẩu xác nhận không khớp" |

---

## A1. POST `/auth/register`

- **Quyền:** công khai. **Sở hữu dữ liệu:** không áp dụng.
- **Request** (JSON):

  | Trường | Kiểu | Bắt buộc | Validation | BR |
  |---|---|---|---|---|
  | `fullName` | string | Có | Trim, 1–100 ký tự | BR-05 |
  | `email` | string | Có | Trim, chữ thường, định dạng email, ≤ 255 | BR-05, 14 |
  | `password` | string | Có | Quy tắc mật khẩu | BR-05 |
  | `confirmPassword` | string | Có | Trùng `password` | BR-05, 11 |

- **Response 201:** `{ "accessToken": "eyJ..." }` kèm `Set-Cookie: refresh_token=…` (tự đăng nhập, BR-06). Frontend hiện "Tạo tài khoản thành công" (BR-06, nguyên văn C4 7b).
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo | BR |
  |---|---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Trường sai (bảng câu theo trường) | "Dữ liệu không hợp lệ" + `errors[]` | BR-05, 11 |
  | 409 | `AUTH_EMAIL_TAKEN` | Email đã có tài khoản (kể cả tài khoản chỉ dùng Google) | "Email này đã có tài khoản. Bạn có thể đăng nhập hoặc tiếp tục với Google" + `errors: [{ field: "email", message: <cùng câu> }]` | BR-10 |

- **Ghi dữ liệu:** `users` (1 dòng): `role = USER`, `failed_login_count = 0`, `google_id = NULL`, `avatar_url = NULL`, `password_hash = bcrypt(password)`. Redis: tạo phiên. Không xác minh email (BR-06, OQ-02).
- **Ghi chú:** hai yêu cầu đăng ký cùng email chạy song song: ràng buộc `uq_users_email` chặn, yêu cầu sau nhận 409.

## A2. POST `/auth/login`

- **Quyền:** công khai.
- **Request** (JSON): `email` (bắt buộc, định dạng email), `password` (bắt buộc, không kiểm tra quy tắc mật khẩu).
- **Response 200:** `{ "accessToken": "eyJ..." }` kèm `Set-Cookie`. Frontend đọc `role` trong token để điều hướng: ADMIN → Dashboard, USER → trang định vào hoặc trang chủ (BR-03).
- **Xử lý (BR-07, BR-08, data_model mục 5):**
  1. Tìm theo email. Không có, hoặc tài khoản không có `password_hash` (chỉ dùng Google) → 401 `AUTH_INVALID_CREDENTIALS`. Vẫn chạy một lần so sánh bcrypt giả để thời gian phản hồi không lộ email có tồn tại hay không.
  2. `locked_until > hiện tại` → 423 `AUTH_ACCOUNT_LOCKED`. Không kiểm tra mật khẩu, không tăng bộ đếm.
  3. Sai mật khẩu → tăng `failed_login_count` (một câu `UPDATE … SET failed_login_count = failed_login_count + 1 RETURNING`, an toàn khi gửi đồng thời). Đạt `AUTH_MAX_FAILED_LOGINS` (5) → `locked_until = hiện tại + AUTH_LOCK_MINUTES` (15) và trả 423; chưa đạt → 401. Cách đếm sau khi hết khoá: OQ-31.
  4. Đúng mật khẩu → `failed_login_count = 0`, `locked_until = NULL`, tạo phiên.
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo | BR |
  |---|---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Trống email, mật khẩu hoặc email sai định dạng | "Dữ liệu không hợp lệ" + `errors[]` | — |
  | 401 | `AUTH_INVALID_CREDENTIALS` | Sai email hoặc mật khẩu, hoặc tài khoản chỉ dùng Google | "Email hoặc mật khẩu không đúng" (không có `errors[]`, không chỉ trường nào sai) | BR-07 |
  | 423 | `AUTH_ACCOUNT_LOCKED` | Đang bị tạm khoá, hoặc vừa sai tới lần thứ 5 | ✎ "Bạn đã nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau {n} phút." `{n}` = số phút còn lại, làm tròn lên (OQ-31) | BR-08 |

- **Ghi dữ liệu:** `users.failed_login_count`, `users.locked_until`. Redis: tạo phiên khi thành công.
- **Ghi chú:** khoá chỉ chặn đăng nhập bằng mật khẩu. Đăng nhập Google vẫn dùng được trong lúc khoá (BR-08 "tạm khoá đăng nhập bằng mật khẩu").

## A3. POST `/auth/refresh`

- **Quyền:** công khai; xác thực bằng cookie `refresh_token`. Frontend gọi với `credentials: "include"`, không gửi Bearer.
- **Request:** không có body.
- **Xử lý:** kiểm tra chữ ký và hạn của refresh token → đọc `auth:rt:<sid>` → so `hash` → đọc lại `users` theo `sub` để lấy `role` hiện tại → cấp access token mới và refresh token mới (xoay vòng).
- **Response 200:** `{ "accessToken": "eyJ..." }` kèm `Set-Cookie` mới. Đây là hợp đồng frontend đã giả định ở `frontend/lib/api/auth-endpoints.ts` (TD-15).
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo |
  |---|---|---|---|
  | 401 | `AUTH_REFRESH_INVALID` | Không có cookie, token sai chữ ký hoặc hết hạn, phiên không còn trong Redis, `hash` không khớp (token đã bị xoay), tài khoản không còn | "Vui lòng đăng nhập" (câu dự phòng, OQ-29). Kèm xoá cookie |

- **Ghi dữ liệu:** chỉ Redis.
- **Ghi chú:** frontend không hiện câu này cho người dùng; nhận 401 thì coi như chưa đăng nhập và chuyển tới `/login` (BR-01).

## A4. POST `/auth/logout`

- **Quyền:** công khai (access token có thể đã hết hạn lúc đăng xuất); đọc cookie `refresh_token`.
- **Request:** không có body.
- **Response 204:** luôn trả 204, kèm xoá cookie (`Max-Age=0`, cùng `Path`). Token hợp lệ thì xoá `auth:rt:<sid>` khỏi Redis (BR-12, FL AUTH-03).
- **Lỗi:** không có. Gọi lại nhiều lần vẫn 204.
- **Ghi dữ liệu:** chỉ Redis.

## A5. GET `/auth/google`

- **Quyền:** công khai. Frontend mở bằng điều hướng toàn trang (`window.location.assign`), không gọi bằng `fetch`.
- **Query:** `next` (tuỳ chọn): đường dẫn nội bộ để quay về sau khi đăng nhập (BR-03). Chỉ nhận chuỗi bắt đầu bằng `/`, không bắt đầu bằng `//`, tối đa 500 ký tự; sai thì bỏ qua.
- **Response 302:** tới trang chọn tài khoản của Google (`scope = openid email profile`, `prompt = select_account`, BR-04). Đặt cookie `google_oauth` (`HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth/google`, 10 phút) chứa `state` ngẫu nhiên và `next`, để chống giả mạo callback (TD-22).
- **Lỗi:** chưa cấu hình `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` → 302 về `${FRONTEND_URL}/login?error=google` (frontend hiện câu ở OQ-34).

## A6. GET `/auth/google/callback`

- **Quyền:** công khai. Google gọi tới (đặt trùng `GOOGLE_CALLBACK_URL`, vd `http://localhost:4000/api/v1/auth/google/callback`).
- **Query (do Google gửi):** `code`, `state`, hoặc `error`.
- **Xử lý (BR-04, ERD 4.1):**
  1. `state` phải khớp cookie `google_oauth`. Xoá cookie này.
  2. Đổi `code` lấy thông tin Google: `sub`, `email`, `email_verified`, `name`, `picture`. Email phải đã xác minh (TD-22, OQ-34).
  3. Tìm theo `google_id = sub` → có thì đăng nhập.
  4. Không có: tìm theo email (chữ thường) → có thì gắn `google_id` vào tài khoản đó rồi đăng nhập. Không đổi họ tên, ảnh, mật khẩu của tài khoản sẵn có.
  5. Không có: tạo tài khoản `role = USER`, `password_hash = NULL`, `google_id = sub`, `full_name = name` (cắt 100 ký tự; Google không trả tên thì lấy phần trước `@` của email), `avatar_url = picture` (bỏ nếu dài quá 500 ký tự).
  6. Tạo phiên, đặt cookie `refresh_token`.
- **Response 302 (về frontend):**

  | Tình huống | Chuyển tới | BR |
  |---|---|---|
  | Thành công | `${FRONTEND_URL}/login?next=<next>` (không có `next` thì `/login`). Màn đăng nhập tự khôi phục phiên bằng A3 rồi điều hướng theo vai trò | BR-03, 04 |
  | Người dùng huỷ hoặc từ chối (`error=access_denied`) | `${FRONTEND_URL}/login?next=<next>`, không có thông báo, không đổi dữ liệu | BR-09 |
  | Lỗi khác: sai `state`, Google lỗi, email chưa xác minh, chưa cấu hình | `${FRONTEND_URL}/login?error=google&next=<next>` | OQ-34 |

- **Ghi dữ liệu:** `users` (thêm mới hoặc cập nhật `google_id`); Redis. Không đụng `failed_login_count`, `locked_until`.
- **Ghi chú:** hai lần đăng nhập Google lần đầu chạy song song cùng email: lần sau gặp `uq_users_email` hoặc `uq_users_google_id` thì đọc lại tài khoản vừa tạo và đăng nhập vào đó.

---

## U1. GET `/users/me`

- **Quyền:** USER, ADMIN. **Sở hữu dữ liệu:** chỉ đọc `users.id = <id trong token>`.
- **Response 200:**

  ```json
  {
    "id": 12,
    "fullName": "Nguyễn Văn An",
    "email": "an@example.com",
    "avatarUrl": "http://localhost:4000/uploads/avatars/2026/11/7f3c….jpg",
    "role": "USER",
    "hasPassword": true
  }
  ```

  | Trường | Ý nghĩa |
  |---|---|
  | `avatarUrl` | URL đọc được ảnh, hoặc `null`. Cách lưu ở CSDL và cách đổi ra URL: TD-14 |
  | `hasPassword` | `password_hash` khác NULL. `false` thì frontend ẩn mục đổi mật khẩu (BR-17, OQ-27) |

  Không trả `password_hash`, `google_id`, `failed_login_count`, `locked_until` (be-coding-rules mục 10).
- **Lỗi:** 401 như "Lỗi chung". Tài khoản trong token không còn tồn tại → 401.

## U2. PATCH `/users/me`

- **Quyền:** USER, ADMIN. **Sở hữu dữ liệu:** chỉ sửa tài khoản trong token.
- **Request:** `multipart/form-data` (có ảnh) hoặc JSON (chỉ đổi tên). Gửi ít nhất một trường.

  | Trường | Kiểu | Bắt buộc | Validation | BR |
  |---|---|---|---|---|
  | `fullName` | string | Không | Trim, 1–100 ký tự | BR-16 |
  | `avatar` | file | Không | JPG hoặc PNG theo magic bytes, ≤ `STORAGE_MAX_BYTES` (10 MB). Kiểm tra trong `StorageService` | BR-16 |

- **Response 200:** hồ sơ mới, cùng dạng U1. Frontend hiện ✎ "Đã cập nhật hồ sơ" (OQ-33).
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | `fullName` sai, hoặc không gửi trường nào | "Dữ liệu không hợp lệ" + `errors[]` (không gửi trường nào: `field = "fullName"`, câu "Vui lòng nhập họ tên") |
  | 400 | `INVALID_IMAGE_TYPE`, `IMAGE_TOO_LARGE` | Ảnh không phải JPG/PNG hoặc quá 10 MB | "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" (câu của C4 UC02, dùng lại cho ảnh đại diện, OQ-33) |

- **Ghi dữ liệu:** `users.full_name`, `users.avatar_url` (lưu khoá đối tượng, API trả URL qua `StorageService.resolveUrl`, TD-14). Ảnh lưu qua `StorageService.saveImage(buffer, 'avatars')` (TD-01). Multer chặn cứng tệp trên 20 MB ngay khi nhận (không giữ tệp khổng lồ trong bộ nhớ), cũng trả `IMAGE_TOO_LARGE` với cùng câu; giới hạn 10 MB do `StorageService` kiểm tra. Ảnh đại diện cũ do người dùng tải lên thì xoá khỏi kho sau khi cập nhật CSDL thành công; ảnh lấy từ Google thì không xoá. Lưu CSDL lỗi thì xoá ảnh vừa lưu.
- **Ghi chú:** không có chức năng gỡ ảnh đại diện hay đổi email (specs không có).

## U3. PUT `/users/me/password`

- **Quyền:** USER, ADMIN. **Sở hữu dữ liệu:** chỉ tài khoản trong token.
- **Request** (JSON):

  | Trường | Kiểu | Bắt buộc | Validation | BR |
  |---|---|---|---|---|
  | `currentPassword` | string | Có | Không trống | BR-17 |
  | `newPassword` | string | Có | Quy tắc mật khẩu | BR-17 (theo BR-05) |
  | `confirmNewPassword` | string | Có | Trùng `newPassword` | BR-17 |

- **Response 204.** Frontend hiện ✎ "Đã đổi mật khẩu" (OQ-33). Phiên hiện tại giữ nguyên.
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Trường sai | "Dữ liệu không hợp lệ" + `errors[]` |
  | 400 | `AUTH_WRONG_PASSWORD` | Mật khẩu hiện tại sai | ✎ "Mật khẩu hiện tại không đúng" + `errors: [{ field: "currentPassword", … }]` (OQ-33) |
  | 400 | `AUTH_PASSWORD_NOT_SET` | Tài khoản không có mật khẩu (chỉ dùng Google). Giao diện đã ẩn mục này, đây là chặn ở API | ✎ "Tài khoản đăng nhập bằng Google không có mật khẩu để đổi" (OQ-33) |

- **Ghi dữ liệu:** `users.password_hash`.
- **Ghi chú:** dùng 400 chứ không 401 cho mật khẩu sai, vì frontend coi 401 là hết phiên và tự refresh. Nhập sai mật khẩu hiện tại không tính vào bộ đếm khoá đăng nhập (BR-08 chỉ nói tới đăng nhập).

---

## Tích hợp ngoài

| Dịch vụ | Dùng cho | Cách gọi | Lỗi |
|---|---|---|---|
| Google OAuth 2.0 / OpenID Connect | A5, A6 | Authorization code flow phía server. Thư viện: TD-21. Cấu hình `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (đã có trong `.env.example`, để trống) | Mọi lỗi → 302 `/login?error=google`, ghi log mức WARN không kèm token |
| Redis | A1 → A4, A6 | Client: TD-21. `REDIS_HOST`, `REDIS_PORT` | Redis không kết nối được → 500 "Đã có lỗi xảy ra, vui lòng thử lại sau" (OQ-29) |

## Quyết định đã áp (chốt 21/11)

| Mã | Nội dung |
|---|---|
| TD-14 | Cột ảnh lưu **khoá đối tượng** cho ảnh hệ thống giữ (`avatars/2026/11/<uuid>.jpg`; nếu sau này dùng Cloudinary thì là `public_id`), ảnh ngoài (Google) lưu URL `https://…`. API đổi giá trị cột ra URL qua một hàm duy nhất của `StorageService` (`resolveUrl`), nên chuyển sang S3 hay Cloudinary chỉ cần thêm bản cài `StorageService` mới, không sửa dữ liệu |
| TD-15 | Hợp đồng A3, A4 như trên (khớp giả định của frontend) |
| TD-16 | Access 30 phút, refresh 7 ngày, bcrypt 10 vòng |
| TD-21 | `ioredis` ^5 (peer của `typeorm` 1.1.2), `google-auth-library`, `cookie-parser`. Swagger hoãn |
| TD-22 | Luồng Google phía server, `state` trong cookie, yêu cầu email Google đã xác minh |
| TD-23 | Refresh token dạng JWT + phiên theo thiết bị trong Redis, gia hạn trượt 7 ngày |
| OQ-31 → OQ-35 | Câu thông báo, câu lỗi theo trường, nhãn giao diện theo đề xuất ✎ |

Không làm ở bản này: quên mật khẩu (AUTH-05, OQ-03); đăng xuất mọi thiết bị khi đổi mật khẩu (specs không yêu cầu, ghi ở nợ kỹ thuật); Swagger (TD-05, xem TD-21).

## Nợ kỹ thuật và chỗ đơn giản hoá (review ở giai đoạn test)

| # | Nội dung | Ảnh hưởng |
|---|---|---|
| N1 | bcrypt chỉ dùng 72 **byte** đầu. Giới hạn 72 **ký tự** (OQ-32) nên mật khẩu nhiều chữ có dấu (2–3 byte/ký tự) bị cắt bớt khi băm | Mật khẩu rất dài, nhiều dấu: phần cuối không có tác dụng |
| N2 | Đổi mật khẩu không thu hồi phiên ở các thiết bị khác (specs không yêu cầu) | Thiết bị khác vẫn đăng nhập tới khi refresh token hết hạn |
| N3 | Hai tab cùng làm mới phiên đúng một lúc: tab sau nhận 401 vì token đã bị xoay (TD-23 chọn không huỷ phiên). Tải lại trang là vào lại được | Thỉnh thoảng phải tải lại trang |
| N4 | Không giới hạn tần suất gọi `/auth/login`, `/auth/register` theo IP (chỉ có khoá theo tài khoản, BR-08) | Dò email qua A1 (BR-10 vốn đã lộ email có tồn tại) |
| N5 | Ảnh Google lưu URL ngoài; nếu Google đổi URL thì ảnh hỏng, chưa có cơ chế cập nhật lại khi đăng nhập Google lần sau (specs chỉ nói lấy ảnh lần đầu) | Ảnh đại diện Google có thể mất |
| N6 | `LocalDiskStorage` phục vụ ảnh tĩnh không kiểm quyền (dev). Bản S3/Cloudinary cần presigned URL hoặc URL ký (TD-01, TD-14) | Chỉ dùng khi dev |
| N7 | Luồng Google dựa vào điều hướng toàn trang và cookie; khi đóng gói Capacitor cần xem lại (TD-02, TD-22) | Đóng gói app |

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 21/11/2026 | 0.1 | Sinh từ specs v0.2 (build-first, thay `/gen-docs`) | Claude |
| 21/11/2026 | 0.2 | Áp quyết định của Dương: TD-14 (trung lập S3/Cloudinary), TD-16 (access 30 phút), OQ-31 → 35, TD-21 → 23 | Claude theo quyết định của Dương |
| 21/11/2026 | 0.3 | Khớp với code: `jti` trong refresh token, giới hạn cứng 20 MB của multer, `resolveUrl`; thêm mục nợ kỹ thuật | Claude |

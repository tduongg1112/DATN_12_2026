# Specs — Xác thực tài khoản (`auth`)

> **Trạng thái:** VERIFIED (build-first 20/11, review lại ở giai đoạn test). Các điểm mở được Dương chốt ngày 20/11 (`docs/_shared/open_questions.md`). Chưa chạy `/cross-check specs`.
> **UC:** UC01 · **Mã chức năng:** AUTH-01, AUTH-02, AUTH-03 (Must) · AUTH-04 (Should, đưa vào phạm vi theo OQ-04) · AUTH-05 (Could, hoãn theo OQ-03)
> **Nguồn:** C4 = Chương 4 v0.2 Bảng 4.2, mục 4.2.2 · ERD = Phân tích Class & CSDL 4.1, 6.2, 6.5 · FL = Function List v0.2

## 1. Context
- Hệ thống hỗ trợ quản lý sức khoẻ cây trồng. Xác thực là **cổng vào bắt buộc**: mọi chức năng khác chỉ dùng được sau khi đăng nhập. *(C4 Bảng 4.2)*
- Mục tiêu: đăng ký bằng email, đăng nhập bằng email hoặc Google, đăng xuất, cập nhật hồ sơ và đổi mật khẩu (AUTH-04). Quản trị viên dùng chung đăng nhập và đăng xuất.
- Vai trò: Người dùng (`USER`), Quản trị viên (`ADMIN`). ADMIN kế thừa mọi chức năng của USER và có thêm khu quản trị (OQ-22).
- Feature khác đều phụ thuộc feature này (phân quyền, `user_id`).

## 2. User stories
| Mã | User story | Nguồn | Ưu tiên |
|---|---|---|---|
| US-01 | Là người dùng mới, tôi muốn tạo tài khoản bằng họ tên, email và mật khẩu để dùng hệ thống | C4 UC01 3b–7b | AUTH-01 Must |
| US-02 | Là người dùng, tôi muốn đăng nhập nhanh bằng tài khoản Google, tự có tài khoản nếu chưa từng đăng ký | C4 UC01 luồng chính 1–7 | AUTH-01, 02 Must |
| US-03 | Là người dùng hoặc quản trị viên, tôi muốn đăng nhập bằng email và mật khẩu, rồi được đưa tới đúng trang theo vai trò | C4 UC01 3a–5a | AUTH-02 Must |
| US-04 | Là người dùng hoặc quản trị viên, tôi muốn đăng xuất | C4 UC01 1c–2c | AUTH-03 Must |
| US-05 | Là người dùng hoặc quản trị viên, tôi muốn sửa họ tên, ảnh đại diện và đổi mật khẩu | FL AUTH-04; OQ-04 | AUTH-04 Should |

## 3. Business rules
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Mọi đường dẫn khi chưa đăng nhập đều chuyển tới màn đăng nhập | C4 UC01 Pre-condition |
| BR-02 | Màn đăng nhập gồm nút "Tiếp tục với Google", form đăng nhập bằng email + mật khẩu, và liên kết "Tạo tài khoản" | C4 UC01 bước 2 |
| BR-03 | Đăng nhập thành công: tạo phiên. `USER` được đưa tới trang đã truy cập trước khi bị chuyển sang màn đăng nhập (mặc định là trang chủ). `ADMIN` được đưa tới trang Dashboard | C4 UC01 Post-condition, 5a |
| BR-04 | Google: người dùng chọn tài khoản và đồng ý chia sẻ họ tên, email, ảnh đại diện. Email chưa có trong hệ thống thì tự tạo tài khoản vai trò `USER`. Email đã có thì đăng nhập vào tài khoản đó và gắn `google_id` vào tài khoản | C4 UC01 bước 5–6; ERD 4.1 |
| BR-05 | Đăng ký: form gồm họ tên, email, mật khẩu, xác nhận mật khẩu. Kiểm tra email chưa được dùng; mật khẩu **ít nhất 8 ký tự, có cả chữ và số**; hai mật khẩu trùng khớp | C4 UC01 4b–6b |
| BR-06 | Đăng ký thành công: tạo tài khoản vai trò `USER`, tự đăng nhập, thông báo "Tạo tài khoản thành công". **Không xác minh email** | C4 UC01 7b; OQ-02 |
| BR-07 | Sai email hoặc mật khẩu: thông báo "Email hoặc mật khẩu không đúng", không chỉ rõ trường nào sai | C4 UC01 4a1 |
| BR-08 | Sai mật khẩu 5 lần liên tiếp thì tạm khoá đăng nhập bằng mật khẩu 15 phút. Đăng nhập đúng thì `failed_login_count` về 0. Hai giá trị này để trong cấu hình | C4 4a1 ("define sau"); ERD 4.1, 6.5; OQ-02 |
| BR-09 | Người dùng huỷ hoặc đóng cửa sổ đăng nhập Google: quay lại màn đăng nhập, không thay đổi dữ liệu | C4 UC01 5.1 |
| BR-10 | Email đã được đăng ký: thông báo "Email này đã có tài khoản. Bạn có thể đăng nhập hoặc tiếp tục với Google" | C4 UC01 6b1 |
| BR-11 | Mật khẩu không đạt yêu cầu hoặc không trùng khớp: hiển thị lỗi ngay dưới trường tương ứng, giữ nguyên dữ liệu đã nhập | C4 UC01 6b2 |
| BR-12 | Đăng xuất: chọn ảnh đại diện, chọn "Đăng xuất". Hệ thống huỷ phiên (thu hồi refresh token) và chuyển về màn đăng nhập | C4 UC01 1c–2c; FL AUTH-03; TD-03 |
| BR-13 | Tài khoản `ADMIN` được khởi tạo sẵn bằng seed, không đăng ký qua giao diện | C4 4.2.2; ERD 4.1 |
| BR-14 | Email lưu dạng chữ thường và là duy nhất. Tài khoản phải có ít nhất `password_hash` hoặc `google_id` | ERD 4.1, 6.2 |
| BR-15 | Phân quyền: ADMIN kế thừa mọi chức năng của USER và có thêm khu quản trị. Route của người dùng mở cho cả `USER` và `ADMIN`; route quản trị chỉ `ADMIN`. Sau khi đăng nhập, ADMIN vẫn vào Dashboard (BR-03). Giao diện có đường chuyển giữa khu quản trị và khu người dùng | UC-png 18/11; OQ-22 |
| BR-16 | Cập nhật hồ sơ: sửa họ tên, ảnh đại diện | FL AUTH-04 |
| BR-17 | Đổi mật khẩu: nhập mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu mới. Mật khẩu mới theo quy tắc BR-05. Tài khoản không có `password_hash` (chỉ dùng Google) thì không hiện mục đổi mật khẩu | FL AUTH-04; OQ-27 |

## 4. Data requirements
- Bảng `users` (`docs/_shared/data_model.md`). Feature này ghi: `full_name`, `email`, `password_hash` (bcrypt), `google_id`, `avatar_url`, `role`, `failed_login_count`, `locked_until`. AUTH-04 sửa `full_name`, `avatar_url`, `password_hash`.
- Giá trị ban đầu: `role = USER`, `failed_login_count = 0`. Đăng ký email thì `google_id = NULL`. Lần đầu đăng nhập Google thì `password_hash = NULL`, lấy họ tên và ảnh từ Google. *(ERD 4.1)*
- `allow_data_sharing`: bỏ ở bản build này (DC-01, OQ-12). Form đăng ký không hỏi đồng ý chia sẻ ảnh.
- Không có chức năng xoá tài khoản. *(ERD 4.1)*

## 5. UI/UX requirements
- Màn **Đăng nhập** và **Đăng ký** dùng khuôn "Biểu mẫu" (nền trắng, một cột; trên desktop là card rộng 440 giữa trang). *(design/06)*
- Menu ảnh đại diện có mục "Đăng xuất". *(C4 1c)*
- Lỗi hiển thị dưới từng trường. Không xoá dữ liệu đã nhập khi có lỗi. *(C4 6b2)*

## 6. Technical requirements
- JWT access + refresh token. *(FL AUTH-02)* Refresh token: lưu bản băm trong Redis, xoay vòng mỗi lần refresh, xoá khi đăng xuất (TD-03). Phía trình duyệt: access token trong bộ nhớ, refresh token trong cookie httpOnly, SameSite=Lax, path `/api/v1/auth` (TD-12).
- API theo TD-05: tiền tố `/api/v1`, lỗi dạng `{statusCode, code, message, errors?}`, `message` là câu tiếng Việt đúng specs.
- Ảnh đại diện lưu trên AWS S3 qua `StorageService` (TD-01).
- bcrypt cho mật khẩu. Đăng nhập Google qua OAuth, **làm ngay** trong feature này (TD-13). `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` để trống trong `.env.example`. Thư viện Google và client Redis chưa có trong `package.json`, phải hỏi trước khi thêm.
- Guard JWT áp mặc định cho mọi route, trừ đăng ký, đăng nhập và callback Google. Role guard `USER`/`ADMIN`.
- Seed `ADMIN` đọc `ADMIN_EMAIL`, `ADMIN_PASSWORD` từ `.env`. *(ERD 7.1)*

## 7. Điểm chưa chốt và quyết định (build-first 20/11)
| Mã | Quyết định / trạng thái | Ảnh hưởng |
|---|---|---|
| OQ-02 | Đã chốt: không xác minh email; khoá 15 phút sau 5 lần sai, để trong cấu hình | BR-06, BR-08 |
| OQ-03 | Hoãn: quên mật khẩu (AUTH-05) không làm ở bản này | Ngoài phạm vi |
| OQ-04 | Đã chốt: làm AUTH-04 ngay | US-05, BR-16, BR-17 |
| OQ-12 | Đã chốt: bỏ `allow_data_sharing` | Form đăng ký |
| OQ-22 | Đã chốt: ADMIN kế thừa chức năng USER | BR-15 |
| OQ-27 | Đã chốt: ẩn đổi mật khẩu với tài khoản chỉ dùng Google; mật khẩu mới theo BR-05 | BR-17 |
| TD-03, TD-05, TD-12, TD-13 | Đã chốt: Redis cho refresh token; chuẩn API; nơi giữ token; Google làm ngay | Mục 6 |
| TD-01 | Đã chốt: AWS S3 sau `StorageService` | Ảnh đại diện |

Còn mở: câu thông báo thành công và lỗi cho AUTH-04 chưa có trong C4 hay FL. Soạn ở bước 6 (`/gen-docs auth`), Dương duyệt.

Ghi chú: FL AUTH-01 nhắc đăng ký bằng SĐT, nhưng C4 chỉ có email và Google. Specs theo C4.

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn, đủ luồng thay thế và ngoại lệ, câu chữ đúng nguyên văn
- [ ] Tester: mỗi BR kiểm thử được, có giá trị biên (mật khẩu 7, 8 ký tự; lần sai thứ 4, 5)
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md`
- [ ] `/cross-check auth specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 20/11/2026 | 0.1 | Tách từ C4 v0.2, ERD-doc, FL v0.2 khi dựng workflow | Claude (chờ Dương duyệt) |
| 20/11/2026 | 0.2 | Build-first: áp OQ-02, 03, 04, 12, 22, 27, TD-01, 03, 05, 12, 13. Thêm US-05, BR-15 → BR-17. Chuyển VERIFIED | Claude theo quyết định của Dương |

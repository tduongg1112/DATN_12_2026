# Database design — Xác thực tài khoản (`auth`)

> **Trạng thái:** REVIEWED (build-first 21/11, review lại ở giai đoạn test) · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.
> Entity: `backend/src/modules/accounts/entities/user.entity.ts` (đã có, khớp migration `InitSchema1795219200000`).

## 1. Bảng sử dụng

| Bảng | Thao tác | Cột dùng | Ghi chú |
|---|---|---|---|
| `users` | C | `full_name`, `email`, `password_hash`, `google_id`, `avatar_url`, `role` | Đăng ký email (A1), đăng nhập Google lần đầu (A6). `role` luôn `USER`; ADMIN chỉ do seed tạo (BR-13) |
| `users` | R | Mọi cột | Đăng nhập (A2), refresh (A3, đọc lại `role`), Google (A6), hồ sơ (U1) |
| `users` | U | `failed_login_count`, `locked_until` | Đếm sai mật khẩu, tạm khoá (A2, BR-08) |
| `users` | U | `google_id` | Gắn Google vào tài khoản email sẵn có (A6, BR-04) |
| `users` | U | `full_name`, `avatar_url` | Cập nhật hồ sơ (U2, BR-16) |
| `users` | U | `password_hash` | Đổi mật khẩu (U3, BR-17) |
| `users` | D | — | Không có. Không có chức năng xoá tài khoản (specs mục 4; mọi FK tới `users` là RESTRICT) |

Không ghi bảng nào khác. Phiên đăng nhập (refresh token) nằm trong Redis, không phải bảng nghiệp vụ (ERD 3.2, TD-03).

Ràng buộc CSDL feature dựa vào (đã có trong migration):

| Ràng buộc | Dùng để |
|---|---|
| `uq_users_email` | Chặn trùng email khi hai yêu cầu đăng ký chạy song song (A1 → 409 BR-10) |
| `uq_users_google_id` | Một tài khoản Google chỉ gắn một tài khoản |
| `ck_users_login_method` | Tài khoản phải có `password_hash` hoặc `google_id` (BR-14). A6 luôn đặt `google_id` khi tạo; A1 luôn đặt `password_hash` |
| `ck_users_role` | `role` ∈ `USER`, `ADMIN` |

## 2. Truy vấn chính

| # | Mục đích | Truy vấn | Chỉ mục |
|---|---|---|---|
| Q1 | A1, A2, A6: tìm theo email (BR-05, 07, 04) | `findOneBy({ email })`, email đã trim + chữ thường | `uq_users_email` |
| Q2 | A6: tìm theo Google `sub` | `findOneBy({ googleId })` | `uq_users_google_id` |
| Q3 | A3, U1 → U3: tài khoản trong token | `findOneBy({ id })` | `pk_users` |
| Q4 | A2: tăng bộ đếm sai mật khẩu, an toàn khi gửi đồng thời (BR-08) | `UPDATE users SET failed_login_count = failed_login_count + 1, updated_at = now() WHERE id = $1 RETURNING failed_login_count` | `pk_users` |
| Q5 | A2: đủ số lần sai thì khoá (BR-08) | `UPDATE users SET locked_until = now() + <AUTH_LOCK_MINUTES phút>, failed_login_count = 0 WHERE id = $1` (OQ-31) | `pk_users` |
| Q6 | A2: đăng nhập đúng thì đếm lại từ 0 (BR-08) | `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1`. Chỉ chạy khi đang khác 0 hoặc khác NULL | `pk_users` |
| Q7 | A6: gắn Google (BR-04) | `UPDATE users SET google_id = $2 WHERE id = $1` | `pk_users` |
| Q8 | U2, U3: sửa hồ sơ, mật khẩu | `update({ id }, { fullName?, avatarUrl? })`, `update({ id }, { passwordHash })` | `pk_users` |

## 3. Giao dịch

Feature chỉ ghi **một bảng** (`users`), mỗi thao tác là một câu lệnh, nên không cần transaction CSDL.

Thao tác vừa ghi CSDL vừa ghi nơi khác, thứ tự để không mất nhất quán:

| Thao tác | Thứ tự | Khi lỗi giữa chừng |
|---|---|---|
| A1 đăng ký, A6 Google lần đầu | (1) INSERT `users` → (2) tạo phiên Redis → (3) đặt cookie | (2) lỗi: tài khoản đã tạo nhưng chưa có phiên; trả 500, người dùng đăng nhập lại được bằng A2 hoặc Google. Không xoá tài khoản |
| U2 đổi ảnh đại diện | (1) `StorageService.saveImage` → (2) UPDATE `users` → (3) xoá ảnh cũ (chỉ khi là ảnh tải lên) | (2) lỗi: xoá ảnh vừa lưu ở (1). (3) lỗi: chỉ ghi log, ảnh cũ thành rác trong kho |

## 4. Migration và seed

- **Không có migration mới.** Bảng `users` đã đủ cột theo `data_model.md`.
- Seed giữ nguyên: `npm run seed` tạo 1 ADMIN từ `ADMIN_EMAIL`, `ADMIN_PASSWORD`, bcrypt 10 vòng (BR-13, TD-16).
- Tham số trong cấu hình (đã có ở `backend/.env.example`): `AUTH_MAX_FAILED_LOGINS=5`, `AUTH_LOCK_MINUTES=15`, `JWT_*`, `REDIS_*`, `GOOGLE_*`.

## 5. Quyết định đã áp

| Mã | Ảnh hưởng tới CSDL |
|---|---|
| TD-14 (chốt 21/11) | `users.avatar_url`: ảnh tải lên lưu khoá đối tượng, ảnh Google lưu URL `https://…`. Không đổi kiểu cột (VARCHAR(500)) |
| OQ-31 (chốt 21/11) | Q5 đặt `failed_login_count = 0` khi khoá, hết khoá có lại đủ số lần thử |

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 21/11/2026 | 0.1 | Sinh từ specs v0.2 (build-first, thay `/gen-docs`) | Claude (chờ Dương duyệt) |

# Database design — Chẩn đoán bệnh qua hình ảnh (`diagnosis`)

> **Trạng thái:** REVIEWED (build-first 22/11, review lại ở giai đoạn test) · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.
> Entity: `diagnosis/entities/diagnosis.entity.ts`, `diagnosis-prediction.entity.ts`. `crop_id` đã chuyển NOT NULL theo OQ-05 (mục 4, code 23/11).

## 1. Bảng sử dụng

| Bảng | Thao tác | Cột dùng | Ghi chú |
|---|---|---|---|
| `diagnoses` | C | `user_id`, `crop_id`, `original_image_url`, `processed_image_url`, `status = PROCESSING` | D1 bước 3, **trước** khi gọi AI (BR-07). `plant_id = NULL` ở lần build này |
| `diagnoses` | U | `status`, `result_type`, `model_version`, `inference_ms`, `completed_at` | D1 bước 6 (`COMPLETED`) hoặc khi AI lỗi (`FAILED`) |
| `diagnoses` | R | Mọi cột | D2: lượt của chính mình, `COMPLETED`, chưa xoá mềm |
| `diagnosis_predictions` | C | `diagnosis_id`, `label_id`, `probability`, `rank_no` | 1 → 3 dòng mỗi lượt (BR-13) |
| `diagnosis_predictions` | R | Mọi cột | D2 |
| `model_labels` | R | `id`, `class_code`, `label_type`, `disease_id`, `is_active` | Tra nhãn AI trả về (BR-11). Đọc qua `ModelLabelService` của `catalog` |
| `crops` | R | `id`, `code`, `name`, `status`, `care_guide` | Kiểm tra `cropId` (D1), lấy `crop_code` gửi AI, gợi ý chăm sóc khi `HEALTHY` (BR-16) |
| `diseases` | R | `id`, `name`, `severity`, `pathogen_group`, `summary`, `symptoms`, `treatment`, `status`, `crop_id` | Nội dung kết quả (BR-15, BR-18). Bệnh bị ẩn vẫn đọc được |
| `users` | R | `id`, `role` | BR-11: tìm mọi ADMIN để gửi thông báo |
| `notifications` | C, R | `user_id`, `title`, `content`, `reminder_id = NULL` | BR-11 (TD-25): kiểm tra đã báo `class_code` này chưa, rồi tạo |

Lượt chẩn đoán đọc các bảng của `catalog` qua service mà `catalog` export, không inject repository của mô-đun khác (be-coding-rules mục 2). Chi tiết ở mục 2.

## 2. Truy vấn chính

| # | Mục đích | Truy vấn | Chỉ mục |
|---|---|---|---|
| Q1 | D1: loại cây hợp lệ, lấy `code` (BR-07) | `crops` theo `id`, `status = 'ACTIVE'`. `CropService.findActive(id)` của `catalog` | `pk_crops` |
| Q2 | D1: tra nhãn theo `class_code` (BR-11) | `model_labels WHERE class_code = ANY(:codes) AND is_active`. Thêm `ModelLabelService.findActiveByCodes(codes)` | `uq_model_labels_class_code` |
| Q3 | D1: ghi kết quả (BR-13) | Một giao dịch: INSERT n dòng `diagnosis_predictions`; `UPDATE diagnoses SET status='COMPLETED', result_type, model_version, inference_ms, completed_at=now() WHERE id = :id AND status = 'PROCESSING'` | `pk_diagnoses` |
| Q4 | D1: AI lỗi (BR-10) | `UPDATE diagnoses SET status='FAILED', completed_at=now() WHERE id = :id AND status = 'PROCESSING'` | `pk_diagnoses` |
| Q5 | D2: một lượt của chính mình | `diagnoses WHERE id = :id AND user_id = :me AND status = 'COMPLETED' AND deleted_at IS NULL`, kèm `crop`, `predictions` → `label` → `disease` → `disease.crop` | `pk_diagnoses` |
| Q6 | BR-11: đã báo nhãn này chưa (TD-25) | Id các ADMIN lấy qua `UsersService.findAdminIds()` (`users WHERE role = 'ADMIN'`), rồi `EXISTS notifications WHERE user_id = ANY(:adminIds) AND reminder_id IS NULL AND content = :content` | `ix_notifications_user` (chỉ một phần) |
| Q7 | BR-11: tạo thông báo | INSERT một dòng `notifications` cho mỗi ADMIN. Q6 và Q7 nằm trong **một giao dịch**, mở đầu bằng `pg_advisory_xact_lock(hashtext(content))` để hai lượt cùng lúc gặp cùng nhãn lạ không tạo trùng | — |

`disease.detailAvailable` (D2) = `disease.status = 'PUBLISHED' AND crop của bệnh status = 'ACTIVE'`, tính ở service từ dữ liệu đã nạp.

## 3. Giao dịch và thứ tự ghi

| Thao tác | Thứ tự | Khi lỗi giữa chừng |
|---|---|---|
| D1 thành công | (1) lưu 2 ảnh → (2) INSERT `diagnoses` PROCESSING → (3) gọi AI (ngoài giao dịch) → (4) **giao dịch**: INSERT predictions + UPDATE COMPLETED | (2) lỗi: xoá 2 ảnh vừa lưu, trả 500. (4) lỗi: giao dịch huỷ, lượt chuyển `FAILED` (Q4), trả 503 |
| D1, AI lỗi hoặc nhãn lạ | (3) lỗi → Q4 `FAILED` (+ Q6, Q7 nếu nhãn lạ) | Gửi thông báo lỗi thì chỉ ghi log, vẫn trả 503 cho người dùng |

Không giữ giao dịch trong lúc chờ AI (tối đa 15 giây), để không khoá dòng lâu. Điều kiện `status = 'PROCESSING'` ở Q3, Q4 bảo đảm một lượt chỉ kết thúc một lần.

## 4. Migration và seed

- **Migration** `DiagnosesCropRequired1795392000000` (đã chạy trên CSDL dev 23/11, `schema:log` báo khớp). `up`: `ALTER TABLE diagnoses ALTER COLUMN crop_id SET NOT NULL`. `down`: `DROP NOT NULL`. Theo OQ-05 (chốt 22/11) và `data_model.md`. Trước khi chạy, migration kiểm tra không còn dòng `crop_id IS NULL`; còn thì dừng và báo. CSDL dev hiện chưa có lượt nào. Entity đổi `crop_id` thành `nullable: false`.
- **Seed dev (OQ-41, chốt 22/11):** điền `crops.care_guide` mẫu cho 5 loại cây khi cột đang trống, giống cách làm của OQ-36. Nội dung ở `seeds/dev-sample-content.ts` (`SAMPLE_CROP_CARE_GUIDES`); đã chạy `seed:dev` 23/11.
- Không đổi bảng nào khác.

## 5. Quyết định đã áp

| Mã | Ảnh hưởng tới CSDL |
|---|---|
| OQ-05 (chốt 22/11) | `diagnoses.crop_id` NOT NULL (migration mục 4) |
| OQ-23 (chốt 20/11) | D2 chỉ đọc lượt `COMPLETED` |
| OQ-26 (chốt 20/11) | Q6, Q7: thông báo cho ADMIN, không trùng theo `class_code` |
| TD-14 (chốt 21/11) | Cột ảnh lưu khoá đối tượng |
| TD-25 (chốt 22/11) | `notifications` ghi qua service của `plants` |
| OQ-41 (chốt 22/11) | `crops.care_guide` mẫu trong seed dev |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 22/11/2026 | 0.1 | Sinh từ specs v0.3 (build-first) | Claude |
| 22/11/2026 | 0.2 | Dương duyệt. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 23/11/2026 | 0.3 | Code xong: Q1, Q6, Q7 ghi đúng cách cài đặt (Q6 lọc theo id ADMIN, khoá tư vấn chống tạo trùng); migration và seed đã chạy | Claude |

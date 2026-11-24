# Database design — Quản lý cây trồng của tôi (`my_plants`)

> **Trạng thái:** REVIEWED (build-first 23/11, review lại ở giai đoạn test) · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.
> **Code:** đợt 1 DONE (23/11). Q1 → Q3, Q7 ở `plants/plant-reads.query.ts`; Q4 → Q6, Q9 ở `plants/plants.service.ts`; Q8 ở `diagnosis/plant-link/plant-link.service.ts`.
> Không thêm bảng, cột hay migration. Entity đã có: `plants/entities/plant.entity.ts`, `plant-log.entity.ts`, `reminder.entity.ts`, `notification.entity.ts`. Đã có các khoá ngoại cần cho BR-11 (CASCADE, SET NULL) từ migration đầu tiên.

## 1. Bảng sử dụng

| Bảng | Thao tác | Cột dùng | Đợt | Ghi chú |
|---|---|---|---|---|
| `plants` | C, R, U, D | mọi cột | 1 | Chỉ của chính mình (BR-13). `health_status` đổi ở P6, A1, A2, D1 |
| `plant_logs` | C, R | mọi cột | 1 | `CARE_NOTE` (P7), `STATUS_CHANGE` (P6). Xoá theo cây (CASCADE, DC-07) |
| `reminders` | C, R, U | mọi cột | 2 | R1, R2, J1; P6 tắt `RECHECK` (BR-16). Xoá theo cây (CASCADE) |
| `notifications` | C, R, U | mọi cột | 2 | J1 tạo; N1 → N4. `reminder_id` thành NULL khi nhắc bị xoá |
| `crops` | R | `id`, `code`, `name`, `status`, `watering_interval_days`, `fertilizing_interval_days` | 1, 2 | Qua `CropService` của `catalog` (thêm hàm đọc chu kỳ ở đợt 2) |
| `diseases` | R | `id`, `name`, `severity`, `treatment`, `recheck_days`, `status`, `crop_id` | 1, 2 | Bệnh đang mắc (BR-06), gợi ý `RECHECK` (diagnosis BR-26) |
| `diagnoses` | U | `plant_id` | 1 | Chỉ mô-đun `diagnosis` ghi (A1, A2, D1) |
| `diagnoses`, `diagnosis_predictions`, `model_labels` | R | | 1 | P1, P3 đọc trong mô-đun `plants`: TD-29 |
| `users` | R | `id` | 2 | Người nhận thông báo là chủ cây (`plants.user_id`) |

## 2. Truy vấn chính

| # | Mục đích | Truy vấn | Chỉ mục |
|---|---|---|---|
| Q1 | P1 danh sách | `plants p JOIN crops c` + `LEFT JOIN (SELECT plant_id, MAX(created_at) AS last_at FROM diagnoses WHERE user_id = :me AND status = 'COMPLETED' AND deleted_at IS NULL AND plant_id IS NOT NULL GROUP BY plant_id) d ON d.plant_id = p.id` `WHERE p.user_id = :me` `ORDER BY CASE health_status WHEN 'DISEASED' THEN 0 WHEN 'TREATING' THEN 1 ELSE 2 END, d.last_at DESC NULLS LAST, p.created_at DESC, p.id DESC` `OFFSET/LIMIT` 10 mỗi trang, kèm `COUNT(*)` (OQ-45) | `ix_plants_user`, `ix_diagnoses_plant` |
| Q2 | P3 dòng thời gian, chẩn đoán | Như `history` Q1 nhưng `d.plant_id = :plantId` thay cho bộ lọc, không phân trang | `ix_diagnoses_plant` |
| Q3 | P3 bệnh đang mắc (BR-06) | Lượt `DISEASE` mới nhất trong Q2 → nhãn hạng 1 → bệnh. Chỉ khi `health_status IN ('DISEASED','TREATING')` (OQ-46) | như Q2 |
| Q4 | P3 nhật ký | `plant_logs WHERE plant_id = :id ORDER BY action_date DESC, created_at DESC` | `ix_plant_logs_plant` |
| Q5 | P3 lịch nhắc | `reminders WHERE plant_id = :id AND is_active ORDER BY next_remind_at` | `ix_reminders_plant` |
| Q6 | P6 (BR-08, BR-16) | Một giao dịch: `UPDATE plants SET health_status`; `INSERT plant_logs (STATUS_CHANGE, status_after, action_date = CURRENT_DATE)`; nếu `RECOVERED`: `UPDATE reminders SET is_active = false WHERE plant_id = :id AND reminder_type = 'RECHECK' AND is_active` | `pk_plants`, `ix_reminders_plant` |
| Q7 | A1, A2, D1 áp kết quả (OQ-48) | Trong giao dịch của endpoint: khoá cây `SELECT … FOR UPDATE`; kiểm tra lượt mới hơn `MAX(created_at)` các lượt khác của cây và mới hơn `MAX(created_at)` của `STATUS_CHANGE`; đúng thì `UPDATE plants SET health_status` | `ix_diagnoses_plant`, `ix_plant_logs_plant` |
| Q8 | A1 gắn | `UPDATE diagnoses SET plant_id = :plantId WHERE id = :id AND user_id = :me AND status = 'COMPLETED' AND deleted_at IS NULL AND plant_id IS NULL`; 0 dòng thì phân biệt 404 và 409 bằng một lần đọc | `pk_diagnoses` |
| Q9 | P5 xoá (BR-11) | `DELETE FROM plants WHERE id = :id AND user_id = :me` (khoá ngoại làm phần còn lại); đọc trước `avatar_url` và `plant_logs.image_url` để xoá ảnh sau khi xong | `pk_plants` |
| Q10 | J1 (BR-15, TD-28) | `SELECT r.* FROM reminders r WHERE r.is_active AND r.next_remind_at <= now() ORDER BY r.next_remind_at LIMIT 100 FOR UPDATE SKIP LOCKED`, join `plants` lấy `user_id`, `name`; mỗi dòng: `INSERT notifications`, `UPDATE reminders` | `ix_reminders_due` |
| Q11 | R2 không trùng (BR-16) | `EXISTS reminders WHERE plant_id = :id AND reminder_type = :type AND is_active` | `ix_reminders_plant` |
| Q12 | N1, N2 | `notifications n LEFT JOIN reminders r ON r.id = n.reminder_id WHERE n.user_id = :me ORDER BY n.created_at DESC, n.id DESC`; đếm `is_read = false` | `ix_notifications_user` |

Q1 → Q3 đọc bảng của mô-đun `diagnosis` từ mô-đun `plants`: TD-29 phương án A (chốt 23/11), truy vấn **chỉ đọc** qua `DataSource`, đặt trong một lớp riêng của `plants` (như `disease-trends.query.ts` của TD-24).

## 3. Giao dịch

| Thao tác | Trong giao dịch | Ghi chú |
|---|---|---|
| P6 cập nhật tình trạng | Q6 | BR-08 (ERD 6.5) |
| P5 xoá cây | Q9 | Xoá ảnh trong kho **sau** khi giao dịch xong; lỗi xoá ảnh chỉ ghi log |
| P2, P4, P7 có ảnh | Lưu ảnh trước, rồi ghi CSDL; ghi lỗi thì xoá ảnh vừa lưu | Như avatar của `auth` |
| A1 | Q8 + Q7 | `diagnosis` gọi service của `plants` với cùng `EntityManager` |
| A2 | Tạo cây + Q8 + Q7 | Như trên |
| D1 có `plantId` | Q7 nằm trong giao dịch bước 6 của D1 (BR-13 của `diagnosis`) | |
| J1 | Mỗi nhắc một giao dịch nhỏ | Một nhắc lỗi không chặn các nhắc khác |

## 4. Migration và seed

- Không có migration mới.
- **Seed dev (OQ-52, chốt 23/11, đợt 2):** điền mẫu khi cột đang trống. Giá trị thật: `docs/_shared/real_data_needed.md`.
  - `crops.watering_interval_days`, `fertilizing_interval_days`: Lúa —/20, Ngô 3/21, Cà chua 2/14, Ớt 2/14, Khoai tây 3/14 (ngày). Lúa không gợi ý tưới vì là ruộng nước.
  - `diseases.recheck_days` của 6 bệnh mẫu: 7 ngày.

## 5. Quyết định áp dụng

| Mã | Ảnh hưởng |
|---|---|
| OQ-24 (chốt 20/11) | Xoá, hoàn tác lượt chẩn đoán không đổi tình trạng (Q7 chỉ chạy khi gắn) |
| OQ-09 (chốt 20/11) | J1 chỉ tạo `notifications` |
| DC-07 → DC-10 (chốt 20/11) | `plant_logs.plant_id` CASCADE; giữ `status_after`, `image_url`, `planted_date`; cột `plants.note` |
| TD-25 (chốt 22/11) | A1, A2, D1 ở mô-đun `diagnosis`, gọi service của `plants` |
| OQ-45 → OQ-48, OQ-52, TD-28 (chốt 23/11) | Thứ tự, phân trang danh sách; bệnh đang mắc; cách áp kết quả; seed mẫu; job |
| TD-29 (chốt 23/11, phương án A) | Q1 → Q3 đọc `diagnoses` từ `plants`, chỉ đọc |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 23/11/2026 | 0.1 | Sinh từ specs my_plants v0.2 (build-first) | Claude |
| 23/11/2026 | 0.2 | Dương duyệt (Q1 phân trang 10 cây). Chuyển REVIEWED | Claude theo quyết định của Dương |
| 23/11/2026 | 0.3 | Code xong đợt 1 | Claude |

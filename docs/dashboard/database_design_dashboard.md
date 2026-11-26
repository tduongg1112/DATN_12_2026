# Database design — Xem dashboard & báo cáo (`dashboard`)

> **Trạng thái:** DRAFT (build-first 25/11, chờ Dương duyệt) · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.
> Không thêm bảng, cột hay migration. Mô-đun `dashboard` không có entity: mọi truy vấn là SQL **chỉ đọc** qua `DataSource` (TD-08, ngoại lệ đầu tiên của ranh giới mô-đun ở be-coding-rules mục 2).
> Mã endpoint (S1, S2) theo `api_dashboard.md`. `:from`, `:to` là khoảng `[from, to)`; `:tz` là múi giờ IANA.

## 1. Bảng sử dụng

| Bảng | Thao tác | Cột dùng | Ghi chú |
|---|---|---|---|
| `users` | R | `id`, `role`, `created_at` | Chỉ `role = 'USER'` (OQ-62 ✎) |
| `diagnoses` | R | `id`, `user_id`, `crop_id`, `status`, `result_type`, `model_version`, `processed_image_url`, `created_at`, `completed_at`, `deleted_at` | Chỉ `COMPLETED` (BR-08); **không** lọc `deleted_at` khi đếm (BR-05) |
| `diagnosis_predictions` | R | `diagnosis_id`, `label_id`, `probability`, `rank_no` | Chỉ `rank_no = 1` |
| `model_labels` | R | `id`, `label_type`, `disease_id` | Nhãn hạng 1 → bệnh |
| `diseases` | R | `id`, `name`, `crop_id`, `status` | Bệnh phát hiện nhiều nhất; số bệnh công khai |
| `crops` | R | `id`, `code`, `name`, `status` | Tên loại cây |

## 2. Truy vấn chính

Viết tắt **C** = `diagnoses d WHERE d.status = 'COMPLETED' AND d.created_at >= :from AND d.created_at < :to` (dùng `ix_diagnoses_created`). **P1** = `JOIN diagnosis_predictions p ON p.diagnosis_id = d.id AND p.rank_no = 1 JOIN model_labels l ON l.id = p.label_id`.

| # | Mục đích | Truy vấn | Chỉ mục |
|---|---|---|---|
| Q1 | Người dùng mới, kỳ này và kỳ trước | `SELECT COUNT(*) FILTER (WHERE created_at >= :from AND created_at < :to), COUNT(*) FILTER (WHERE created_at >= :prevFrom AND created_at < :from) FROM users WHERE role = 'USER' AND created_at >= :prevFrom AND created_at < :to` | — (bảng nhỏ) |
| Q2 | Người dùng hoạt động | `SELECT COUNT(DISTINCT d.user_id) FROM` **C** `JOIN users u ON u.id = d.user_id AND u.role = 'USER'` | `ix_diagnoses_created` |
| Q3 | Tổng, theo dạng kết quả, độ tin cậy TB, thời gian phản hồi TB | `SELECT COUNT(*), COUNT(*) FILTER (WHERE result_type = …)` × 3, `AVG(p.probability)::float8`, `AVG(EXTRACT(EPOCH FROM d.completed_at - d.created_at) * 1000)::float8 FROM` **C P1** | `ix_diagnoses_created`, `pk_diagnosis_predictions` |
| Q4 | Theo ngày | `SELECT to_char(g, 'YYYY-MM-DD') AS date, COALESCE(n, 0) FROM generate_series(date_trunc('day', :from AT TIME ZONE :tz), date_trunc('day', (:to - interval '1 microsecond') AT TIME ZONE :tz), interval '1 day') g LEFT JOIN (SELECT date_trunc('day', d.created_at AT TIME ZONE :tz) AS day, COUNT(*) AS n FROM` **C** `GROUP BY 1) x ON x.day = g ORDER BY g` | `ix_diagnoses_created` |
| Q5 | Theo loại cây | `SELECT c.id, c.code, c.name, COUNT(d.id) FROM crops c LEFT JOIN diagnoses d ON d.crop_id = c.id AND` (điều kiện **C**) `GROUP BY c.id HAVING c.status = 'ACTIVE' OR COUNT(d.id) > 0 ORDER BY c.id` | `ix_diagnoses_created` |
| Q6 | Top 5 bệnh | `SELECT ds.id, ds.name, c.id, c.code, c.name, COUNT(*) AS n FROM` **C P1** `JOIN diseases ds ON ds.id = l.disease_id JOIN crops c ON c.id = ds.crop_id WHERE d.result_type = 'DISEASE' GROUP BY ds.id, c.id ORDER BY n DESC, ds.name LIMIT 5` | `ix_predictions_label` |
| Q7 | Phiên bản mô hình | `SELECT model_version FROM diagnoses WHERE status = 'COMPLETED' ORDER BY completed_at DESC, id DESC LIMIT 1` | — (xem mục 4) |
| Q8 | Số bệnh công khai | `SELECT c.id, c.code, c.name, COUNT(ds.id) FILTER (WHERE ds.status = 'PUBLISHED') FROM crops c LEFT JOIN diseases ds ON ds.crop_id = c.id GROUP BY c.id ORDER BY c.id` | `ix_diseases_crop_status` |
| Q9 | S2 danh sách | `SELECT d.id, d.created_at, d.result_type, d.processed_image_url, d.deleted_at, p.probability, c.*, l.label_type, ds.id, ds.name FROM` **C P1** `JOIN crops c ON c.id = d.crop_id LEFT JOIN diseases ds ON ds.id = l.disease_id` + (`d.result_type = :resultType`) (`d.crop_id = :cropId`) (`l.disease_id = :diseaseId`) `ORDER BY d.created_at DESC, d.id DESC OFFSET/LIMIT`, kèm `COUNT(*)` | `ix_diagnoses_created` |

- Q1 → Q8 chạy song song cho S1 (mỗi câu chỉ đọc, không cần giao dịch). Kết quả có thể lệch nhau vài lượt nếu có lượt mới hoàn tất giữa các câu; chấp nhận được với số liệu thống kê.
- Q4 chia ngày theo `:tz` của máy quản trị viên, nên trục ngày khớp với ngày người xem thấy. `AVG` của PostgreSQL trả `numeric`, ép `::float8` (database-rules mục 3).
- Q9: lượt có `deleted_at` thì service đặt `imageUrl = null` (`history` BR-09). Ảnh đổi khoá sang URL qua `StorageService.resolveUrl` (TD-14).

## 3. Giao dịch

Không có thao tác ghi.

## 4. Chỉ mục và hiệu năng

- Dùng chỉ mục có sẵn: `ix_diagnoses_created` (lọc khoảng thời gian, ERD-doc 6.4), `ix_predictions_label` (bệnh phát hiện nhiều nhất), `ix_diseases_crop_status`.
- Q7 không có chỉ mục trên `completed_at`; với số lượt của đồ án (vài nghìn) quét bảng là đủ nhanh. Nếu cần, đổi sang `ORDER BY created_at DESC` để dùng `ix_diagnoses_created` (lượt mới tạo nhất thường cũng hoàn tất muộn nhất). Không thêm chỉ mục (database-rules mục 1).

## 5. Migration và seed

- Không có migration mới. Không có seed mới: số liệu lấy từ lượt chẩn đoán thật trong CSDL dev. Test e2e tự chèn lượt bằng SQL với thời điểm chủ động.

## 6. Quyết định áp dụng

| Mã | Ảnh hưởng |
|---|---|
| TD-08 (chốt 20/11) | Mô-đun `dashboard` riêng, SQL chỉ đọc qua `DataSource` |
| OQ-23 (chốt 20/11) | Chỉ đếm `COMPLETED` |
| OQ-05 (đổi 22/11) | Loại cây lấy thẳng từ `diagnoses.crop_id` (Q5, Q9) |
| OQ-14, OQ-25, OQ-11 | Không có "Tỷ lệ đánh giá đúng", "Tổng số người dùng", xuất báo cáo |
| OQ-61 → OQ-64, TD-35 (chờ duyệt) | Khoảng thời gian, tài khoản được đếm, cách tính, danh sách chi tiết |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 25/11/2026 | 0.1 | Sinh từ specs dashboard v0.3 (build-first) | Claude |

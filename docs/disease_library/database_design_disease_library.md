# Database design — Xem bệnh cây hay gặp (`disease_library`)

> **Trạng thái:** REVIEWED (build-first 22/11, review lại ở giai đoạn test) · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.
> Entity đã có, khớp migration `InitSchema1795219200000`: `catalog/entities/{crop,disease,disease-image,model-label}.entity.ts`, `diagnosis/entities/{diagnosis,diagnosis-prediction}.entity.ts`.

## 1. Bảng sử dụng

| Bảng | Thao tác | Cột dùng | Ghi chú |
|---|---|---|---|
| `crops` | R | `id`, `code`, `name`, `status` | L1; điều kiện "loại cây đang hiển thị" của L2, L3 |
| `diseases` | R | Mọi cột trừ `recheck_days` | L2, L3. Chỉ `status = 'PUBLISHED'` (BR-01) |
| `disease_images` | R | `disease_id`, `image_url`, `caption`, `sort_order`, `id` | Ảnh bìa (L2), mọi ảnh (L3) (BR-08) |
| `model_labels` | R | `id`, `disease_id` | Đổi nhãn hạng 1 ra bệnh để đếm "Đang phổ biến" (BR-04) |
| `diagnoses` | R | `id`, `status`, `result_type`, `created_at` | Đếm lượt trong 30 ngày (BR-04). Gồm cả lượt đã xoá mềm |
| `diagnosis_predictions` | R | `diagnosis_id`, `label_id`, `probability`, `rank_no` | Chỉ hạng 1 (BR-04) |
| `diseases` | U | `summary`, `symptoms`, `causes`, `prevention`, `treatment`, `status`, `published_at`, `is_featured` | **Chỉ trong `npm run seed:dev`** (OQ-36), không có API ghi |

API của feature không ghi bảng nào.

## 2. Truy vấn chính

| # | Mục đích | Truy vấn | Chỉ mục |
|---|---|---|---|
| Q1 | L1: loại cây đang hiển thị (BR-05) | `SELECT id, code, name FROM crops WHERE status = 'ACTIVE' ORDER BY id` | `pk_crops` (bảng 5 dòng) |
| Q2 | BR-04: id các bệnh "Đang phổ biến" | Xem khối SQL dưới bảng | `ix_diagnoses_created`, `ix_predictions_label` |
| Q3 | L2: một trang thẻ tin (BR-01, 03, 05, 08) | Xem khối SQL dưới bảng | `ix_diseases_crop_status` |
| Q4 | L2: tổng số cho phân trang | `COUNT(*)` với cùng `FROM … WHERE` của Q3 | `ix_diseases_crop_status` |
| Q5 | L3: một bệnh hiển thị được (BR-01, 06) | `diseases d JOIN crops c` theo `d.id = :id AND d.status = 'PUBLISHED' AND c.status = 'ACTIVE'` | `pk_diseases` |
| Q6 | L3: ảnh minh hoạ (BR-06, 08) | `SELECT image_url, caption FROM disease_images WHERE disease_id = :id ORDER BY sort_order, id` | FK `disease_id` |
| Q7 | L3: bệnh liên quan (BR-07) | Như Q3 nhưng `WHERE d.id <> :id AND (d.crop_id = :cropId OR d.pathogen_group = :group)`, `ORDER BY (d.crop_id = :cropId) DESC, d.published_at DESC, d.id DESC LIMIT 4` | `ix_diseases_crop_status` |

**Q2: "Đang phổ biến"** (chạy trước Q3 và Q7; tham số lấy từ cấu hình):

```sql
SELECT ml.disease_id
FROM diagnoses dg
JOIN diagnosis_predictions p ON p.diagnosis_id = dg.id AND p.rank_no = 1
JOIN model_labels ml          ON ml.id = p.label_id
JOIN diseases ds              ON ds.id = ml.disease_id AND ds.status = 'PUBLISHED'
JOIN crops c                  ON c.id = ds.crop_id AND c.status = 'ACTIVE'
WHERE dg.status = 'COMPLETED'
  AND dg.result_type = 'DISEASE'
  AND dg.created_at >= :now - make_interval(days => :days)
  AND dg.created_at <= :now
  AND p.probability >= :threshold          -- bỏ dòng này khi ngưỡng để trống
GROUP BY ml.disease_id
ORDER BY COUNT(*) DESC, ml.disease_id
LIMIT :limit;
```

- Không lọc `deleted_at`: lượt đã xoá mềm vẫn tính trong thống kê (specs `history` BR-09).
- Bảng `diagnoses` có thể lớn dần, nhưng điều kiện `created_at` dùng được `ix_diagnoses_created`. Truy vấn chỉ trả tối đa `:limit` id.

**Q3: một trang thẻ tin** (`:trending` là mảng id từ Q2, có thể rỗng):

```sql
SELECT d.id, d.name, d.severity, d.summary, d.published_at,
       c.id AS crop_id, c.code AS crop_code, c.name AS crop_name,
       cover.image_url AS cover_image_url,
       (d.id = ANY(:trending)) AS trending
FROM diseases d
JOIN crops c ON c.id = d.crop_id AND c.status = 'ACTIVE'
LEFT JOIN LATERAL (
  SELECT image_url FROM disease_images i
  WHERE i.disease_id = d.id ORDER BY i.sort_order, i.id LIMIT 1
) cover ON true
WHERE d.status = 'PUBLISHED'
  AND (:cropId IS NULL OR d.crop_id = :cropId)
  AND (:q IS NULL OR d.name ILIKE '%' || :q || '%' ESCAPE '\')
ORDER BY d.is_featured DESC, (d.id = ANY(:trending)) DESC,
         d.published_at DESC NULLS LAST, d.id DESC
LIMIT :pageSize OFFSET (:page - 1) * :pageSize;
```

Viết bằng QueryBuilder của TypeORM, tham số đặt tên, không ghép chuỗi. `:q` đã thoát `%`, `_`, `\`.

**Khác với bản thiết kế khi code (22/11):**
- Q2 viết bằng SQL thô có tham số (`DataSource.query`) trong `catalog/library/disease-trends.query.ts`, đúng TD-24.
- Q3 lấy bằng `getRawMany` với `offset`/`limit` để TypeORM không bọc thêm truy vấn con phân trang.
- Ảnh bìa không dùng `LATERAL`. Code lấy mọi ảnh của các bệnh trong trang (sắp theo `disease_id, sort_order, id`) rồi chọn ảnh đầu của mỗi bệnh. Kết quả như nhau, và mỗi bệnh chỉ có vài ảnh.
- Q2 thêm cận trên `created_at <= :now` để lượt có thời điểm tương lai (dữ liệu sai) không được đếm.

## 3. Giao dịch

Không có thao tác ghi qua API nên không cần giao dịch. Seed dev cập nhật từng bệnh mẫu bằng một câu `UPDATE` riêng.

## 4. Migration và seed

- **Không có migration mới.** Dùng đúng cột và chỉ mục đã có.
- **Seed dev (`npm run seed:dev`, OQ-36):** bổ sung nội dung cho 6 bệnh mẫu trong `dev-sample-seed.ts`:
  - Điền `summary`, `symptoms`, `causes`, `prevention`, `treatment`.
  - Chuyển `status = 'PUBLISHED'`, đặt `published_at = now()`.
  - Đánh dấu một bệnh `is_featured = true` để thấy được thứ tự BR-03.
  - Nội dung ghi rõ là dữ liệu mẫu.
- **Không ghi đè dữ liệu đã sửa:** seed chỉ cập nhật bệnh mẫu còn `summary IS NULL`. Bệnh đã có nội dung (nhập tay hoặc seed lần trước) giữ nguyên. Chạy lại nhiều lần không đổi gì (database-rules mục 6).
- Không có ảnh minh hoạ mẫu (N2). `recheck_days` để `NULL`, điền khi làm `diagnosis` hoặc `my_plants`.
- Nội dung mẫu nằm ở `backend/src/database/seeds/dev-sample-content.ts`, tách khỏi danh sách bệnh chép từ SQL 04 để thấy rõ phần do Claude soạn. Bệnh nổi bật: "Bệnh mốc sương" (Cà chua). Đã chạy trên CSDL dev ngày 22/11: lần 1 tạo 6 bệnh, 11 nhãn, điền nội dung và công khai 6 bệnh; lần 2 không đổi gì.

## 5. Quyết định đã áp và điểm chờ duyệt

| Mã | Ảnh hưởng tới CSDL |
|---|---|
| DC-03, DC-04 (chốt 20/11) | Dùng `summary` cho thẻ tin; không có `source_refs` |
| OQ-28 (chốt 20/11) | Q2 lấy top N trong 30 ngày, N và số ngày trong cấu hình |
| OQ-36 (chốt 22/11) | Seed dev có nội dung mẫu, `PUBLISHED` |
| TD-24 (chốt 22/11) | Q2 đọc bảng của mô-đun `diagnosis` từ mô-đun `catalog`, chỉ đọc qua `DataSource` |
| OQ-37 (chốt 22/11) | Q2 `LIMIT 3`, Q3 cỡ trang 20 (tối đa 50), Q7 `LIMIT 4` |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 22/11/2026 | 0.1 | Sinh từ specs v0.2 (build-first, như `auth`) | Claude |
| 22/11/2026 | 0.2 | Dương duyệt. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 22/11/2026 | 0.3 | Code xong: ghi các chỗ khác thiết kế (Q2, Q3, ảnh bìa) và kết quả chạy seed dev | Claude |

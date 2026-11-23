# Database design — Xem lịch sử tra cứu (`history`)

> **Trạng thái:** REVIEWED (build-first 23/11, review lại ở giai đoạn test) · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.
> **Code:** DONE (build-first, 23/11), `diagnosis/history/history.service.ts`.
> Không thêm bảng, cột hay migration. Entity dùng lại: `diagnosis/entities/diagnosis.entity.ts` (đã có cột `deleted_at` với `@DeleteDateColumn`, quan hệ `plant`, `crop`), `diagnosis-prediction.entity.ts`.

## 1. Bảng sử dụng

| Bảng | Thao tác | Cột dùng | Ghi chú |
|---|---|---|---|
| `diagnoses` | R | `id`, `user_id`, `crop_id`, `plant_id`, `processed_image_url`, `status`, `result_type`, `created_at`, `deleted_at` | H1: lượt của chính mình, `COMPLETED`, chưa xoá mềm (BR-01) |
| `diagnoses` | U | `deleted_at` | H2 đặt `now()`, H3 đặt `NULL` (BR-09). Không đổi cột nào khác |
| `diagnosis_predictions` | R | `diagnosis_id`, `label_id`, `probability`, `rank_no` | Chỉ `rank_no = 1` ở H1 (BR-05) |
| `model_labels` | R | `id`, `disease_id` | Từ nhãn hạng 1 sang bệnh |
| `diseases` | R | `id`, `name`, `severity` | Tên bệnh, mức độ nguy hại ở danh sách (Bảng 4.6). Bệnh bị ẩn vẫn đọc được, như `diagnosis` D2 |
| `crops` | R | `id`, `code`, `name` | Loại cây của lượt (luôn có, OQ-05) |
| `plants` | R | `id`, `name` | "Tên cây" (Bảng 4.6). `LEFT JOIN`, luôn trống ở lần build này |

Các bảng của mô-đun khác chỉ được **đọc** qua quan hệ entity trong truy vấn của mô-đun `diagnosis`, như truy vấn Q5 của `diagnosis`. Không inject repository của mô-đun khác, không ghi bảng nào ngoài `diagnoses` (be-coding-rules mục 2).

## 2. Truy vấn chính

| # | Mục đích | Truy vấn | Chỉ mục |
|---|---|---|---|
| Q1 | H1: danh sách | `diagnoses d JOIN crops c ON c.id = d.crop_id LEFT JOIN plants pl ON pl.id = d.plant_id JOIN diagnosis_predictions p ON p.diagnosis_id = d.id AND p.rank_no = 1 JOIN model_labels ml ON ml.id = p.label_id LEFT JOIN diseases ds ON ds.id = ml.disease_id WHERE d.user_id = :me AND d.status = 'COMPLETED' AND d.deleted_at IS NULL` + bộ lọc, `ORDER BY d.created_at DESC, d.id DESC`, `OFFSET/LIMIT` | `ix_diagnoses_user_created` (`user_id, created_at DESC WHERE deleted_at IS NULL`) |
| Q1a | Bộ lọc của Q1 (BR-03) | `cropId`: `d.crop_id = :cropId`. `resultType`: `d.result_type = :type`. `from`: `d.created_at >= :from`. `to`: `d.created_at < :to`. `q`: `d.result_type = 'DISEASE' AND ds.name ILIKE :pattern ESCAPE '\'` (OQ-43; thoát `%`, `_`, `\` như `escapeLike` của thư viện) | Như Q1 |
| Q2 | H1: tổng số | Cùng điều kiện Q1, `COUNT(*)` | Như Q1 |
| Q3 | D2: tên cây | Thêm quan hệ `plant` vào truy vấn Q5 của `diagnosis` (`relations: { crop: true, plant: true }`) | `pk_plants` |
| Q4 | H2: xoá mềm (BR-08, BR-09) | Một giao dịch: `UPDATE diagnoses SET deleted_at = now() WHERE id = ANY(:ids) AND user_id = :me AND status = 'COMPLETED' AND deleted_at IS NULL`. Số dòng đổi khác số id (sau khi gộp trùng) thì huỷ giao dịch, trả 404 | `pk_diagnoses` |
| Q5 | H3: hoàn tác | Một giao dịch: (a) `SELECT COUNT(*) FROM diagnoses WHERE id = ANY(:ids) AND user_id = :me AND status = 'COMPLETED'` phải bằng số id, không thì 404; (b) `UPDATE diagnoses SET deleted_at = NULL WHERE id = ANY(:ids) AND user_id = :me AND deleted_at IS NOT NULL` | `pk_diagnoses` |

- Phân trang dùng `getRawMany` với `offset`/`limit`, tránh câu con phân trang của TypeORM khi có join (cách đã dùng ở `disease_library`).
- `ix_diagnoses_user_created` là chỉ mục một phần `WHERE deleted_at IS NULL`, khớp đúng điều kiện của Q1. Q5 đọc cả lượt đã xoá nên đi theo khoá chính.
- Ghi chú về `@DeleteDateColumn`: `find` của TypeORM tự loại lượt đã xoá. Q5 phải gọi `withDeleted` hoặc dùng QueryBuilder `UPDATE` trực tiếp để thấy lượt đã xoá.

## 3. Giao dịch

| Thao tác | Trong giao dịch | Khi lỗi giữa chừng |
|---|---|---|
| H2 xoá nhiều mục | Q4 | Huỷ toàn bộ, không mục nào bị xoá (tất cả hoặc không, TD-27) |
| H3 hoàn tác | Q5a + Q5b | Huỷ toàn bộ |

Không đụng `plants.health_status`, `plant_logs` hay `reminders` (OQ-24). Dòng thời gian của cây tự bỏ lượt đã xoá vì chỉ gộp lượt "còn hiệu lực" (`specs_my_plants.md` mục 4).

## 4. Migration và seed

- Không có migration mới. Không đổi seed.

## 5. Quyết định đã áp

| Mã | Ảnh hưởng tới CSDL |
|---|---|
| OQ-23 (chốt 20/11) | Chỉ lượt `COMPLETED` (Q1, Q4, Q5) |
| OQ-24 (chốt 20/11) | Xoá, hoàn tác không đổi tình trạng cây |
| OQ-05 (chốt 22/11) | Lọc loại cây bằng `diagnoses.crop_id` |
| OQ-43 (chốt 23/11) | `q` chỉ khớp lượt `DISEASE` |
| TD-27 (chốt 23/11) | Q4, Q5: tất cả hoặc không, không giới hạn thời gian hoàn tác |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 23/11/2026 | 0.1 | Sinh từ specs v0.3 (build-first) | Claude |
| 23/11/2026 | 0.2 | Dương duyệt. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 23/11/2026 | 0.3 | Code xong, truy vấn đúng như mục 2 | Claude |

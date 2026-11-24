# Database design — Quản lý danh mục cây trồng & bệnh (`catalog`)

> **Trạng thái:** REVIEWED (build-first 25/11, review lại ở giai đoạn test) · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.
> Không thêm bảng, cột hay migration. Entity đã có từ migration đầu tiên: `catalog/entities/crop.entity.ts`, `disease.entity.ts`, `disease-image.entity.ts`, `model-label.entity.ts`, gồm đủ chỉ mục duy nhất và khoá ngoại kép mà feature này dựa vào.
> Mã endpoint (C1 → C5, B1 → B7, M1, M2) theo `api_catalog.md`.
> **Code:** DONE (25/11). Q1 ở `catalog/admin/admin-crops.service.ts`; Q2, Q3, Q5, Q7 ở `admin-diseases.service.ts`; Q4 ở `label-assignment.ts`; Q6 ở C5; Q8 là `LibraryService.relatedFor`; Q9, Q10 ở `ModelLabelService` (`modelMapping`, `deactivateMissing`).

## 1. Bảng sử dụng

| Bảng | Thao tác | Cột dùng | Ghi chú |
|---|---|---|---|
| `crops` | C, R, U | mọi cột | Không xoá (C4 3d, ERD-doc 7.3: CRU) |
| `diseases` | C, R, U, D | mọi cột | Xoá chỉ khi chưa có dữ liệu chẩn đoán (BR-09) |
| `disease_images` | C, R, U, D | mọi cột | Đồng bộ theo `imageLayout` ở B3, B4; xoá theo bệnh (CASCADE, R8) |
| `model_labels` | C, R, U, D | mọi cột | Gán mã lớp (OQ-55 ✎); D chỉ khi xoá bệnh (B6) |
| `diagnosis_predictions` | — | — | **Không đọc.** Khoá ngoại RESTRICT `label_id` chặn xoá nhãn đã dùng; B6 dựa vào lỗi khoá ngoại này |

Các ràng buộc có sẵn bảo đảm phần lớn quy tắc. Service chỉ kiểm tra trước để trả đúng câu thông báo:

| Ràng buộc (data_model) | Bảo đảm |
|---|---|
| `uq_crops_code`, `uq_crops_name` | Không trùng mã, tên loại cây (so đúng chữ; service so thêm không phân biệt hoa thường ✎) |
| `uq_diseases_crop_name` | BR-05 (như trên) |
| `uq_model_labels_class_code` | `class_code` duy nhất (BR-16) |
| `ux_model_labels_disease_id_active` | Mỗi bệnh tối đa một nhãn đang dùng (BR-17) |
| `ux_model_labels_healthy_per_crop` | Mỗi loại cây tối đa một nhãn khoẻ mạnh đang dùng (BR-17) |
| `ck_model_labels_disease_matches_type` | Nhãn `DISEASE` có bệnh, nhãn `HEALTHY` không có (BR-16) |
| `fk_model_labels_disease_crop` (kép) | Nhãn bệnh cùng loại cây với bệnh (BR-16); kéo theo việc khoá đổi loại cây của bệnh đã có nhãn (OQ-55 ✎) |
| `fk_diagnosis_predictions_label` RESTRICT | Nhãn đã có dự đoán không xoá được (BR-19), nên bệnh đã có dữ liệu chẩn đoán không xoá được (BR-09) |

## 2. Truy vấn chính

| # | Mục đích | Truy vấn | Chỉ mục |
|---|---|---|---|
| Q1 | C1 danh sách loại cây | `crops c` + `LEFT JOIN (SELECT crop_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS published FROM diseases GROUP BY crop_id) d` + `LEFT JOIN model_labels l ON l.crop_id = c.id AND l.label_type = 'HEALTHY' AND l.is_active` `ORDER BY c.id` | `ux_model_labels_healthy_per_crop` |
| Q2 | B1 danh sách bệnh | `diseases d JOIN crops c` + `LEFT JOIN model_labels l ON l.disease_id = d.id AND l.is_active` `WHERE` (`d.name ILIKE :q ESCAPE '\'`) (`d.crop_id = :cropId`) (`d.status = :status`) `ORDER BY d.updated_at DESC, d.id DESC OFFSET/LIMIT`, kèm `COUNT(*)` | `ix_diseases_crop_status`, `ux_model_labels_disease_id_active` |
| Q3 | B2 một bệnh | `diseases` theo `id` + `crops`; ảnh `disease_images WHERE disease_id = :id ORDER BY sort_order, id`; nhãn đang gán; `cropLocked` = `EXISTS (model_labels WHERE disease_id = :id)` | `pk_diseases`, `fk_disease_images_disease` |
| Q4 | Gán mã lớp `X` (B3, B4, C3, C4; OQ-55 ✎) | Trong giao dịch của endpoint: `SELECT … FROM model_labels WHERE class_code = :x FOR UPDATE`; xử lý theo bảng "Gán mã lớp" của `api_catalog.md`; nhãn cũ: `UPDATE model_labels SET is_active = false WHERE id = :old`. **Tắt nhãn cũ trước** rồi mới tạo hoặc bật nhãn mới, để không vướng hai chỉ mục duy nhất | `uq_model_labels_class_code` |
| Q5 | B4 đồng bộ ảnh | `DELETE FROM disease_images WHERE disease_id = :id AND id <> ALL(:keptIds)`; `UPDATE … SET caption, sort_order` cho ảnh giữ lại; `INSERT` ảnh mới. `sort_order` = vị trí trong `imageLayout` (0, 1, 2…) | `fk_disease_images_disease` |
| Q6 | C5 ẩn loại cây (BR-12) | Một giao dịch: `UPDATE crops SET status = 'HIDDEN'`; `UPDATE diseases SET status = 'HIDDEN', updated_at = now() WHERE crop_id = :id AND status = 'PUBLISHED'`, trả số dòng | `ix_diseases_crop_status` |
| Q7 | B6 xoá bệnh (BR-09, 10) | Đọc `disease_images.image_url`; một giao dịch: `DELETE FROM model_labels WHERE disease_id = :id`; `DELETE FROM diseases WHERE id = :id`. Lỗi khoá ngoại RESTRICT (`23001`) từ `diagnosis_predictions` thì huỷ giao dịch, trả 409 | `pk_diseases` |
| Q8 | B7 bệnh liên quan | Như truy vấn `related` của `disease_library` L3 (`LibraryService`), thay bệnh gốc bằng `cropId`, `pathogenGroup`, `excludeId` | `ix_diseases_crop_status` |
| Q9 | M1 đối chiếu | `model_labels l JOIN crops c LEFT JOIN diseases d` `WHERE l.class_code = ANY(:modelCodes) OR l.is_active`. Ghép với danh sách của AI ở service: mã có nhãn đang gán → `assigned`; nhãn đang gán không có trong danh sách → `stale` | `uq_model_labels_class_code` |
| Q10 | M2 ngừng dùng (BR-19) | `UPDATE model_labels SET is_active = false WHERE is_active AND class_code <> ALL(:modelCodes)`, trả số dòng | — |

- Q9, Q10 chạy từ mô-đun `diagnosis` nhưng đi qua hàm mới của `ModelLabelService` (catalog export), không inject repository của `catalog` (TD-31 ✎ phương án A). Không cần thêm ngoại lệ ranh giới mô-đun.
- B6 không đọc `diagnosis_predictions`: dựa vào khoá ngoại RESTRICT. Vì vậy cũng không cần ngoại lệ ranh giới mô-đun mới.

## 3. Giao dịch

| Thao tác | Trong giao dịch | Ghi chú |
|---|---|---|
| C3, C4 | Ghi `crops` + Q4 (nhãn `HEALTHY`) | Ảnh lưu trước giao dịch; giao dịch lỗi thì xoá ảnh vừa lưu; ảnh cũ bị thay thì xoá sau khi xong |
| C5 ẩn | Q6 | BR-12 |
| B3, B4 | Ghi `diseases` + Q5 + Q4 (nhãn `DISEASE`) | BR-10 (ERD-doc 4.3). Kiểm tra trùng tên, khoá loại cây, quy tắc nhãn **trong** giao dịch, sau khi khoá dòng bệnh (`FOR UPDATE`, B4) |
| B5 | Một câu `UPDATE` có điều kiện trạng thái nguồn | Đặt `published_at` khi đang `NULL` |
| B6 | Q7 | Xoá tệp ảnh sau khi xong; lỗi xoá tệp chỉ ghi log |
| M2 | Q10 | |

## 4. Migration và seed

- **Không có migration mới.**
- Seed không đổi. 5 loại cây (`base-seed.ts`, BR-14) và dữ liệu mẫu (`seed:dev`) vẫn nạp như cũ. Khi có dữ liệu thật, nhóm nhập qua các màn này hoặc Claude chuyển thành seed thật (`real_data_needed.md` mục 5).
- Seed dev hiện gán 11 nhãn mẫu cho 5 loại cây và 6 bệnh, đủ để thử màn "Nhãn mô hình". AI giả trả thêm 3 mã chưa gán (TD-31 ✎).

## 5. Ảnh hưởng tới feature khác

| Feature | Ảnh hưởng |
|---|---|
| `disease_library` | Không đổi API. Bệnh bị ẩn, bệnh của loại cây bị ẩn tự biến khỏi L2, L3 (BR-01 đã lọc). Bệnh mới công khai hiện ngay. Trang chi tiết bệnh ở giao diện được tách phần hiển thị để dùng lại cho "Xem trước" |
| `diagnosis` | Đổi mã lớp có tác dụng từ lượt chẩn đoán kế tiếp. Lịch sử luôn đọc ánh xạ **hiện tại** của nhãn. Mã không còn được gán → lượt chẩn đoán `FAILED` và báo ADMIN (BR-11, đã có) |
| `my_plants` | Chu kỳ tưới, bón và `recheck_days` sửa ở đây được dùng cho các gợi ý nhắc sau đó. Nhắc đã tạo không đổi |

## 6. Quyết định áp dụng

| Mã | Ảnh hưởng |
|---|---|
| DC-02 → DC-05 (chốt 20/11) | Form có `summary`, `recheck_days`, chu kỳ tưới/bón; không có nguồn tham khảo; `model_labels` theo `data_model.md` |
| OQ-15, OQ-17 (chốt 20/11) | Trường `recheck_days`, chu kỳ, "Mã lớp khoẻ mạnh" |
| OQ-41 (chốt 22/11) | `crops.care_guide` nhập qua form loại cây |
| OQ-53 → OQ-59, TD-31 (A) → TD-33 (chốt 25/11) | Trường bắt buộc, trạng thái, gán mã lớp (Q4), ẩn loại cây (Q6), xoá bệnh (Q7), xem trước (Q8), nhãn mô hình (Q9, Q10) |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 24/11/2026 | 0.1 | Sinh từ specs catalog v0.2 (build-first) | Claude |
| 25/11/2026 | 0.2 | Dương duyệt. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 25/11/2026 | 0.3 | Code xong. Q7: lỗi khoá ngoại RESTRICT là mã `23001` | Claude |

# API — Quản lý danh mục cây trồng & bệnh (`catalog`)

> **Trạng thái:** REVIEWED (build-first 25/11, review lại ở giai đoạn test) · Sinh từ `specs_catalog.md` v0.2, C4 Bảng 4.10 và đoạn sau bảng, ERD-doc 4.2 → 4.5, 6.5, 7.2 · Định dạng response và lỗi theo TD-05 (đã chốt)
> Câu có trong specs hoặc C4 được chép nguyên văn. Câu và giá trị **Claude soạn** (nguồn không có) đánh dấu ✎, Dương đã duyệt ngày 25/11 (OQ-53 → OQ-60). Điểm kỹ thuật: TD-31 (phương án A) → TD-33, chốt 25/11.
> **[AI]** Phần nhãn mô hình (M1, M2, quy tắc gán mã lớp) cần nhóm AI xem cùng TD-19 (dạng JSON của `GET /labels`).
> Dữ liệu thật (danh sách nhãn, nội dung bệnh, chu kỳ…) sẽ được nhập qua các màn này: `docs/_shared/real_data_needed.md`.
> **Code:** DONE (build-first 25/11). Backend `backend/src/modules/catalog/admin/` (C, B), `diagnosis/labels/` (M), test `test/catalog.e2e-spec.ts`; frontend `components/catalog/`, trang `/admin/catalog/*`.

## Phạm vi

| Phần | Gồm | US / BR |
|---|---|---|
| Bệnh | Danh sách có tìm kiếm và lọc; thêm, sửa (kèm ảnh minh hoạ và mã lớp); xem trước; ẩn, hiện; xoá bệnh chưa có dữ liệu chẩn đoán | US-01 → 05, 07 · BR-01 → 10, 15 → 17 |
| Loại cây | Danh sách; thêm, sửa (kèm mã lớp khoẻ mạnh); ẩn, hiện | US-06, 07 · BR-11 → 14, 15 → 17 |
| Nhãn mô hình | Đối chiếu danh sách nhãn của mô hình đang dùng với danh mục; ngừng dùng nhãn không còn trong mô hình | US-07 · BR-15, 18, 19 |

Không làm: ADM-07 quản lý phiên bản mô hình (Could, specs ghi chú). Không có xoá loại cây (C4 3d chỉ có thêm, sửa, ẩn; ERD-doc 7.3 ghi Crop là CRU).

Tiền tố chung: `/api/v1`. Mô-đun backend:
- `catalog` (`backend/src/modules/catalog/`, thư mục mới `admin/`): mọi endpoint loại cây và bệnh (C, B). Đã có entity của 4 bảng.
- `diagnosis` (thư mục mới `labels/`): M1, M2, vì phải gọi AI service qua `AiClient` mà chỉ `diagnosis` được giữ (be-coding-rules mục 7), và `catalog` không import ngược `diagnosis` được (TD-31 ✎).

## Tổng quan

| # | Method | Path | Mô tả | Phục vụ |
|---|---|---|---|---|
| C1 | GET | `/admin/crops` | Danh sách mọi loại cây (cả đang ẩn) | US-06 · BR-11 |
| C2 | GET | `/admin/crops/:id` | Một loại cây, đủ trường cho form | US-06 · BR-11 |
| C3 | POST | `/admin/crops` | Thêm loại cây (multipart, ảnh tuỳ chọn) | US-06, 07 · BR-11, 16 → 18 |
| C4 | PUT | `/admin/crops/:id` | Sửa loại cây (multipart) | US-06, 07 · BR-11, 16 → 18 |
| C5 | POST | `/admin/crops/:id/status` | Ẩn hoặc hiện loại cây; ẩn thì ẩn kèm bệnh đang công khai | US-06 · BR-12 |
| B1 | GET | `/admin/diseases` | Danh sách bệnh: tìm theo tên, lọc loại cây, trạng thái, phân trang | US-01 · BR-01 |
| B2 | GET | `/admin/diseases/:id` | Một bệnh, đủ trường cho form và xem trước | US-03, 04 · BR-02, 07 |
| B3 | POST | `/admin/diseases` | Thêm bệnh (multipart, kèm ảnh, mã lớp) | US-02, 07 · BR-02 → 06, 10, 16, 17 |
| B4 | PUT | `/admin/diseases/:id` | Sửa bệnh (multipart) | US-03, 07 · BR-02 → 06, 10, 16, 17 |
| B5 | POST | `/admin/diseases/:id/status` | Chuyển giữa "Công khai" và "Ẩn" | US-05 · BR-06, 08 |
| B6 | DELETE | `/admin/diseases/:id` | Xoá bệnh chưa có dữ liệu chẩn đoán ✎ | BR-09, 10 · OQ-57 |
| B7 | GET | `/admin/diseases/related` | Bệnh liên quan cho trang xem trước ✎ | US-04 · BR-07 · OQ-58 |
| M1 | GET | `/admin/labels/model` | Danh sách mã lớp của mô hình đang dùng kèm tình trạng gán | US-07 · BR-15, 18 |
| M2 | POST | `/admin/labels/sync` | Ngừng dùng nhãn không còn trong mô hình | US-07 · BR-19 |

- Mọi route gắn `@Roles('ADMIN')` (specs mục 6: mọi route ghi chỉ cho ADMIN; route đọc ở đây chỉ phục vụ màn quản trị). USER gọi thì `403 FORBIDDEN` "Bạn không có quyền thực hiện thao tác này" (OQ-29).
- Tiền tố `/admin/` tách khỏi `/crops`, `/diseases` của thư viện bệnh (L1 → L3), vì hai bên khác quyền và khác điều kiện lọc (TD-33 ✎).
- B7 khai báo **trước** B2 trong controller để `related` không bị hiểu là `:id`.

## Quy ước chung

**Trạng thái bệnh (data_model mục 1):** `DRAFT` "Nháp" · `PUBLISHED` "Công khai" · `HIDDEN` "Ẩn". Chuyển trạng thái theo OQ-54 ✎:

| Từ → sang | Ở đâu | Điều kiện |
|---|---|---|
| (mới) → `DRAFT` hoặc `PUBLISHED` | B3, trường `status` | `PUBLISHED` cần đủ nội dung (BR-06) |
| `DRAFT` → `PUBLISHED` | B4, trường `status` | Cần đủ nội dung (BR-06) |
| `PUBLISHED` ↔ `HIDDEN` | B5 (nút "Ẩn" / "Hiện", C4 3c) | Sang `PUBLISHED` cần đủ nội dung (BR-06) |
| `PUBLISHED`/`HIDDEN` → `DRAFT` | Không có | Đã công khai thì dùng "Ẩn" |

- "Đủ nội dung" (BR-06) = `summary`, `symptoms`, `treatment` khác rỗng. Bệnh đang `PUBLISHED` khi sửa (B4) cũng phải giữ đủ ba trường này.
- Lần đầu sang `PUBLISHED`: đặt `published_at = now()` nếu đang `NULL` (BR-06). Ẩn rồi hiện lại không đổi `published_at`.
- Bệnh của loại cây đang ẩn vẫn đổi trạng thái được, nhưng chỉ hiện ở thư viện khi loại cây hiện lại (điều kiện hiển thị của `disease_library` BR-01).

**Trạng thái loại cây:** `ACTIVE` "Hiển thị" · `HIDDEN` "Ẩn" (ERD-doc 4.2). Loại cây ẩn: người dùng không chọn được khi chẩn đoán (`diagnosis` Q1) hoặc thêm cây (`my_plants` P2), bệnh của nó không hiện ở thư viện. Cây và lượt chẩn đoán đã có không đổi.

**Gán mã lớp mô hình (BR-15 → BR-19; OQ-55 ✎).** Dùng chung cho trường `classCode` của bệnh (nhãn `DISEASE`) và `healthyClassCode` của loại cây (nhãn `HEALTHY`):

- **"Đang gán"** = có dòng `model_labels` với `class_code` đó và `is_active = true`. Mỗi bệnh tối đa một nhãn đang gán, mỗi loại cây tối đa một nhãn khoẻ mạnh đang gán (BR-17, hai chỉ mục duy nhất có sẵn).
- Chọn mã `X` cho bệnh `D` (hoặc làm mã khoẻ mạnh của loại cây `C`):

  | Tình trạng của `X` trong CSDL | Xử lý | Lỗi |
  |---|---|---|
  | Chưa có dòng nào | Tạo nhãn mới: loại theo form, `crop_id` = loại cây của bệnh / loại cây đang sửa, `is_active = true` (BR-18) | |
  | Đang gán cho chính `D` (hoặc `C`) | Không đổi | |
  | Đang gán cho bệnh khác | Không lưu gì | 409 `LABEL_ASSIGNED` "Mã lớp này đã được gán cho bệnh [tên bệnh]" (C4 6.2) |
  | Đang gán làm mã khoẻ mạnh của một loại cây | Không lưu gì | 409 `LABEL_ASSIGNED` ✎ "Mã lớp này đã được gán cho nhãn khoẻ mạnh của [tên loại cây]" |
  | Có dòng nhưng không đang gán (`is_active = false`), **cùng loại cây** | Gán lại: cập nhật `label_type`, `disease_id`, bật `is_active` | |
  | Có dòng không đang gán, **khác loại cây** | Không lưu gì | 409 `LABEL_OTHER_CROP` ✎ "Mã lớp này thuộc loại cây [tên loại cây]" |

- Mã cũ `P` của `D` (hoặc `C`) bị thay hoặc bỏ trống: đặt `P.is_active = false`, **giữ** `disease_id` để lịch sử chẩn đoán vẫn đọc được (BR-19). Không xoá nhãn khi đổi mã.
- Hệ quả cần biết: mã `P` nếu vẫn còn trong mô hình sẽ thành "Chưa gán" ở M1, và lượt chẩn đoán ra `P` sẽ `FAILED`, báo ADMIN (`diagnosis` BR-11) cho tới khi `P` được gán lại. Gán lại `P` cho bệnh khác thì các lượt cũ có `P` hiển thị bệnh mới: đây chính là "chỉ cần cập nhật ánh xạ" của C4.
- Cùng một giao dịch với việc lưu bệnh hoặc loại cây (BR-10; be-coding-rules mục 6).
- Backend **không** kiểm tra `X` có trong mô hình đang dùng hay không (phải gọi AI, TD-31 ✎). Giao diện chỉ cho chọn từ M1. Cũng chưa kiểm tra được `X` có đúng loại cây không, vì `GET /labels` chưa có thông tin loại cây (TD-19, chờ nhóm AI).
- **Đổi loại cây của bệnh** chỉ được khi bệnh chưa có dòng nhãn nào (kể cả nhãn đã tắt), vì khoá ngoại kép `(disease_id, crop_id)` của `model_labels` buộc nhãn và bệnh cùng loại cây. Có rồi thì 409 `DISEASE_CROP_LOCKED` ✎ "Không thể đổi loại cây của bệnh đã gán mã lớp". Giao diện khoá chọn loại cây khi `cropLocked = true`.

**Ảnh (TD-01, TD-14):** cột ảnh lưu khoá đối tượng; API trả URL qua `StorageService.resolveUrl`. JPG/PNG ≤ 10 MB, sai thì 400 "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB". Thư mục `diseases` cho ảnh minh hoạ, `crops` cho ảnh loại cây (đã có trong `STORAGE_FOLDERS`). Lưu ảnh trước rồi ghi CSDL; ghi lỗi thì xoá ảnh vừa lưu; ảnh bị gỡ hoặc bị thay thì xoá trong kho **sau** khi giao dịch xong (như `my_plants`).

**Câu thông báo chung:** chưa đăng nhập → 401 "Vui lòng đăng nhập". Không phải ADMIN → 403. Sai tham số do giao diện tạo → 400 `VALIDATION_ERROR` "Dữ liệu không hợp lệ" kèm `errors[]` (OQ-29). Không thấy bản ghi → 404 `CROP_NOT_FOUND` / `DISEASE_NOT_FOUND` "Không tìm thấy dữ liệu".

**Thiếu trường bắt buộc (C4 6.1; OQ-53 ✎):** 400 `VALIDATION_ERROR`, `errors[]` có từng trường thiếu với câu "Vui lòng nhập đầy đủ thông tin bắt buộc". Giao diện đánh dấu các trường đó và hiện câu này một lần trên nút "Lưu".

---

## Đối tượng trả về

**`AdminCropItem`** (C1):

```json
{
  "id": 3,
  "code": "TOMATO",
  "name": "Cà chua",
  "imageUrl": null,
  "status": "ACTIVE",
  "diseaseCount": 2,
  "publishedDiseaseCount": 1,
  "healthyClassCode": "Tomato___healthy"
}
```

`diseaseCount` đếm bệnh mọi trạng thái ✎ (C4 2d "số bệnh"); `publishedDiseaseCount` để giao diện biết có cần hộp thoại xác nhận khi ẩn (BR-12). `healthyClassCode` là nhãn `HEALTHY` đang gán, hoặc `null`.

**`AdminCrop`** (C2 → C5): như `AdminCropItem`, thêm `description`, `careGuide`, `wateringIntervalDays`, `fertilizingIntervalDays`, `createdAt`, `updatedAt`.

**`AdminDiseaseItem`** (B1):

```json
{
  "id": 1,
  "name": "Bệnh mốc sương",
  "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua", "status": "ACTIVE" },
  "classCode": "Tomato___Late_blight",
  "status": "PUBLISHED",
  "isFeatured": true,
  "updatedAt": "2026-11-24T08:00:00.000Z"
}
```

BR-01: tên bệnh, loại cây, mã lớp, trạng thái, nổi bật, ngày cập nhật. `classCode` là nhãn đang gán, hoặc `null`.

**`AdminDisease`** (B2 → B5):

```json
{
  "id": 1,
  "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua", "status": "ACTIVE" },
  "name": "Bệnh mốc sương",
  "pathogen": "Phytophthora infestans",
  "pathogenGroup": "FUNGUS",
  "severity": "HIGH",
  "classCode": "Tomato___Late_blight",
  "cropLocked": true,
  "summary": "…", "symptoms": "…", "causes": "…", "prevention": "…", "treatment": "…",
  "recheckDays": 7,
  "isFeatured": true,
  "status": "PUBLISHED",
  "publishedAt": "2026-11-22T03:00:00.000Z",
  "images": [{ "id": 5, "url": "http://localhost:4000/uploads/diseases/…", "caption": null }],
  "createdAt": "…",
  "updatedAt": "…"
}
```

`images` sắp theo `sort_order`, `id`; ảnh đầu là ảnh bìa (ERD-doc 4.4). `cropLocked = true` khi bệnh đã có dòng nhãn (xem "Gán mã lớp").

---

## Loại cây

### C1. GET `/admin/crops`

- **Response 200:** `AdminCropItem[]`, sắp theo `id` tăng dần (thứ tự seed). Không phân trang (5 loại cây, C4 2d).

### C2. GET `/admin/crops/:id`

- **Response 200:** `AdminCrop`. **Lỗi:** 404 `CROP_NOT_FOUND`.

### C3. POST `/admin/crops`

- **Request** (`multipart/form-data`). Trường theo C4 3d, specs BR-11, ERD-doc 4.2:

  | Trường | Bắt buộc | Validation | Nguồn |
  |---|---|---|---|
  | `code` | Có ✎ | Cắt khoảng trắng; `^[A-Z][A-Z0-9_]{1,29}$` ✎; duy nhất | `crops.code` NOT NULL, là `crop_code` gửi cho mô hình (OQ-05). C4 và specs không có trường này: OQ-53 ✎ |
  | `name` | Có | Cắt khoảng trắng, 1–100 ký tự; không trùng (không phân biệt hoa thường ✎) | C4 3d; `uq_crops_name` |
  | `description` | Không | Tối đa 2000 ký tự ✎ | C4 3d |
  | `careGuide` | Không | Tối đa 5000 ký tự ✎ | ERD-doc 4.2 ("hướng dẫn chăm sóc"); OQ-41 (nội dung thật nhập qua `catalog`) |
  | `wateringIntervalDays`, `fertilizingIntervalDays` | Không | Số nguyên 1–365 ✎ | BR-11; DC-02, OQ-15 |
  | `healthyClassCode` | Không | Tối đa 100 ký tự; theo "Gán mã lớp" | BR-11; OQ-17 |
  | `image` | Không | JPG/PNG ≤ 10 MB | C4 3d |

- **Xử lý:** một giao dịch: tạo loại cây `ACTIVE` (ERD-doc 4.2), gán `healthyClassCode` nếu có.
- **Response 201:** `AdminCrop`. Giao diện báo ✎ "Thêm loại cây thành công".
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Thiếu `code` hoặc `name` | `errors` từng trường: "Vui lòng nhập đầy đủ thông tin bắt buộc" (C4 6.1) |
  | 400 | `VALIDATION_ERROR` | Sai định dạng, quá dài, số ngày ngoài khoảng | `errors` từng trường, câu ✎ ở `design/screens/catalog.md` |
  | 409 | `CROP_CODE_TAKEN` | Trùng mã | ✎ "Mã loại cây đã tồn tại", trường `code` |
  | 409 | `CROP_NAME_TAKEN` | Trùng tên | ✎ "Tên loại cây đã tồn tại", trường `name` |
  | 409 | `LABEL_ASSIGNED`, `LABEL_OTHER_CROP` | Xem "Gán mã lớp" | trường `healthyClassCode` |
  | 400 | `INVALID_IMAGE_TYPE` / `IMAGE_TOO_LARGE` | Ảnh sai | "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" |

### C4. PUT `/admin/crops/:id`

- **Request:** như C3, gửi đủ các trường của form; trường tuỳ chọn gửi rỗng để xoá giá trị. Có `image` mới thì thay ảnh cũ. `removeImage=true` ✎ để bỏ ảnh.
- **Đổi `code`:** được phép ✎ (khi nhóm AI đổi mã loại cây). Chỉ ảnh hưởng các lượt chẩn đoán sau.
- **Response 200:** `AdminCrop`. Giao diện báo "Cập nhật thành công" (C4 5a).
- **Lỗi:** như C3, thêm 404.

### C5. POST `/admin/crops/:id/status`

- **Body:** `{ "status": "HIDDEN" | "ACTIVE" }`.
- **Ẩn (BR-12, C4 3d1):** một giao dịch: `crops.status = 'HIDDEN'`; mọi bệnh `PUBLISHED` của loại cây chuyển `HIDDEN`. Bệnh `DRAFT` giữ nguyên. Hộp thoại xác nhận do giao diện hiện **trước** khi gọi, khi `publishedDiseaseCount > 0`.
- **Hiện:** `crops.status = 'ACTIVE'`. **Không** tự hiện lại các bệnh đã bị ẩn kèm, vì CSDL không lưu bệnh nào bị ẩn do loại cây (OQ-56 ✎). Quản trị viên hiện từng bệnh ở B5.
- Đã ở trạng thái đích thì không lỗi, không đổi gì.
- **Response 200:** `{ "crop": AdminCrop, "hiddenDiseases": 1 }`. Giao diện báo ✎ "Đã ẩn loại cây" / ✎ "Đã hiện loại cây".

---

## Bệnh

### B1. GET `/admin/diseases`

- **Query:**

  | Tham số | Validation | BR |
  |---|---|---|
  | `q` | Trim; rỗng thì bỏ qua; tối đa 100 ký tự. Tìm trong `name`, không phân biệt hoa thường (như `disease_library` L2) | BR-01 |
  | `cropId` | ≥ 1, tuỳ chọn | BR-01 |
  | `status` | `DRAFT` · `PUBLISHED` · `HIDDEN`, tuỳ chọn | BR-01 |
  | `page`, `pageSize` | `page` ≥ 1; `pageSize` 1–50, mặc định 20 ✎ | TD-05 |

- **Response 200:** `{ items: AdminDiseaseItem[], page, pageSize, total }`. Thứ tự ✎: `updated_at` giảm dần, rồi `id` giảm dần.
- Mọi bệnh, kể cả của loại cây đang ẩn.

### B2. GET `/admin/diseases/:id`

- **Response 200:** `AdminDisease`, mọi trạng thái. **Lỗi:** 404 `DISEASE_NOT_FOUND`.

### B3. POST `/admin/diseases`

- **Request** (`multipart/form-data`). Trường theo C4 bước 4 và specs BR-02:

  | Trường | Bắt buộc | Validation | Nguồn |
  |---|---|---|---|
  | `cropId` | Có | Loại cây có tồn tại (cả đang ẩn) | C4 bước 4 |
  | `name` | Có | Cắt khoảng trắng, 1–150 ký tự; không trùng trong cùng loại cây (không phân biệt hoa thường ✎) | BR-05 |
  | `pathogen` | Không | Tối đa 150 ký tự | `diseases.pathogen` NULL |
  | `pathogenGroup` | Có | `FUNGUS` · `BACTERIA` · `VIRUS` · `PEST` · `PHYSIOLOGICAL` | NOT NULL |
  | `severity` | Có | `LOW` · `MEDIUM` · `HIGH` | NOT NULL |
  | `classCode` | Không ✎ | Tối đa 100 ký tự; rỗng = chưa gán; theo "Gán mã lớp" | BR-02, 03; OQ-53 |
  | `summary` | Khi `PUBLISHED` | Tối đa 500 ký tự | BR-06; DC-03 |
  | `symptoms`, `treatment` | Khi `PUBLISHED` | Tối đa 5000 ký tự mỗi trường ✎ | BR-06 |
  | `causes`, `prevention` | Không | Tối đa 5000 ký tự ✎ | BR-02 |
  | `recheckDays` | Không | Số nguyên 1–365 ✎ | BR-02; OQ-15 |
  | `isFeatured` | Không | `true`/`false`, mặc định `false` (BR-06) | BR-02 |
  | `status` | Có | `DRAFT` · `PUBLISHED` (C4 "Nháp hoặc Công khai") | BR-02, 06 |
  | `images` | Không | 0–10 tệp ✎, mỗi tệp JPG/PNG ≤ 10 MB | BR-02 |
  | `imageLayout` | Khi có ảnh | Chuỗi JSON, xem dưới | ERD-doc 4.4 |

- **`imageLayout` (TD-32 ✎):** mảng theo **thứ tự hiển thị**; phần tử đầu là ảnh bìa. Mỗi phần tử là `{ "upload": 0, "caption": "Lá non" }` (vị trí trong `images`) hoặc, ở B4, `{ "id": 5, "caption": null }` (ảnh đã có). `caption` tối đa 255 ký tự, rỗng thì `null`. Mỗi tệp trong `images` phải xuất hiện đúng một lần. Tối đa 10 phần tử ✎.
- **Xử lý:** lưu các tệp ảnh; rồi một giao dịch: tạo bệnh (`is_featured`, `status` theo request; `published_at` nếu `PUBLISHED`), tạo `disease_images` với `sort_order` theo thứ tự layout, gán `classCode` (BR-10). Lỗi thì xoá các tệp vừa lưu.
- **Response 201:** `AdminDisease`. Giao diện báo "Thêm bệnh thành công" (C4 bước 7).
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Thiếu trường bắt buộc, kể cả ba trường nội dung khi `status = PUBLISHED` | `errors` từng trường: "Vui lòng nhập đầy đủ thông tin bắt buộc" (C4 6.1) |
  | 400 | `VALIDATION_ERROR` | Quá dài, số ngày ngoài khoảng, quá 10 ảnh, `imageLayout` sai | `errors` từng trường, câu ✎ ở `design/screens/catalog.md` |
  | 400 | `CROP_NOT_FOUND` | `cropId` không tồn tại | trường `cropId`, câu "Vui lòng nhập đầy đủ thông tin bắt buộc" |
  | 409 | `DISEASE_NAME_TAKEN` | Trùng tên trong loại cây (BR-05) | ✎ "Tên bệnh đã có trong loại cây này", trường `name` |
  | 409 | `LABEL_ASSIGNED` | Mã lớp đang gán cho bệnh khác (C4 6.2) | "Mã lớp này đã được gán cho bệnh [tên bệnh]", trường `classCode` |
  | 409 | `LABEL_ASSIGNED`, `LABEL_OTHER_CROP` | Các trường hợp ✎ khác của "Gán mã lớp" | trường `classCode` |
  | 400 | `INVALID_IMAGE_TYPE` / `IMAGE_TOO_LARGE` | Ảnh sai | "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" |

### B4. PUT `/admin/diseases/:id`

- **Request:** như B3, gửi đủ các trường của form; trường tuỳ chọn gửi rỗng để xoá giá trị.
  - `status`: chỉ gửi khi bệnh đang `DRAFT` (OQ-54 ✎). Bệnh `PUBLISHED`/`HIDDEN` gửi `status` thì 400 `DISEASE_STATUS_NOT_ALLOWED` ✎ "Không thể chuyển sang trạng thái này".
  - `imageLayout`: danh sách ảnh **cuối cùng**. Ảnh đã có mà không có trong layout thì bị gỡ (ERD-doc 4.4 "gỡ từng ảnh trong form"). Không gửi `imageLayout` = giữ nguyên ảnh.
  - `cropId` khác hiện tại khi `cropLocked`: 409 `DISEASE_CROP_LOCKED` ✎.
- **Xử lý:** lưu tệp mới; một giao dịch: cập nhật bệnh (luôn đặt lại `updated_at`, kể cả khi chỉ đổi ảnh hoặc mã lớp), đồng bộ `disease_images` theo layout, gán `classCode`; xong thì xoá tệp của ảnh bị gỡ.
- **Response 200:** `AdminDisease`. Giao diện báo "Cập nhật thành công" (C4 5a).
- **Lỗi:** như B3, thêm 404 và các lỗi ở trên.

### B5. POST `/admin/diseases/:id/status`

- **Body:** `{ "status": "HIDDEN" | "PUBLISHED" }` (C4 3c).
- **Được chuyển:** `PUBLISHED` → `HIDDEN`; `HIDDEN` → `PUBLISHED` (phải đủ nội dung BR-06). Trường hợp khác (vd từ `DRAFT`): 400 `DISEASE_STATUS_NOT_ALLOWED` ✎. Đã ở trạng thái đích thì không lỗi.
- **Thiếu nội dung khi hiện:** 400 `DISEASE_CONTENT_REQUIRED` "Vui lòng nhập đầy đủ thông tin bắt buộc" (C4 6.1).
- **Response 200:** `AdminDisease`. Giao diện báo ✎ "Đã ẩn bệnh" / ✎ "Đã hiện bệnh". Bệnh bị ẩn không còn trong thư viện nhưng vẫn giữ trong lịch sử tra cứu (BR-08; `disease_library` BR-01 đã lọc).

### B6. DELETE `/admin/diseases/:id` (OQ-57 ✎)

- **Xử lý (BR-09, BR-10; ERD-doc 4.3):** đọc khoá ảnh; một giao dịch: xoá mọi dòng `model_labels` của bệnh, rồi xoá bệnh (`disease_images` xoá theo, CASCADE). Nhãn đã có dự đoán thì khoá ngoại RESTRICT (`diagnosis_predictions.label_id`) chặn: huỷ giao dịch, trả 409. Xong thì xoá tệp ảnh.
- Dùng chính khoá ngoại để biết "đã có dữ liệu chẩn đoán", nên `catalog` không phải đọc bảng của `diagnosis`.
- **Response:** `204`. Giao diện báo ✎ "Đã xoá bệnh".
- **Lỗi:** 404; 409 `DISEASE_HAS_DIAGNOSES` ✎ "Bệnh đã có dữ liệu chẩn đoán nên không thể xoá. Bạn có thể ẩn bệnh." (C4 3c1).

### B7. GET `/admin/diseases/related` (OQ-58 ✎)

- **Query:** `cropId` (bắt buộc), `pathogenGroup` (bắt buộc), `excludeId` (tuỳ chọn, bệnh đang sửa).
- **Response 200:** `DiseaseCard[]` của `disease_library`, tối đa 4, **cùng quy tắc** với `related` ở L3 (bệnh hiển thị được, cùng loại cây hoặc cùng nhóm tác nhân, cùng loại cây xếp trước). Dùng lại hàm của `LibraryService`.
- Dùng cho trang xem trước: giao diện dựng trang chi tiết bệnh từ **nội dung đang nhập trong form** (chưa lưu) và lấy phần "Các bệnh liên quan" từ đây.

---

## Nhãn mô hình (mô-đun `diagnosis`, TD-31 ✎)

### M1. GET `/admin/labels/model`

- **Xử lý:** gọi `AiClient.getLabels()` (AI `GET /labels`, TD-19 tạm nhận mảng chuỗi), rồi đối chiếu với `model_labels` qua `ModelLabelService` của `catalog`.
- **Response 200:**

  ```json
  {
    "items": [
      { "classCode": "Tomato___Late_blight", "assigned": true, "labelType": "DISEASE",
        "crop": { "id": 3, "name": "Cà chua" }, "disease": { "id": 1, "name": "Bệnh mốc sương", "status": "PUBLISHED" } },
      { "classCode": "Tomato___healthy", "assigned": true, "labelType": "HEALTHY",
        "crop": { "id": 3, "name": "Cà chua" }, "disease": null },
      { "classCode": "Tomato___Leaf_Mold", "assigned": false, "labelType": null, "crop": null, "disease": null }
    ],
    "stale": [
      { "classCode": "Rice___Old_label", "labelType": "DISEASE", "crop": { "id": 1, "name": "Lúa" },
        "disease": { "id": 6, "name": "Bệnh tiêm lửa", "status": "PUBLISHED" } }
    ]
  }
  ```

  - `items`: mọi mã của mô hình, sắp theo `classCode` ✎. `assigned` theo nghĩa "đang gán" ở quy ước chung.
  - `stale`: nhãn đang gán nhưng **không còn** trong mô hình (BR-19).
- Dùng cho màn "Nhãn mô hình" (OQ-59 ✎) và danh sách chọn "Mã lớp mô hình" trong form bệnh, form loại cây (C4: "chọn từ danh sách nhãn của mô hình đang dùng").
- **Lỗi:** AI không trả lời, quá thời gian hoặc trả sai dạng: 503 `AI_LABELS_UNAVAILABLE` ✎ "Không lấy được danh sách nhãn của mô hình. Vui lòng thử lại sau."

### M2. POST `/admin/labels/sync`

- **Xử lý (BR-19):** gọi lại `getLabels()`; trong một giao dịch, đặt `is_active = false` cho mọi nhãn `stale`. Không tự bật lại nhãn nào: mã quay lại mô hình thì gán lại ở form (OQ-59 ✎).
- **Response 200:** `{ "deactivated": 1 }`. Giao diện báo ✎ "Đã ngừng dùng {n} nhãn không còn trong mô hình".
- **Lỗi:** 503 `AI_LABELS_UNAVAILABLE` như M1.

**AI giả (`AI_MODE=mock`, TD-31 ✎):** `MockAiClient.getLabels()` hiện trả các nhãn đang dùng trong CSDL, nên màn "Nhãn mô hình" luôn "đã gán hết" và không thử được việc gán mã mới. Đề xuất: trả một danh sách cố định trong code = 11 mã của seed dev + 3 mã chưa gán để thử (`Tomato___Leaf_Mold`, `Potato___Early_blight`, `Corn_(maize)___Northern_Leaf_Blight`). `predict` vẫn chỉ chọn trong các nhãn đang gán. Danh sách này là dữ liệu tạm, ghi vào `real_data_needed.md` (A1) khi code.

---

## Quyết định đã áp (chốt 25/11)

| Mã | Nội dung | Đề xuất |
|---|---|---|
| OQ-53 | C4 6.1 chỉ nói "trường bắt buộc", không nói trường nào. Form loại cây (C4 3d) thiếu mã loại cây (`crops.code` NOT NULL) và hướng dẫn chăm sóc (ERD-doc 4.2, OQ-41) | **Bệnh:** luôn bắt buộc loại cây, tên bệnh, nhóm tác nhân, mức độ nguy hại (cột NOT NULL); khi chọn "Công khai" thêm mô tả ngắn, triệu chứng, biện pháp xử lý (BR-06); mã lớp không bắt buộc (bệnh nhập trước khi có nhãn). **Loại cây:** bắt buộc mã và tên; form có thêm "Mã loại cây" và "Hướng dẫn chăm sóc" |
| OQ-54 | Bệnh chuyển trạng thái thế nào; form sửa có trường trạng thái không | Bảng "Trạng thái bệnh" ở trên: form có "Nháp/Công khai" khi thêm và khi bệnh còn Nháp; đã công khai thì chỉ "Ẩn"/"Hiện"; không quay về Nháp |
| OQ-55 | Gán, đổi, bỏ mã lớp khi mã đã có dòng trong CSDL; đổi loại cây của bệnh đã gán mã | Bảng "Gán mã lớp" ở trên: đổi hoặc bỏ mã thì tắt nhãn cũ, không xoá; mã đã tắt gán lại được trong cùng loại cây; khoá đổi loại cây khi bệnh đã có nhãn |
| OQ-56 | Hiện lại loại cây có tự hiện lại các bệnh đã bị ẩn kèm không (BR-12) | Không. Ẩn loại cây chỉ chuyển bệnh `PUBLISHED` sang `HIDDEN`; hiện lại loại cây thì quản trị viên hiện từng bệnh |
| OQ-57 | C4 chỉ có ngoại lệ 3c1 ("không cho xoá vĩnh viễn"), không có luồng xoá | Có nút "Xoá bệnh" ở form sửa, hộp thoại xác nhận; xoá kèm ảnh và nhãn; bệnh đã có dữ liệu chẩn đoán thì báo không xoá được, gợi ý ẩn. Không có xoá loại cây |
| OQ-58 | "Xem trước" (C4 5b) xem nội dung đang nhập hay bản đã lưu | Nội dung **đang nhập**, dựng bằng đúng thành phần trang chi tiết bệnh của người dùng, "Các bệnh liên quan" lấy từ B7 |
| OQ-59 | C4 không có màn nào để xem mọi mã lớp của mô hình đã được gán chưa (BR-15) | Thêm màn "Nhãn mô hình" trong khu Danh mục: bảng mã lớp và tình trạng gán, lọc "Chưa gán", nút "Cập nhật theo mô hình" (M2) khi có nhãn không còn trong mô hình |
| OQ-60 | Giá trị và câu chữ Claude soạn | Cỡ trang 20, thứ tự theo ngày cập nhật, tối đa 10 ảnh, giới hạn độ dài, số ngày 1–365, trùng tên không phân biệt hoa thường, câu chữ ở `design/screens/catalog.md` mục "Chữ Claude soạn" |
| TD-31 | Lấy danh sách nhãn của mô hình phải gọi AI qua `AiClient` (chỉ ở `diagnosis`), mà `catalog` không import `diagnosis` được (`diagnosis` → `catalog`) | **A (khuyến nghị):** M1, M2 đặt ở `diagnosis/labels/`, ghi qua hàm mới của `ModelLabelService` (catalog export). Form của `catalog` không gọi AI. Kèm AI giả trả danh sách cố định. **B:** tách `AiClient` thành mô-đun hạ tầng dùng chung; phải sửa be-coding-rules mục 7 |
| TD-32 | Ảnh minh hoạ gửi cùng form hay qua endpoint riêng | **Cùng form** (B3, B4 nhận `images` + `imageLayout`): một lần "Lưu", một câu báo, không có trạng thái lưu dở. Phương án khác: 4 endpoint ảnh riêng (thêm, sửa chú thích, đổi thứ tự, gỡ), giao diện gọi lần lượt sau khi lưu bệnh |
| TD-33 | Đường dẫn API quản trị | Tiền tố `/admin/` (`/admin/crops`, `/admin/diseases`, `/admin/labels`), tách khỏi API đọc của thư viện. Sửa trọn form bằng `PUT` |

## Ghi chú cài đặt (25/11)

| Mục | Cách làm |
|---|---|
| Gán mã lớp | `catalog/admin/label-assignment.ts` (`assignLabel`), khoá dòng nhãn `FOR UPDATE` trong giao dịch của form |
| `imageLayout` | `catalog/admin/image-layout.ts`. Giao diện luôn gửi danh sách cuối cùng (kể cả `[]`), nên B4 từ giao diện luôn đồng bộ ảnh |
| B6 bị chặn | Khoá ngoại `fk_diagnosis_predictions_label` khai báo ON DELETE RESTRICT nên PostgreSQL trả mã `23001` (không phải `23503`); backend nhận cả hai mã. Giao dịch huỷ trọn, không mất nhãn |
| M1, M2 | AI trả danh sách **rỗng** cũng báo 503 `AI_LABELS_UNAVAILABLE`, để M2 không tắt mọi nhãn (khi đó mọi lượt chẩn đoán sẽ thất bại) |
| AI giả | `MockAiClient.getLabels()` trả `MOCK_MODEL_LABELS`: 11 mã của seed dev và 3 mã chưa gán (`Tomato___Leaf_Mold`, `Potato___Early_blight`, `Corn_(maize)___Northern_Leaf_Blight`) |
| Trùng tên | So `LOWER(name)`; chữ có dấu so đúng hay không tuỳ collation của CSDL |
| Bản ghi bị sửa | B4, B5 luôn đặt lại `updated_at`, kể cả khi chỉ đổi ảnh, mã lớp hoặc trạng thái |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 24/11/2026 | 0.1 | Sinh từ specs catalog v0.2 (build-first). Chờ duyệt OQ-53 → OQ-60, TD-31 → TD-33 | Claude |
| 25/11/2026 | 0.2 | Dương duyệt: OQ-53 → OQ-60, TD-32, TD-33 theo đề xuất; TD-31 phương án A. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 25/11/2026 | 0.3 | Code xong; mục "Ghi chú cài đặt" | Claude |

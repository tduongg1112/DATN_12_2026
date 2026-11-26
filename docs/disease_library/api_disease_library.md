# API — Xem bệnh cây hay gặp (`disease_library`)

> **Trạng thái:** REVIEWED (build-first 22/11, review lại ở giai đoạn test) · Sinh từ `specs_disease_library.md` v0.2 · Định dạng response và lỗi theo TD-05 (đã chốt)
> Câu có trong specs được chép nguyên văn. Câu và giá trị **Claude soạn** (nguồn không có) đánh dấu ✎, Dương đã duyệt ngày 22/11 (OQ-37, OQ-38). Vị trí truy vấn "Đang phổ biến": TD-24 (chốt 22/11).

## Tổng quan

Tiền tố chung: `/api/v1`. Mô-đun backend: `catalog` (`backend/src/modules/catalog/`). API **chỉ đọc** (specs mục 6).

| # | Method | Path | Mô tả | Quyền | Phục vụ (US/BR) |
|---|---|---|---|---|---|
| L1 | GET | `/crops` | Loại cây đang hiển thị, cho thanh lọc | USER, ADMIN | US-02 · BR-05 |
| L2 | GET | `/diseases` | Thẻ tin bệnh công khai: lọc theo loại cây, tìm theo tên, phân trang. Trang chủ gọi trang 1 cỡ 6 | USER, ADMIN | US-01, US-02 · BR-01 → 05, 08, 10, 11 |
| L3 | GET | `/diseases/:id` | Chi tiết một bệnh công khai, kèm bệnh liên quan | USER, ADMIN | US-03 · BR-01, 06, 07, 08 |

- Mọi route cần đăng nhập (`JwtAuthGuard` mặc định) và gắn `@Roles('USER')`; ADMIN dùng được vì kế thừa USER (OQ-22).
- Dữ liệu danh mục dùng chung cho mọi người dùng, không có kiểm tra sở hữu.
- L1 sẽ được dùng lại ở `diagnosis` (chọn loại cây) và `my_plants` (form cây).
- Màn quản trị (`catalog`) có API riêng sau này. "Xem trước" bệnh nháp (catalog BR-07) không đi qua L3.

## Quy ước chung

**Bệnh hiển thị được (BR-01):** `diseases.status = 'PUBLISHED'` **và** loại cây của bệnh `crops.status = 'ACTIVE'`. Điều kiện thứ hai suy từ `specs_catalog.md` BR-12 (ẩn loại cây thì ẩn luôn bệnh của nó). Bệnh không thoả thì L2 không trả, L3 trả 404.

**Thứ tự thẻ tin (BR-03, BR-08):**
1. Bệnh nổi bật (`is_featured = true`) trước.
2. Rồi bệnh "Đang phổ biến" (BR-04).
3. Còn lại theo `published_at` giảm dần. Trong cùng nhóm 1 hoặc 2 cũng sắp theo `published_at` giảm dần, rồi `id` giảm dần để thứ tự ổn định khi phân trang.

Specs chỉ nói thứ tự cho trang chủ. Trang "Xem tất cả" dùng **cùng thứ tự** ✎ (OQ-37).

**"Đang phổ biến" (BR-04, OQ-28):** top `LIBRARY_TRENDING_LIMIT` bệnh có nhiều lượt nhất trong `LIBRARY_TRENDING_DAYS` ngày gần nhất. Một lượt được đếm khi:
- `diagnoses.status = 'COMPLETED'` và `result_type = 'DISEASE'`
- dự đoán hạng 1 có `probability >= AI_CONFIDENCE_THRESHOLD`
- bệnh của nhãn hạng 1 đang hiển thị được

Lượt đã xoá mềm **vẫn được đếm**: specs `history` BR-09 ghi lượt đã xoá vẫn tính trong thống kê tổng hợp. Nếu `AI_CONFIDENCE_THRESHOLD` để trống thì chỉ xét `result_type = 'DISEASE'`, vì dạng kết quả đã được tính theo ngưỡng lúc chẩn đoán. Chỉ bệnh có ít nhất 1 lượt mới được gắn nhãn. API chỉ trả cờ `trending` cho từng bệnh, không trả số lượt hay dữ liệu người dùng.

**Ảnh bìa (BR-08):** ảnh `disease_images` có `sort_order` nhỏ nhất (cùng `sort_order` thì `id` nhỏ hơn). Không có ảnh thì `coverImageUrl = null`, giao diện dùng ảnh thay thế. URL đổi từ khoá đối tượng qua `StorageService.resolveUrl` (TD-14).

**Đối tượng `DiseaseCard`** (dùng ở L2 và `related` của L3):

```json
{
  "id": 3,
  "name": "Bệnh mốc sương",
  "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" },
  "severity": "HIGH",
  "summary": "Bệnh do nấm, lan rất nhanh khi trời ẩm và mát…",
  "coverImageUrl": null,
  "trending": false
}
```

| Trường | Ghi chú |
|---|---|
| `severity` | `LOW` · `MEDIUM` · `HIGH` (mức độ nguy hại, BR-18 của `diagnosis`). Giao diện hiện bằng cả màu lẫn chữ (specs mục 5) |
| `summary` | Mô tả ngắn trên thẻ tin (BR-02, DC-03). Bệnh công khai luôn có (catalog BR-06) |
| `trending` | `true` khi thuộc nhóm "Đang phổ biến" |

**Lỗi chung:** thiếu hoặc sai access token → `401 UNAUTHORIZED` "Vui lòng đăng nhập". Tham số sai → `400 VALIDATION_ERROR` "Dữ liệu không hợp lệ" kèm `errors[]`. Cả hai là câu dự phòng (OQ-29). Tham số do giao diện tạo nên không cần câu riêng theo trường.

---

## L1. GET `/crops`

- **Quyền:** USER, ADMIN.
- **Request:** không có.
- **Response 200:** mảng, sắp theo `id` tăng dần. Seed tạo theo thứ tự Lúa, Ngô, Cà chua, Ớt, Khoai tây, trùng thứ tự chip ở BR-05.

  ```json
  [
    { "id": 1, "code": "RICE", "name": "Lúa" },
    { "id": 2, "code": "CORN", "name": "Ngô" }
  ]
  ```

- **Lọc:** chỉ `crops.status = 'ACTIVE'`.
- **Lỗi:** chỉ lỗi chung.

## L2. GET `/diseases`

- **Quyền:** USER, ADMIN.
- **Query:**

  | Tham số | Kiểu | Bắt buộc | Validation | BR |
  |---|---|---|---|---|
  | `cropId` | số nguyên | Không | ≥ 1. Không có thì lấy mọi loại cây ("Tất cả") | BR-05 |
  | `q` | chuỗi | Không | Trim; rỗng thì bỏ qua; tối đa 100 ký tự ✎. Tìm trong `name`, không phân biệt hoa thường, phải gõ đúng dấu (N1) | BR-05 |
  | `page` | số nguyên | Không | ≥ 1, mặc định 1 | TD-05 |
  | `pageSize` | số nguyên | Không | 1 → 50, mặc định 20 ✎ (OQ-37) | TD-05 |

- **Response 200:** `{ "items": DiseaseCard[], "page": 1, "pageSize": 20, "total": 6 }`, thứ tự theo quy ước trên.
  - **Trang chủ** gọi `?page=1&pageSize=6` ✎ (OQ-37). `total = 0` thì ẩn chuyên mục (BR-10).
  - **"Xem tất cả"** gọi với `cropId`, `q` theo bộ lọc. `total = 0` thì giao diện hiện "Không tìm thấy bệnh phù hợp" (BR-11).
- **Ghi chú:**
  - `cropId` không tồn tại hoặc loại cây đang ẩn: trả danh sách rỗng, không báo lỗi.
  - Ký tự `%`, `_`, `\` trong `q` được thoát trước khi đưa vào `ILIKE`.
- **Lỗi:** chỉ lỗi chung.

## L3. GET `/diseases/:id`

- **Quyền:** USER, ADMIN.
- **Params:** `id` số nguyên ≥ 1. Sai định dạng → `400 VALIDATION_ERROR`.
- **Response 200:**

  ```json
  {
    "id": 3,
    "name": "Bệnh mốc sương",
    "pathogen": "Phytophthora infestans",
    "pathogenGroup": "FUNGUS",
    "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" },
    "severity": "HIGH",
    "summary": "…",
    "symptoms": "…",
    "causes": "…",
    "prevention": "…",
    "treatment": "…",
    "images": [{ "url": "http://localhost:4000/uploads/…", "caption": null }],
    "related": [ /* DiseaseCard, tối đa 4 */ ]
  }
  ```

  | Trường | Ghi chú (BR-06) |
  |---|---|
  | `pathogen` | Tác nhân gây bệnh, có thể `null` |
  | `pathogenGroup` | `FUNGUS` · `BACTERIA` · `VIRUS` · `PEST` · `PHYSIOLOGICAL` (data_model mục 1) |
  | `symptoms`, `treatment` | Luôn có (bắt buộc trước khi công khai, catalog BR-06) |
  | `causes`, `prevention` | Có thể `null`; giao diện ẩn mục rỗng |
  | `images` | Mọi ảnh minh hoạ, sắp theo `sort_order`, `id`. Ảnh đầu là ảnh bìa |
  | `related` | "Các bệnh liên quan" (BR-07): bệnh hiển thị được khác bệnh này, **cùng loại cây hoặc cùng nhóm tác nhân**. Cùng loại cây xếp trước, rồi theo `published_at` giảm dần. Tối đa 4 ✎ (OQ-37). Không có thì mảng rỗng |

  Không trả nguồn tham khảo (DC-04), `recheck_days`, `is_featured`, `status`. Nội dung là văn bản thuần: giao diện giữ xuống dòng, không hiểu HTML hay Markdown.
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo | BR |
  |---|---|---|---|---|
  | 404 | `DISEASE_NOT_FOUND` | Không có bệnh, bệnh chưa công khai, bị ẩn, hoặc loại cây bị ẩn | "Không tìm thấy dữ liệu" (câu dự phòng OQ-29) | BR-01 |

- **Ghi dữ liệu:** không.

## Cấu hình mới (`backend/.env.example`)

| Khoá | Mặc định | Nguồn |
|---|---|---|
| `LIBRARY_TRENDING_LIMIT` | `3` ✎ | N của BR-04 (OQ-28 giao chọn khi làm feature này → OQ-37) |
| `LIBRARY_TRENDING_DAYS` | `30` | BR-04 |
| `AI_CONFIDENCE_THRESHOLD` | `0.6` (tạm khi dev) | OQ-06, Dương chốt 22/11. Khoá đã có, chỉ điền giá trị mẫu |

## Quyết định đã áp (chốt 22/11)

| Mã | Nội dung |
|---|---|
| TD-24 | Truy vấn "Đang phổ biến" đặt trong `catalog` (`disease-trends.query.ts`), **chỉ đọc** `diagnoses`, `diagnosis_predictions` qua `DataSource`. Đây là ngoại lệ thứ hai về ranh giới mô-đun, sau TD-08 (be-coding-rules mục 2). Lý do: `diagnosis` đã import `catalog`; import ngược sẽ tạo vòng phụ thuộc mô-đun. Cách tính giữ đúng C4 UC05 bước 2 và OQ-28 |
| OQ-37 | N = 3; trang chủ 6 thẻ; "Xem tất cả" 20 thẻ mỗi trang (tối đa 50), cùng thứ tự với trang chủ; tối đa 4 bệnh liên quan; `q` tối đa 100 ký tự |
| OQ-38 | Chữ giao diện Claude soạn, danh sách ở `design/screens/disease_library.md` |
| OQ-05 | Chọn loại cây bắt buộc khi chẩn đoán. Không đổi API này |

## Nợ kỹ thuật

| # | Nội dung | Lý do để sau |
|---|---|---|
| N1 | Tìm theo tên phải gõ đúng dấu ("moc suong" không ra "mốc sương") | Tìm không dấu cần extension `unaccent` của PostgreSQL, tức là thêm migration. Hỏi lại khi cần |
| N2 | Chưa có ảnh minh hoạ thật; dữ liệu mẫu không có ảnh | Ảnh nhập qua `catalog` |
| N3 | Nội dung 6 bệnh mẫu do Claude soạn, chỉ dùng khi dev (OQ-36) | Nội dung thật theo OQ-19 |
| N4 | "Đang phổ biến" tính lại ở mỗi lần gọi L2, L3, không có cache | Truy vấn chỉ trả ≤ N id và dùng `ix_diagnoses_created`; xem lại khi `diagnoses` lớn |
| N5 | Chưa có `test_case_`, `test_plan_` cho feature này (giống `auth`, build-first) | Viết ở bước `/run-tests` |
| ~~N6~~ | ~~Dock vẫn ghi "Thư viện bệnh" (từ phần nền), còn tiêu đề trang là "Bệnh cây hay gặp" (specs)~~ | **Đã sửa 25/11** (`/review-code`, Dương duyệt): nhãn dock đổi thành "Bệnh cây hay gặp" (`frontend/lib/navigation.ts`) |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 22/11/2026 | 0.1 | Sinh từ specs v0.2 (build-first, như `auth`) | Claude |
| 22/11/2026 | 0.2 | Dương duyệt: chốt TD-24, OQ-37, OQ-38. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 22/11/2026 | 0.3 | Code xong (`backend/src/modules/catalog/library/`). API đúng như tài liệu; thêm N4 → N6 | Claude |
| 25/11/2026 | 0.4 | `/review-code`: sửa N6 (nhãn dock); `escapeLike` chuyển sang `backend/src/common/sql/` | Claude theo quyết định của Dương |

# API — Chẩn đoán bệnh qua hình ảnh (`diagnosis`)

> **Trạng thái:** REVIEWED (build-first 22/11, review lại ở giai đoạn test) · Sinh từ `specs_diagnosis.md` v0.3 (OQ-05 bắt buộc chọn loại cây) · Định dạng response và lỗi theo TD-05 (đã chốt)
> Câu có trong specs được chép nguyên văn. Câu **Claude soạn** (nguồn không có) đánh dấu ✎, Dương đã duyệt ngày 22/11 (OQ-40). Điểm kỹ thuật: TD-25, TD-26 (chốt 22/11).
> **Code:** DONE (build-first, 23/11). Backend `backend/src/modules/diagnosis/` (`diagnosis.controller.ts`, `diagnosis.service.ts`), test `test/diagnosis.e2e-spec.ts`. Chi tiết cài đặt ở mục "Ghi chú cài đặt".

## Phạm vi của lần build này

| Có | Để sang feature khác |
|---|---|
| Thu nhận ảnh, chỉnh ảnh, chọn loại cây (bắt buộc), gọi AI, 3 dạng kết quả, xem kết quả, mở trang chi tiết bệnh: US-01 → US-05, US-08; BR-01 → BR-21 | **"Lưu vào cây trồng"** và **chẩn đoán từ hồ sơ cây** (US-06, US-07; BR-22 → BR-27): làm ở `my_plants`, vì lúc đó mới có cây để chọn (`docs/README.md` mục 4) |
| Lượt chẩn đoán tự vào lịch sử (BR-14: ghi `COMPLETED` là đủ) | Màn lịch sử: `history` |

Tiền tố chung: `/api/v1`. Mô-đun backend: `diagnosis` (`backend/src/modules/diagnosis/`).

## Tổng quan

| # | Method | Path | Mô tả | Quyền | Phục vụ (US/BR) |
|---|---|---|---|---|---|
| D1 | POST | `/diagnoses` | Gửi ảnh gốc, ảnh đã chỉnh, loại cây; chạy AI; trả kết quả | USER, ADMIN | US-01 → US-05 · BR-04, 06, 07, 09 → 13 |
| D2 | GET | `/diagnoses/:id` | Xem lại kết quả một lượt của chính mình | USER, ADMIN | US-05, US-08 · BR-15 → 21 |
| L1 | GET | `/crops` | Danh sách loại cây cho bước chọn loại cây (đã có từ `disease_library`) | USER, ADMIN | US-04 |

- D1, D2 gắn `@Roles('USER')`; ADMIN dùng được (OQ-22).
- **Sở hữu dữ liệu (BR-G03):** D2 chỉ trả lượt có `user_id` của người gọi, kể cả khi người gọi là ADMIN. Lượt của người khác trả 404, như không tồn tại (be-coding-rules mục 4).

## Quy ước chung

**Dạng kết quả (BR-12, Bảng 4.4):** tính ở backend từ dự đoán hạng 1:
1. `probability < AI_CONFIDENCE_THRESHOLD` → `UNCERTAIN`
2. Nhãn hạng 1 là `HEALTHY` → `HEALTHY`
3. Còn lại → `DISEASE`

So sánh đúng ở biên: xác suất bằng ngưỡng thì **không** phải `UNCERTAIN`. Ngưỡng tạm khi dev là 0.6 (OQ-06). Cấu hình để trống thì lấy mặc định 0.6 (TD-26).

Xác suất được làm tròn 4 chữ số thập phân (đúng cột `DECIMAL(5,4)`) **trước** khi so ngưỡng, để giá trị lưu và dạng kết quả luôn khớp nhau. Ví dụ AI trả 0.59996 thì lưu 0.6000 và là `DISEASE`/`HEALTHY`.

**Số dự đoán:** gửi AI `top_k = AI_TOP_K` (3). AI có thể trả ít hơn, ví dụ khi loại cây chỉ có 2 nhãn (bản mock với dữ liệu mẫu hiện tại: cà chua 3, các cây khác 2). Backend lưu đúng số dự đoán nhận được (1 → 3 dòng, `rank_no` 1..n). Giao diện hiện "các khả năng khác" theo số có thật.

**Đối tượng `DiagnosisResult`** (D1 201, D2 200):

```json
{
  "id": 15,
  "resultType": "DISEASE",
  "createdAt": "2026-11-22T09:30:00.000Z",
  "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua", "careGuide": null },
  "originalImageUrl": "http://localhost:4000/uploads/diagnoses/2026/11/….jpg",
  "processedImageUrl": "http://localhost:4000/uploads/diagnoses/2026/11/….jpg",
  "predictions": [
    {
      "rank": 1,
      "probability": 0.8123,
      "labelType": "DISEASE",
      "disease": {
        "id": 1,
        "name": "Bệnh mốc sương",
        "severity": "HIGH",
        "pathogenGroup": "FUNGUS",
        "summary": "…",
        "symptoms": "…",
        "treatment": "…",
        "detailAvailable": true
      }
    },
    { "rank": 2, "probability": 0.1102, "labelType": "HEALTHY", "disease": null }
  ]
}
```

| Trường | Ghi chú |
|---|---|
| `resultType` | `DISEASE` · `HEALTHY` · `UNCERTAIN` |
| `crop.careGuide` | `crops.care_guide`, dùng khi `HEALTHY` (BR-16). Có thể `null` |
| `*ImageUrl` | Đổi từ khoá đối tượng qua `StorageService.resolveUrl` (TD-14). Bản S3 sau này là presigned URL ngắn hạn |
| `predictions` | Sắp theo `rank`. Hạng 1 là kết luận (BR-19). Hạng 2–3 là "các khả năng khác" |
| `labelType` | `DISEASE`: có `disease`. `HEALTHY`: `disease = null`, giao diện hiện "Cây khoẻ mạnh" |
| `disease.detailAvailable` | `true` khi bệnh đang công khai và loại cây đang hiện, tức là trang chi tiết bệnh (`disease_library` L3) mở được. Bệnh bị ẩn vẫn hiện tên và nội dung trong kết quả, nhưng không có nút "Xem chi tiết bệnh" (disease_library BR-01) |

Không trả `model_version`, `inference_ms` (chỉ dùng cho thống kê, Bảng 4.6), cũng không trả `status`, vì D1, D2 chỉ trả lượt `COMPLETED`.

**Lỗi chung:** chưa đăng nhập → `401 UNAUTHORIZED` "Vui lòng đăng nhập". Sai tham số → `400 VALIDATION_ERROR` "Dữ liệu không hợp lệ" kèm `errors[]` (OQ-29).

---

## D1. POST `/diagnoses`

- **Quyền:** USER, ADMIN. Lượt được gắn `user_id` của người gọi.
- **Request** (`multipart/form-data`):

  | Trường | Kiểu | Bắt buộc | Validation | BR |
  |---|---|---|---|---|
  | `original` | file | Có | JPG/PNG theo magic bytes, ≤ `STORAGE_MAX_BYTES` (10 MB) | BR-04, 06 |
  | `processed` | file | Có | Như trên. Ảnh đã cắt vuông và chỉnh; đây là ảnh gửi AI | BR-04, 06 |
  | `cropId` | số nguyên | Có | Loại cây tồn tại và đang hiển thị (`ACTIVE`) | BR-07, US-04, OQ-05 |

  Frontend nén ảnh trước khi gửi (TD-17), không resize về 224×224 (specs mục 5).

- **Xử lý** (BR-07, BR-09 → BR-13; data_model mục 5):
  1. Kiểm tra `cropId`, rồi kiểm tra hai ảnh (sai thì 400, chưa ghi gì).
  2. Lưu hai ảnh vào kho (`StorageService.saveImage(..., 'diagnoses')`).
  3. INSERT `diagnoses` `status = PROCESSING`, `crop_id`, `user_id`, hai khoá ảnh **trước khi** gọi AI (BR-07).
  4. Gọi `AiClient.predict({ image: processed, cropCode, topK })`, chờ tối đa `AI_TIMEOUT_MS` (15 giây, BR-10).
  5. Tra từng `class_code` trong `model_labels` đang dùng (BR-11).
  6. Tính dạng kết quả (BR-12). Trong **một giao dịch** (BR-13): INSERT `diagnosis_predictions` (n dòng), UPDATE `diagnoses` (`status = COMPLETED`, `result_type`, `model_version`, `inference_ms`, `completed_at = now()`).
  7. Trả `201 DiagnosisResult`.
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo | BR |
  |---|---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Thiếu `cropId`, hoặc `cropId` không phải số nguyên dương | "Dữ liệu không hợp lệ" + `errors: [{ field: "cropId", message: ✎ "Vui lòng chọn loại cây" }]` | BR-07, OQ-05 |
  | 400 | `CROP_NOT_FOUND` | `cropId` không có hoặc loại cây đang ẩn | ✎ "Vui lòng chọn loại cây" + `errors: [{ field: "cropId", … }]` | BR-07 |
  | 400 | `INVALID_IMAGE_TYPE` / `IMAGE_TOO_LARGE` | Thiếu ảnh hoặc không phải JPG/PNG (`INVALID_IMAGE_TYPE`); quá 10 MB (`IMAGE_TOO_LARGE`, kể cả tệp quá giới hạn cứng 20 MB bị chặn ngay khi nhận) | "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" | BR-04 |
  | 503 | `AI_UNAVAILABLE` | AI quá 15 giây, báo lỗi, trả sai hợp đồng, hoặc nhãn hạng 1..n không có trong danh mục (BR-11). Lượt chuyển `FAILED`, có `completed_at` | "Hệ thống đang bận, vui lòng thử lại sau" | BR-10, 11 |
  | 422 | `AI_IMAGE_REJECTED` | AI từ chối ảnh (400/422: ảnh hỏng, loại cây không hỗ trợ). Lượt chuyển `FAILED` | ✎ "Ảnh chưa phân tích được. Hãy chụp lại một lá rõ nét, đủ sáng." | BR-10 (mở rộng) |

- **Thử lại sau lỗi (TD-26):** frontend giữ ảnh và gọi lại D1, tạo một lượt mới. Lượt `FAILED` cũ được giữ để thống kê, không hiện ở lịch sử (OQ-23).
- **Nhãn lạ (BR-11, OQ-26):** ghi log mức ERROR kèm `class_code`, rồi tạo thông báo trong ứng dụng cho mọi ADMIN. Không gửi trùng cho cùng một `class_code`. Cách làm: TD-25. Nội dung thông báo ✎:
  - Tiêu đề: "Nhãn mô hình chưa có trong danh mục"
  - Nội dung: "Mô hình trả về nhãn {class_code} nhưng danh mục chưa có nhãn này. Lượt chẩn đoán đã bị dừng. Vui lòng cập nhật ánh xạ nhãn."
- **Ghi dữ liệu:** ảnh trong kho; `diagnoses` (1 dòng); `diagnosis_predictions` (1–3 dòng); có thể `notifications` (BR-11). Giao dịch: bước 6. Lưu ảnh xong mà INSERT ở bước 3 lỗi thì xoá ảnh vừa lưu.

## D2. GET `/diagnoses/:id`

- **Quyền:** USER, ADMIN. **Sở hữu:** chỉ lượt của chính mình.
- **Params:** `id` số nguyên ≥ 1; sai định dạng thì 400.
- **Response 200:** `DiagnosisResult`.
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo | BR |
  |---|---|---|---|---|
  | 404 | `DIAGNOSIS_NOT_FOUND` | Không có, của người khác, chưa `COMPLETED` (`PROCESSING`, `FAILED`), hoặc đã xoá mềm | "Không tìm thấy dữ liệu" (OQ-29) | BR-G03, OQ-23 |

- **Ghi chú:** feature `history` dùng lại đối tượng này cho trang chi tiết lượt tra cứu.

## Tích hợp AI service

| Mục | Giá trị |
|---|---|
| Lớp gọi | `AiClient` (đã có): `HttpAiClient` khi `AI_MODE=http`, `MockAiClient` khi `AI_MODE=mock` (TD-04) |
| Request | `POST /predict` multipart: `image` (ảnh đã chỉnh), `crop_code` (**luôn gửi**, OQ-05), `top_k` |
| Thời gian chờ | `AI_TIMEOUT_MS` = 15000 (BR-10) |
| Lỗi AI → lỗi API | `timeout`, `unavailable`, `invalid_response` → 503 `AI_UNAVAILABLE`; `bad_request` → 422 `AI_IMAGE_REJECTED` |
| Mock | `AI_MOCK_SCENARIO`: `ok`, `error`, `timeout`, `invalid_image`, `unknown_label`. Cùng một ảnh luôn ra cùng kết quả |
| Code đã sửa (23/11) | `AiPredictInput.cropCode` bắt buộc; `HttpAiClient` luôn gửi `crop_code`; `MockAiClient` luôn lọc nhãn theo loại cây. AI trả `predictions` trùng `class_code` thì coi là sai hợp đồng (`invalid_response` → 503) |

## Cấu hình

| Khoá | Giá trị | Ghi chú |
|---|---|---|
| `AI_CONFIDENCE_THRESHOLD` | 0.6 (tạm) | OQ-06. Để trống thì lấy mặc định 0.6 (TD-26) |
| `AI_TIMEOUT_MS`, `AI_TOP_K`, `AI_MODE`, `AI_MOCK_SCENARIO` | Đã có | Không đổi |
| `STORAGE_MAX_BYTES` | 10485760 | Giới hạn mỗi ảnh (BR-04) |

## Quyết định đã áp (chốt 22/11)

| Mã | Nội dung | Đề xuất |
|---|---|---|
| TD-25 | BR-11 cần tạo `notifications` (bảng của mô-đun `plants`) từ mô-đun `diagnosis` | `plants` export `NotificationsService.notifyAdmins(...)`, `diagnosis` import `plants`. Chiều phụ thuộc cố định: `diagnosis` → `catalog`, `plants`; `plants` **không** import `diagnosis` (dòng thời gian của cây ở `my_plants` lấy lượt chẩn đoán qua service mà `diagnosis` cung cấp cho controller của chính nó). Chuông thông báo (UI) vẫn làm ở `my_plants` |
| TD-26 | (a) `AI_CONFIDENCE_THRESHOLD` để trống thì chẩn đoán không tính được `UNCERTAIN`. (b) D1 chạy đồng bộ (chờ AI trong cùng request) và thử lại bằng cách gửi lại ảnh | (a) Đặt giá trị mặc định 0.6 trong kiểm tra cấu hình, ghi rõ là tạm theo OQ-06. (b) Giữ đồng bộ: đơn giản, đủ cho 15 giây; thử lại tạo lượt mới |
| OQ-40 | Câu chữ Claude soạn (✎ ở file này và `design/screens/diagnosis.md`) | Danh sách ở file màn hình |
| OQ-41 | `crops.care_guide` của 5 loại cây đang trống, nên kết quả "Cây khoẻ mạnh" không có gợi ý chăm sóc (BR-16) | Mở rộng OQ-36: Claude soạn gợi ý chăm sóc mẫu cho 5 loại cây trong seed dev |

## Ghi chú cài đặt (23/11)

| Mục | Cách làm |
|---|---|
| Thứ tự kiểm tra D1 | Multer nhận 2 ảnh (`DiagnosisUploadInterceptor`, giới hạn cứng 20 MB mỗi tệp) → DTO `cropId` → `CropService.findActive` → kiểm tra cả hai ảnh (magic bytes, `STORAGE_MAX_BYTES`) → mới lưu ảnh. Sai ở bước nào cũng chưa ghi gì, chưa gọi AI |
| Lưu ảnh lỗi giữa chừng | Lưu ảnh thứ hai lỗi thì xoá ảnh thứ nhất. INSERT `PROCESSING` lỗi thì xoá cả hai ảnh, trả 500 |
| Ghi kết quả lỗi | Giao dịch bước 6 lỗi (hoặc lượt không còn `PROCESSING`) thì lượt chuyển `FAILED`, trả 503 `AI_UNAVAILABLE` |
| Nhãn lạ | Mỗi `class_code` lạ: log ERROR, gọi `NotificationsService.notifyAdminsOnce` (TD-25). Gửi thông báo lỗi chỉ ghi log. `class_code` dài quá 300 ký tự thì cắt bớt trong nội dung thông báo (cột `content` 500 ký tự) |
| Kết quả trả về | D1 ghi xong thì đọc lại bằng chính truy vấn của D2, nên hai endpoint trả cùng một dạng |
| Frontend | `lib/api/diagnoses.ts`; kết quả D1 giữ một bản gần nhất trong bộ nhớ (`lib/diagnosis/result-cache.ts`) để màn kết quả không gọi lại D2 |

## Nợ kỹ thuật

| # | Nội dung | Lý do để sau |
|---|---|---|
| N1 | Ảnh của lượt `FAILED` vẫn nằm trong kho | Cần job dọn ảnh; làm khi triển khai |
| N2 | Không giới hạn số lượt chẩn đoán mỗi người dùng | Chưa có yêu cầu |
| N3 | Ảnh trả bằng URL công khai của kho local; presigned URL làm cùng bản S3 (TD-01) | Theo TD-14 chỉ đổi `StorageService` |
| N4 | "Huỷ" ở S4 chỉ ngừng chờ phía trình duyệt. Backend vẫn chạy tiếp; nếu AI trả kết quả thì lượt vẫn `COMPLETED` và hiện ở lịch sử | D1 chạy đồng bộ (TD-26). Huỷ thật cần API huỷ lượt, chưa có yêu cầu |
| N5 | Màn kết quả dùng bản D1 giữ trong bộ nhớ, nên với bản S3 sau này, URL ảnh có thể hết hạn nếu người dùng ở lâu trên trang | Làm cùng N3: ảnh lỗi thì tải lại D2 |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 22/11/2026 | 0.1 | Sinh từ specs v0.3 (build-first, như `auth`, `disease_library`) | Claude |
| 22/11/2026 | 0.2 | Dương duyệt: chốt TD-25, TD-26, OQ-40, OQ-41. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 23/11/2026 | 0.3 | Code xong (build-first): làm tròn xác suất trước khi so ngưỡng, `class_code` trùng là sai hợp đồng, mục "Ghi chú cài đặt", nợ kỹ thuật N4, N5 | Claude |

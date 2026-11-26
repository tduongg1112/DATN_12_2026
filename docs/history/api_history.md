# API — Xem lịch sử tra cứu (`history`)

> **Trạng thái:** REVIEWED (build-first 23/11, review lại ở giai đoạn test) · Sinh từ `specs_history.md` v0.3 · Định dạng response và lỗi theo TD-05 (đã chốt)
> Câu có trong specs hoặc C4 được chép nguyên văn. Câu và giá trị **Claude soạn** (nguồn không có) đánh dấu ✎, Dương đã duyệt ngày 23/11 (OQ-42, OQ-43, OQ-44). Điểm kỹ thuật: TD-27 (chốt 23/11).
> **Code:** DONE (build-first, 23/11). Backend `backend/src/modules/diagnosis/history/` (`history.controller.ts`, `history.service.ts`), test `test/history.e2e-spec.ts`. Frontend `frontend/components/history/`.

## Phạm vi của lần build này

| Có | Để sang feature khác |
|---|---|
| Danh sách có nhóm thời gian, tìm, lọc, phân trang; xem chi tiết; chẩn đoán lại; xoá một hoặc nhiều mục và hoàn tác: US-01, 02, 03, 05, 06; BR-01 → 05, 07 → 11 | **"Lưu vào cây trồng của tôi"** (US-04, BR-06): làm ở `my_plants`, cùng nút ở màn kết quả chẩn đoán (`docs/README.md` mục 4). Lúc này chưa có cây nào, nên "Tên cây" luôn trống nhưng API vẫn trả để không phải sửa sau |

Tiền tố chung: `/api/v1`. Mô-đun backend: `diagnosis` (`backend/src/modules/diagnosis/`), vì lịch sử là các lượt chẩn đoán. Không tạo mô-đun mới (be-coding-rules mục 2).

## Tổng quan

| # | Method | Path | Mô tả | Quyền | Phục vụ (US/BR) |
|---|---|---|---|---|---|
| H1 | GET | `/diagnoses` | Danh sách lượt tra cứu của chính mình: tìm, lọc, phân trang | USER, ADMIN | US-01, US-02 · BR-01 → 05 |
| D2 | GET | `/diagnoses/:id` | Chi tiết một lượt (đã có từ `diagnosis`). **Thêm trường `plant`** cho "Tên cây" (Bảng 4.6) | USER, ADMIN | US-03 · BR-04, 05 |
| H2 | POST | `/diagnoses/delete` | Xoá mềm một hoặc nhiều lượt | USER, ADMIN | US-06 · BR-08, 09 |
| H3 | POST | `/diagnoses/restore` | Hoàn tác: khôi phục các lượt vừa xoá | USER, ADMIN | US-06 · BR-08, 09 |
| L1 | GET | `/crops` | Loại cây cho chip lọc (đã có từ `disease_library`) | USER, ADMIN | US-02 |

- Mọi route gắn `@Roles('USER')`; ADMIN dùng được (OQ-22).
- **Sở hữu (BR-01, BR-G03):** chỉ lượt có `user_id` của người gọi, kể cả ADMIN. Lượt của người khác coi như không tồn tại.
- H2, H3 dùng `POST` với body `{ ids }` thay cho `DELETE` có body: TD-27 ✎.

## Quy ước chung

**Lượt được hiện (BR-01, OQ-23):** `status = 'COMPLETED'` và `deleted_at IS NULL`. Lượt `PROCESSING`, `FAILED` không bao giờ hiện, không xoá được.

**Dự đoán hạng 1 (BR-05):** tên bệnh, mức độ nguy hại và độ tin cậy của một lượt lấy từ `diagnosis_predictions` có `rank_no = 1` → `model_labels` → `diseases`. Không lưu dẫn xuất (database-rules mục 5).

**Đối tượng `HistoryItem`** (H1):

```json
{
  "id": 15,
  "resultType": "DISEASE",
  "createdAt": "2026-11-23T09:30:00.000Z",
  "thumbnailUrl": "http://localhost:4000/uploads/diagnoses/2026/11/….jpg",
  "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" },
  "plant": null,
  "probability": 0.8123,
  "disease": { "id": 1, "name": "Bệnh mốc sương", "severity": "HIGH" }
}
```

| Trường | Bảng 4.6 (DS) | Ghi chú |
|---|---|---|
| `thumbnailUrl` | Ảnh chẩn đoán | Ảnh đã chỉnh (`processed_image_url`) qua `StorageService.resolveUrl` (TD-14). Không có ảnh thu nhỏ riêng: giao diện thu nhỏ bằng CSS |
| `resultType` | Dạng kết quả | `DISEASE` · `HEALTHY` · `UNCERTAIN` |
| `crop` | Loại cây | Luôn có (OQ-05) |
| `plant` | Tên cây | `{ id, name }` của cây đã gắn, hoặc `null`. Ở lần build này luôn `null` |
| `probability` | Độ tin cậy | Xác suất hạng 1, 0–1 |
| `disease` | Tên bệnh, Mức độ nguy hại | Bệnh của nhãn hạng 1; `null` khi nhãn hạng 1 là `HEALTHY`. Với `UNCERTAIN` vẫn trả, giao diện **không** dùng làm tiêu đề (OQ-43 ✎) |
| `createdAt` | Thời gian tra cứu | ISO 8601. Nhóm "Hôm nay / 7 ngày qua / Trước đó" tính ở giao diện theo giờ máy người dùng (OQ-42 ✎) |

Không trả `model_version` (Bảng 4.6: không hiển thị).

**Lỗi chung:** chưa đăng nhập → `401 UNAUTHORIZED` "Vui lòng đăng nhập". Sai tham số → `400 VALIDATION_ERROR` "Dữ liệu không hợp lệ" kèm `errors[]` (OQ-29). Tham số do giao diện tạo nên lỗi từng trường dùng câu dự phòng này, như `disease_library`.

---

## H1. GET `/diagnoses`

- **Quyền:** USER, ADMIN. Chỉ lượt của chính mình (BR-01).
- **Query:**

  | Tham số | Kiểu | Bắt buộc | Validation | Ghi chú | BR |
  |---|---|---|---|---|---|
  | `q` | chuỗi | Không | Cắt khoảng trắng, tối đa 100 ký tự | Tìm trong tên bệnh hạng 1, không phân biệt hoa thường; `%`, `_` là ký tự thường. **Chỉ khớp lượt `DISEASE`** (OQ-43 ✎). Rỗng sau khi cắt thì coi như không tìm | BR-03 |
  | `cropId` | số nguyên ≥ 1 | Không | | Loại cây của lượt (`diagnoses.crop_id`). Không có lượt nào thì danh sách rỗng, không báo lỗi | BR-03 |
  | `resultType` | `DISEASE` \| `HEALTHY` \| `UNCERTAIN` | Không | | | BR-03 |
  | `from` | ISO 8601 có múi giờ | Không | Ngày giờ hợp lệ | `created_at >= from`. Giao diện gửi 00:00 của ngày bắt đầu theo giờ máy (OQ-42 ✎) | BR-03 |
  | `to` | ISO 8601 có múi giờ | Không | Ngày giờ hợp lệ; `from <= to` nếu có cả hai | `created_at < to`. Giao diện gửi 00:00 của **ngày sau** ngày kết thúc, để lấy trọn ngày cuối | BR-03 |
  | `page` | số nguyên ≥ 1 | Không | Mặc định 1 | | BR-01 |
  | `pageSize` | số nguyên 1–50 | Không | Mặc định 20 | Cùng quy ước "Xem thêm" của thư viện (OQ-37) | BR-01 |

- **Thứ tự (BR-02):** `created_at` giảm dần, rồi `id` giảm dần để ổn định khi phân trang.
- **Response 200:** `{ items: HistoryItem[], page, pageSize, total }` (TD-05).
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Tham số sai kiểu, `resultType` lạ, `pageSize` > 50, `q` quá 100 ký tự, `from` > `to` | "Dữ liệu không hợp lệ" + `errors[]` |

- **Trạng thái rỗng (BR-10, BR-11):** API chỉ trả `total = 0`. Giao diện phân biệt "chưa có lượt nào" (không có bộ lọc) với "không có kết quả phù hợp" (có bộ lọc).

## D2. GET `/diagnoses/:id` (bổ sung)

- Giữ nguyên hợp đồng ở `docs/diagnosis/api_diagnosis.md`, **thêm** một trường vào `DiagnosisResult`:

  ```json
  "plant": { "id": 4, "name": "Cà chua ban công" }
  ```

  `null` khi chưa gắn cây (luôn `null` ở lần build này). Phục vụ "Tên cây" ở chi tiết (Bảng 4.6). D1 cũng trả trường này, vì D1 trả cùng đối tượng.
- Các trường còn lại của chi tiết theo Bảng 4.6 đã có trong `DiagnosisResult`: ảnh đã chỉnh, ảnh gốc, loại cây, dạng kết quả, tên bệnh, độ tin cậy, các khả năng khác (hạng 2–3), mức độ nguy hại, nhóm tác nhân, triệu chứng, hướng xử lý, `detailAvailable` cho liên kết tới trang chi tiết bệnh, thời gian.
- Lượt đã xoá mềm vẫn trả 404 (BR-01).

## H2. POST `/diagnoses/delete`

- **Quyền:** USER, ADMIN. Chỉ lượt của chính mình.
- **Body:**

  | Trường | Kiểu | Bắt buộc | Validation | BR |
  |---|---|---|---|---|
  | `ids` | mảng số nguyên ≥ 1 | Có | 1–100 phần tử ✎ (TD-27); trùng thì gộp | BR-08 |

- **Xử lý (BR-08, BR-09; specs mục 6):** trong **một giao dịch**, đặt `deleted_at = now()` cho mọi id. Tất cả hoặc không: nếu có id không phải lượt `COMPLETED`, chưa xoá, của người gọi thì không xoá gì và trả 404.
- **Không đổi** `plants.health_status` (OQ-24). Lượt đã gắn cây tự rời khỏi dòng thời gian của cây, vì dòng thời gian chỉ gộp các lượt "còn hiệu lực" (`specs_my_plants.md` mục 4, C4 8d).
- Lượt đã xoá vẫn được tính trong thống kê tổng hợp ("Đang phổ biến" TD-24, dashboard) (BR-09).
- **Response:** `204 No Content`.
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu thông báo |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Thiếu `ids`, mảng rỗng, quá 100 phần tử, phần tử không phải số nguyên dương | "Dữ liệu không hợp lệ" + `errors[]` |
  | 404 | `DIAGNOSIS_NOT_FOUND` | Có id không tồn tại, của người khác, chưa `COMPLETED`, hoặc đã xoá | "Không tìm thấy dữ liệu" (OQ-29) |

## H3. POST `/diagnoses/restore`

- **Quyền:** USER, ADMIN. Chỉ lượt của chính mình.
- **Body:** `{ ids }`, như H2.
- **Xử lý (BR-08, BR-09):** trong một giao dịch, đặt `deleted_at = NULL` cho các id đang bị xoá. Id đã được khôi phục rồi thì bỏ qua (bấm "Hoàn tác" hai lần không lỗi). Tất cả hoặc không: có id không phải lượt `COMPLETED` của người gọi thì không khôi phục gì và trả 404.
- **Hạn hoàn tác:** giao diện chỉ hiện nút "Hoàn tác" trong 5 giây (BR-08). Backend **không** giới hạn thời gian ✎ (TD-27).
- **Không đổi** `plants.health_status` (OQ-24).
- **Response:** `204 No Content`.
- **Lỗi:** như H2.

## Quyết định đã áp (chốt 23/11)

| Mã | Nội dung | Đề xuất |
|---|---|---|
| OQ-42 | Bộ lọc "khoảng thời gian" và cách chia nhóm thời gian (C4 chỉ nêu tên) | Lọc bằng hai ô ngày "Từ ngày", "Đến ngày"; API nhận `from`, `to` dạng ngày giờ có múi giờ do giao diện tính. Nhóm theo giờ máy người dùng: "Hôm nay" = cùng ngày; "7 ngày qua" = 6 ngày trước đó; "Trước đó" = cũ hơn |
| OQ-43 | Lượt `UNCERTAIN` vẫn có bệnh hạng 1. Nếu tiêu đề mục và ô tìm dùng tên bệnh này thì trái BR-17 của `diagnosis` (chưa phải kết luận) | Tiêu đề mục theo dạng kết quả: `DISEASE` là tên bệnh; `HEALTHY` là "Cây khoẻ mạnh"; `UNCERTAIN` là "Chưa đủ chắc chắn để kết luận" (C4 Bảng 4.4). Ô tìm chỉ khớp lượt `DISEASE` |
| OQ-44 | Câu chữ Claude soạn cho `history` | Danh sách ở `design/screens/history.md` mục "Chữ Claude soạn" |
| TD-27 | Hình thức API xoá nhiều mục và hoàn tác | `POST /diagnoses/delete`, `POST /diagnoses/restore` với `{ ids }` (1–100), tất cả hoặc không, trả 204. Backend không giới hạn thời gian hoàn tác (chỉ là dữ liệu của chính người dùng, xoá mềm). Hoàn tác lặp lại không lỗi |

## Ghi chú cài đặt (23/11)

| Mục | Cách làm |
|---|---|
| Vị trí code | Thư mục con `history/` của mô-đun `diagnosis`, controller riêng cùng tiền tố `diagnoses` (giống `catalog/library/`) |
| `from`, `to` | Nhận ISO 8601 có múi giờ (`Z` hoặc `+07:00`); thiếu múi giờ, chỉ có ngày, hoặc ngày không có thật thì 400 |
| Xoá | Một câu `UPDATE` trong giao dịch; số dòng đổi khác số id (sau khi gộp trùng) thì ném 404 để huỷ giao dịch |
| Hoàn tác | Đếm lượt `COMPLETED` của người gọi kể cả đã xoá, phải bằng số id; rồi mới đặt `deleted_at = NULL` |
| Giao diện sau khi xoá, hoàn tác | Mục vừa xoá ẩn ngay, rồi tải lại danh sách từ trang 1 với bộ lọc hiện tại. Lý do: phân trang theo số trang, xoá làm lệch vị trí nên "Xem thêm" tiếp từ trang cũ sẽ sót mục |

## Nợ kỹ thuật

| # | Nội dung | Lý do để sau |
|---|---|---|
| N1 | Ảnh của lượt đã xoá mềm vẫn trong kho; BR-09 "không dùng làm dữ liệu huấn luyện" hiện chưa có chức năng xuất dữ liệu nào để chặn | Làm khi có chức năng xuất dữ liệu cho nhóm AI |
| N2 | `thumbnailUrl` là ảnh đã chỉnh kích thước đầy đủ (≤ 1600), chưa có ảnh thu nhỏ riêng | Danh sách 20 mục mỗi trang, ảnh tải lười (`loading="lazy"`); làm ảnh thu nhỏ cùng bản S3 nếu chậm |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 23/11/2026 | 0.1 | Sinh từ specs v0.3 (build-first) | Claude |
| 23/11/2026 | 0.2 | Dương duyệt: chốt OQ-42, OQ-43, OQ-44, TD-27. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 23/11/2026 | 0.3 | Code xong (build-first): mục "Ghi chú cài đặt" | Claude |

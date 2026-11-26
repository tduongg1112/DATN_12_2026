# API — Xem dashboard & báo cáo (`dashboard`)

> **Trạng thái:** DRAFT (build-first 25/11, chờ Dương duyệt) · Sinh từ `specs_dashboard.md` v0.3, C4 Bảng 4.11, 4.12 · Định dạng response và lỗi theo TD-05 (đã chốt)
> Câu có trong specs hoặc C4 được chép nguyên văn. Câu và giá trị **Claude soạn** (nguồn không có) đánh dấu ✎, **chờ duyệt** (OQ-61 → OQ-65). Điểm kỹ thuật chờ duyệt: TD-34, TD-35.
> **[AI]** Nhóm chỉ số "Chất lượng mô hình" cần nhóm AI xem (specs mục 8). Ngưỡng độ tin cậy vẫn tạm 0.6 (OQ-06), nên tỷ lệ "Chưa xác định" lúc dev chỉ để thử.

## Phạm vi

| Gồm | US / BR |
|---|---|
| Dashboard theo khoảng thời gian: 7, 30, 90 ngày hoặc tuỳ chọn; mặc định 30 ngày | US-01, US-02 · BR-01, 02, 04, 05, 06, 08, 09 |
| Chi tiết chỉ số: danh sách lượt chẩn đoán theo dạng kết quả, loại cây hoặc bệnh | US-03 · BR-03, 05, 08 |

Không làm: xuất báo cáo (US-04, OQ-11), "Tổng số người dùng" (OQ-25), "Tỷ lệ đánh giá đúng" (OQ-14), xuất ảnh cho nhóm AI (ADM-06).

Tiền tố chung: `/api/v1`. Mô-đun backend mới `dashboard` (`backend/src/modules/dashboard/`, mô-đun thứ 5, TD-08): không có bảng riêng, chỉ chạy truy vấn **chỉ đọc** qua `DataSource` trên bảng của `accounts`, `catalog`, `diagnosis`. Không mô-đun nào import `dashboard`.

## Tổng quan

| # | Method | Path | Mô tả | Phục vụ |
|---|---|---|---|---|
| S1 | GET | `/admin/dashboard` | Mọi chỉ số của Bảng 4.12 (trừ phần hoãn, bỏ) trong một khoảng thời gian | US-01, US-02 · BR-01, 02, 04 → 06, 08, 09 |
| S2 | GET | `/admin/dashboard/diagnoses` | Danh sách lượt chẩn đoán trong khoảng, lọc theo dạng kết quả, loại cây, bệnh | US-03 · BR-03, 05, 08 |

- Cả hai gắn `@Roles('ADMIN')` (specs mục 6). USER gọi thì 403 "Bạn không có quyền thực hiện thao tác này" (OQ-29).
- Một endpoint tổng hợp cho cả trang, thay vì mỗi chỉ số một endpoint: đổi khoảng thời gian thì tính lại mọi chỉ số cùng lúc (BR-01), giao diện chỉ chờ một lần (TD-35 ✎).

## Quy ước chung

**Lượt được đếm (BR-05, BR-08):** `diagnoses.status = 'COMPLETED'` và `created_at` trong khoảng `[from, to)`. Lượt đã bị người dùng xoá mềm **vẫn được đếm** (BR-05). Loại cây của lượt là `diagnoses.crop_id` (BR-09). Bệnh và độ tin cậy lấy từ dự đoán `rank_no = 1` (database-rules mục 5).

**Ai được đếm (OQ-62 ✎):**
- Chỉ số "Người dùng" chỉ đếm tài khoản `role = 'USER'` (Bảng 4.12: "tài khoản Người dùng"). ADMIN được seed, không phải người dùng thật.
- Chỉ số chẩn đoán và chất lượng mô hình đếm **mọi lượt**, kể cả của ADMIN (ADMIN dùng được chức năng chẩn đoán, OQ-22). Đây là số liệu về hệ thống và mô hình, không về người dùng.

**Khoảng thời gian (OQ-61 ✎):** giao diện tính và gửi `from`, `to` là ngày giờ ISO có múi giờ (như `history`, OQ-42), cùng `tz` là múi giờ IANA của máy quản trị viên để chia theo ngày.

| Lựa chọn | `from` | `to` |
|---|---|---|
| 7 / 30 / 90 ngày (mặc định 30, BR-01) | 00:00 của ngày cách hôm nay N−1 ngày (gồm cả hôm nay) | Thời điểm hiện tại |
| Tuỳ chọn (từ ngày, đến ngày) | 00:00 ngày bắt đầu | 00:00 ngày **sau** ngày kết thúc (lấy trọn ngày cuối). Không sau hôm nay; tối đa 366 ngày ✎ |

**Kỳ trước** (cho "Người dùng mới", Bảng 4.12 "so với kỳ trước"): khoảng cùng độ dài liền trước, `[from − (to − from), from)`. `changePercent = (hiện tại − kỳ trước) / kỳ trước × 100`, làm tròn 1 chữ số; kỳ trước bằng 0 thì `null` ✎.

**Câu thông báo chung:** chưa đăng nhập → 401 "Vui lòng đăng nhập". Tham số sai → 400 `VALIDATION_ERROR` "Dữ liệu không hợp lệ" kèm `errors[]` (giao diện tự tạo tham số nên không cần câu riêng theo trường, trừ khoảng tuỳ chọn ở dưới).

---

## S1. GET `/admin/dashboard`

- **Query:**

  | Tham số | Bắt buộc | Validation |
  |---|---|---|
  | `from`, `to` | Có | Ngày giờ ISO 8601 có múi giờ; `from < to`; `to − from` ≤ 366 ngày ✎; `from` không sau hiện tại |
  | `tz` | Không | Tên múi giờ IANA hợp lệ (vd `Asia/Ho_Chi_Minh`); mặc định `Asia/Ho_Chi_Minh` ✎ |

- **Response 200:**

  ```json
  {
    "range": { "from": "…", "to": "…", "previousFrom": "…", "tz": "Asia/Ho_Chi_Minh" },
    "users": {
      "newUsers": { "current": 12, "previous": 8, "changePercent": 50 },
      "activeUsers": 30
    },
    "diagnoses": {
      "total": 120,
      "daily": [{ "date": "2026-10-27", "count": 3 }, { "date": "2026-10-28", "count": 0 }],
      "byResult": { "DISEASE": 70, "HEALTHY": 35, "UNCERTAIN": 15 },
      "byCrop": [{ "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" }, "count": 40 }],
      "topDiseases": [
        { "disease": { "id": 1, "name": "Bệnh mốc sương" }, "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" }, "count": 18 }
      ]
    },
    "model": {
      "avgConfidence": 0.8123,
      "uncertainRate": 0.125,
      "avgResponseMs": 2300,
      "modelVersion": "mock-1"
    },
    "content": {
      "publishedTotal": 6,
      "publishedByCrop": [{ "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" }, "count": 2 }]
    }
  }
  ```

- **Cách tính từng chỉ số** (Bảng 4.12; OQ-63 ✎ cho phần nguồn không nói):

  | Trường | Chỉ số | Cách tính |
  |---|---|---|
  | `users.newUsers` | Người dùng mới | Số tài khoản `USER` có `users.created_at` trong kỳ; `previous` của kỳ trước |
  | `users.activeUsers` | Người dùng hoạt động | Số tài khoản `USER` khác nhau có ít nhất một lượt được đếm trong kỳ |
  | `diagnoses.total`, `daily` | Số lượt chẩn đoán | Tổng lượt được đếm; `daily` có **đủ mọi ngày** của khoảng theo `tz` (ngày không có lượt là 0), sắp tăng dần |
  | `diagnoses.byResult` | Tỷ lệ dạng kết quả | Số lượt theo `result_type`. Giao diện tự tính phần trăm |
  | `diagnoses.byCrop` | Phân bố theo loại cây | Số lượt theo `diagnoses.crop_id`. Gồm mọi loại cây đang hiện (kể cả 0 lượt) và loại cây đang ẩn nếu có lượt ✎. Sắp theo `crops.id` |
  | `diagnoses.topDiseases` | Bệnh phát hiện nhiều nhất | Tối đa 5 bệnh theo số lượt `DISEASE` (bệnh của nhãn hạng 1), nhiều trước; bằng nhau thì theo tên ✎. Mọi trạng thái bệnh |
  | `model.avgConfidence` | Độ tin cậy trung bình | Trung bình `probability` hạng 1 của mọi lượt được đếm (cả 3 dạng kết quả) ✎. Không có lượt: `null` |
  | `model.uncertainRate` | Tỷ lệ "Chưa xác định" | `UNCERTAIN / total`. `total = 0`: `null` |
  | `model.avgResponseMs` | Thời gian phản hồi trung bình | Trung bình `completed_at − created_at` (BR-04), mili giây, làm tròn. Không có lượt: `null` |
  | `model.modelVersion` | Phiên bản mô hình | `model_version` của lượt `COMPLETED` **mới nhất** (không phụ thuộc khoảng thời gian) ✎. Chưa có lượt nào: `null` |
  | `content` | Số bệnh đang công khai | Số bệnh `PUBLISHED` theo loại cây, mọi loại cây (kể cả 0), **không phụ thuộc khoảng thời gian** ✎ (đây là trạng thái hiện tại của danh mục) |

- **Không có dữ liệu (BR-06):** `diagnoses.total = 0` thì giao diện thay các biểu đồ bằng câu "Chưa có dữ liệu trong khoảng thời gian này". API vẫn trả đủ cấu trúc (mảng `daily` toàn 0, `topDiseases` rỗng).
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Thiếu hoặc sai `from`, `to`, `tz` | "Dữ liệu không hợp lệ" |
  | 400 | `DASHBOARD_RANGE_INVALID` | `from ≥ to`, `from` sau hiện tại, hoặc quá 366 ngày | ✎ "Khoảng thời gian không hợp lệ (tối đa 366 ngày)" |

## S2. GET `/admin/dashboard/diagnoses`

"Chi tiết chỉ số" (C4 bước 5–6, US-03). Mở từ (OQ-64 ✎): thẻ "Số lượt chẩn đoán" (tất cả), từng phần của biểu đồ tỷ lệ dạng kết quả và thẻ tỷ lệ "Chưa xác định" (`resultType`), từng cột loại cây (`cropId`), từng hàng bệnh (`diseaseId`). Chỉ số người dùng không có chi tiết.

- **Query:** `from`, `to` như S1 (không cần `tz`); tuỳ chọn `resultType` (`DISEASE` · `HEALTHY` · `UNCERTAIN`), `cropId`, `diseaseId` (bệnh của nhãn hạng 1); `page` (≥ 1, mặc định 1), `pageSize` (1–50, mặc định 20 ✎).
- **Response 200:** `{ items, page, pageSize, total }`, mới nhất trước:

  ```json
  {
    "id": 51,
    "createdAt": "2026-11-24T08:00:00.000Z",
    "resultType": "UNCERTAIN",
    "probability": 0.42,
    "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" },
    "topLabel": { "labelType": "DISEASE", "disease": { "id": 1, "name": "Bệnh mốc sương" } },
    "imageUrl": "http://localhost:4000/uploads/diagnoses/…",
    "deleted": false
  }
  ```

  | Trường | Ghi chú |
  |---|---|
  | `resultType`, `probability`, `crop`, `createdAt` | BR-03: kết quả, độ tin cậy (hạng 1), loại cây, thời gian |
  | `topLabel` | Nhãn hạng 1: bệnh, hoặc `labelType = HEALTHY` thì `disease = null`. Với lượt "Chưa xác định", giao diện hiện đây là dự đoán của mô hình ✎, vì đó là điều nhóm AI cần xem |
  | `imageUrl` | BR-03 "ảnh": **ảnh đã chỉnh** (`processed_image_url`), là ảnh gửi cho mô hình ✎. Lượt người dùng đã xoá: `null` (`history` BR-09: "Ảnh đã xoá không được dùng làm dữ liệu huấn luyện") |
  | `deleted` | Lượt người dùng đã xoá: vẫn có trong danh sách để số khớp với chỉ số (BR-05), nhưng không có ảnh ✎ |

- **Không trả** thông tin người dùng (tên, email, `user_id`), cây trồng gắn với lượt (OQ-64 ✎). Danh sách chỉ phục vụ đánh giá mô hình.
- **Lỗi:** như S1.

---

## Quyết định chờ duyệt

| Mã | Nội dung | Đề xuất |
|---|---|---|
| OQ-61 | Khoảng "N ngày gần nhất" tính thế nào; khoảng tuỳ chọn có giới hạn không; "kỳ trước" là gì; % khi kỳ trước bằng 0 | Gồm cả hôm nay, theo giờ máy quản trị viên; tuỳ chọn từ ngày – đến ngày, không sau hôm nay, tối đa 366 ngày; kỳ trước là khoảng cùng độ dài liền trước; kỳ trước bằng 0 thì không hiện % mà hiện số của kỳ trước |
| OQ-62 | Chỉ số đếm tài khoản nào | Chỉ số người dùng chỉ đếm `USER`; chỉ số chẩn đoán và mô hình đếm mọi lượt (kể cả ADMIN). Phương án khác: loại lượt của ADMIN khỏi mọi chỉ số |
| OQ-63 | Cách tính các chỉ số Bảng 4.12 không nói rõ | Bảng "Cách tính từng chỉ số" ở S1: độ tin cậy TB lấy xác suất hạng 1 của mọi lượt; phiên bản mô hình là của lượt mới nhất; phân bố loại cây có cả loại cây 0 lượt; số bệnh công khai không phụ thuộc khoảng thời gian |
| OQ-64 | Chỉ số nào có "xem chi tiết"; danh sách hiện gì; lượt người dùng đã xoá thì sao | Chi tiết cho số lượt, dạng kết quả, loại cây, bệnh (không cho chỉ số người dùng). Hiện ảnh đã chỉnh, kết quả, độ tin cậy, loại cây, thời gian, dự đoán hạng 1. Không hiện thông tin người dùng. Lượt đã xoá vẫn hiện nhưng không có ảnh (`history` BR-09) |
| OQ-65 | Câu chữ và giá trị Claude soạn | Cỡ trang 20, giới hạn 366 ngày, cách hiển thị số; câu chữ ở `design/screens/dashboard.md` mục "Chữ Claude soạn" |
| TD-34 | Biểu đồ đường và biểu đồ tròn chưa có trong design/05 | Tự dựng bằng SVG theo 6 câu hỏi của design/00, **không thêm thư viện biểu đồ**. Có bảng số liệu ẩn cho trình đọc màn hình. Chi tiết ở `design/screens/dashboard.md` |
| TD-35 | Hình thức API | Một endpoint tổng hợp (S1) và một endpoint danh sách (S2), tiền tố `/admin/dashboard` (như TD-33); nhận `tz` để chia ngày đúng giờ máy quản trị viên |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 25/11/2026 | 0.1 | Sinh từ specs dashboard v0.3 (build-first). Chờ duyệt OQ-61 → OQ-65, TD-34, TD-35 | Claude |

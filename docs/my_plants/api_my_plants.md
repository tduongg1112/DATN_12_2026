# API — Quản lý cây trồng của tôi (`my_plants`)

> **Trạng thái:** REVIEWED (build-first 23/11, review lại ở giai đoạn test) · Sinh từ `specs_my_plants.md` v0.2 và phần hoãn của `specs_diagnosis.md` (BR-22 → BR-27), `specs_history.md` (BR-06) · Định dạng response và lỗi theo TD-05 (đã chốt)
> Câu có trong specs hoặc C4 được chép nguyên văn. Câu và giá trị **Claude soạn** (nguồn không có) đánh dấu ✎, Dương đã duyệt ngày 23/11 (OQ-45 → OQ-52). Điểm kỹ thuật: TD-28, TD-29 (phương án A), TD-30 (chốt 23/11).
> Dữ liệu đang tạm (chu kỳ tưới, bón, `recheck_days`, ngưỡng…) cần thay bằng dữ liệu thật: `docs/_shared/real_data_needed.md`.
> **Code:** DONE (build-first). Đợt 1 (23/11): `backend/src/modules/plants/`, `diagnosis/plant-link/`, test `test/plants.e2e-spec.ts`; frontend `components/plants/`. Đợt 2 (24/11): `plants/reminder.job.ts`, `reminder-rules.ts`, `notifications.controller.ts`, test `test/reminders.e2e-spec.ts`; frontend `components/plants/reminder-sheets.tsx`, `components/notifications/`, `components/layout/notification-bell.tsx`.

## Phạm vi và chia đợt (TD-30)

| Đợt | Gồm | US / BR |
|---|---|---|
| **1. Hồ sơ cây** | Danh sách, thêm, chi tiết kèm dòng thời gian, sửa, xoá cây; cập nhật tình trạng; ghi chú chăm sóc; "Lưu vào cây trồng của tôi" từ kết quả chẩn đoán và lịch sử; chẩn đoán từ hồ sơ cây | my_plants US-01 → 08; BR-01 → 13 · diagnosis US-06, 07; BR-22 → 25, 27 (phần tình trạng) · history US-04, BR-06 |
| **2. Nhắc việc và thông báo** | Nhắc kiểm tra lại 3/7/14 ngày; gợi ý nhắc tưới, bón, kiểm tra lại; job gửi nhắc; chuông và trang thông báo | my_plants US-09 → 11; BR-14 → 19 · diagnosis BR-26, 27 (phần gợi ý nhắc) |

Mỗi đợt duyệt kế hoạch code riêng. Tài liệu này mô tả đủ cả hai đợt.

Tiền tố chung: `/api/v1`. Mô-đun backend:
- `plants` (`backend/src/modules/plants/`): cây, nhật ký, nhắc việc, thông báo, job.
- `diagnosis`: các endpoint **ghi** vào `diagnoses` (gắn lượt vào cây, D1 nhận `plantId`). Chiều phụ thuộc giữ TD-25: `diagnosis` → `plants`; `plants` không import `diagnosis`.

## Tổng quan

| # | Method | Path | Mô tả | Đợt | Phục vụ |
|---|---|---|---|---|---|
| P1 | GET | `/plants` | Danh sách cây của mình, phân trang 10 cây | 1 | US-01 · BR-01, 04, 06, 13 |
| P2 | POST | `/plants` | Thêm cây (multipart, ảnh tuỳ chọn) | 1 | US-02 · BR-02, 03 |
| P3 | GET | `/plants/:id` | Chi tiết cây, bệnh đang mắc, dòng thời gian, lịch nhắc | 1 | US-03 · BR-05, 06 |
| P4 | PATCH | `/plants/:id` | Sửa thông tin cây (multipart) | 1 | US-07 · BR-10 |
| P5 | DELETE | `/plants/:id` | Xoá cây | 1 | US-08 · BR-11 |
| P6 | POST | `/plants/:id/status` | Cập nhật tình trạng "Đang điều trị" / "Đã khỏi" | 1 | US-05 · BR-08, 16 |
| P7 | POST | `/plants/:id/logs` | Thêm ghi chú chăm sóc (multipart, ảnh tuỳ chọn) | 1 | US-06 · BR-09 |
| A1 | POST | `/diagnoses/:id/plant` | Gắn một lượt vào cây đã có | 1 | diagnosis US-06, BR-22 → 25 · history BR-06 |
| A2 | POST | `/diagnoses/:id/new-plant` | Tạo cây mới từ một lượt rồi gắn (multipart) | 1 | diagnosis US-06, BR-22, 27 |
| D1 | POST | `/diagnoses` | **Bổ sung** trường `plantId`: chẩn đoán từ hồ sơ cây | 1 | diagnosis US-07, BR-24, 25 · my_plants US-04, BR-07 |
| R1 | POST | `/plants/:id/reminders/recheck` | "Nhắc tôi kiểm tra lại" sau 3, 7, 14 ngày | 2 | US-09 · BR-14 |
| R2 | POST | `/plants/:id/reminders/suggested` | Tạo các nhắc gợi ý người dùng đã xác nhận | 2 | US-11 · BR-16, 18 · diagnosis BR-26, 27 |
| N1 | GET | `/notifications` | Danh sách thông báo của mình, kèm số chưa đọc | 2 | US-10 · BR-17, 19 |
| N2 | GET | `/notifications/unread-count` | Số thông báo chưa đọc cho chuông | 2 | BR-19 |
| N3 | POST | `/notifications/:id/read` | Đánh dấu một thông báo đã đọc | 2 | BR-19 |
| N4 | POST | `/notifications/read-all` | Đánh dấu tất cả đã đọc ✎ | 2 | BR-19 |
| J1 | — | Job | Gửi nhắc đến hạn | 2 | BR-15, TD-28 |

- Mọi route gắn `@Roles('USER')`; ADMIN dùng được (OQ-22). ADMIN cũng nhận thông báo nhãn lạ ở N1 (diagnosis BR-11).
- **Sở hữu (BR-13):** mọi thao tác chỉ trên cây, lượt chẩn đoán, thông báo có `user_id` của người gọi; của người khác thì 404 như không tồn tại.
- **Đọc lượt chẩn đoán từ mô-đun `plants`** (P1 ngày chẩn đoán gần nhất, P3 bệnh đang mắc và dòng thời gian): TD-29 phương án A, ngoại lệ thứ ba của ranh giới mô-đun (truy vấn chỉ đọc qua `DataSource`, như TD-24).

## Quy ước chung

**Tình trạng sức khoẻ (Bảng 4.8, BR-04):** `NOT_DIAGNOSED` "Chưa chẩn đoán" · `HEALTHY` "Khoẻ mạnh" · `DISEASED` "Đang có bệnh" · `TREATING` "Đang điều trị" · `RECOVERED` "Đã khỏi". Màu theo `HealthStatus` đã chốt 21/11.

**Áp kết quả chẩn đoán vào cây (diagnosis BR-25, my_plants BR-04; OQ-48 ✎):**

| Kết quả của lượt | Tình trạng mới | Ghi chú |
|---|---|---|
| `DISEASE` | `DISEASED` | |
| `HEALTHY` | `HEALTHY` | Nếu trước đó cây `DISEASED` hoặc `TREATING` thì trả `suggestRecovered = true`: giao diện hỏi "Đã khỏi" (Bảng 4.8: hệ thống gợi ý, người dùng xác nhận), đồng ý thì gọi P6 |
| `UNCERTAIN` | Không đổi | |

Chỉ áp khi lượt này **mới hơn** mọi lượt khác đang gắn với cây và mới hơn lần "Cập nhật tình trạng" gần nhất (OQ-48 ✎). Gắn một lượt cũ từ lịch sử thì chỉ thêm vào dòng thời gian.

**Đối tượng `PlantCard`** (P1):

```json
{
  "id": 4,
  "name": "Cà chua ban công",
  "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" },
  "avatarUrl": "http://localhost:4000/uploads/plants/2026/11/….jpg",
  "healthStatus": "DISEASED",
  "lastDiagnosedAt": "2026-11-23T09:30:00.000Z"
}
```

`lastDiagnosedAt` = `MAX(created_at)` của các lượt `COMPLETED` chưa xoá đang gắn với cây, hoặc `null` (BR-06, không lưu thành cột).

**Đối tượng `PlantDetail`** (P2, P3, P4, P6):

```json
{
  "id": 4,
  "name": "Cà chua ban công",
  "crop": { "id": 3, "code": "TOMATO", "name": "Cà chua" },
  "plantedDate": "2026-10-01",
  "note": "Chậu số 2, ban công",
  "avatarUrl": null,
  "healthStatus": "DISEASED",
  "createdAt": "2026-11-20T02:00:00.000Z",
  "lastDiagnosedAt": "2026-11-23T09:30:00.000Z",
  "currentDisease": {
    "diagnosisId": 15, "id": 1, "name": "Bệnh mốc sương", "severity": "HIGH",
    "treatment": "…", "detailAvailable": true
  },
  "diagnoses": [
    { "id": 15, "createdAt": "…", "resultType": "DISEASE", "thumbnailUrl": "…", "probability": 0.81,
      "disease": { "id": 1, "name": "Bệnh mốc sương", "severity": "HIGH" } }
  ],
  "logs": [
    { "id": 9, "logType": "CARE_NOTE", "content": "Phun thuốc lần 1", "statusAfter": null,
      "imageUrl": null, "actionDate": "2026-11-23", "createdAt": "…" },
    { "id": 10, "logType": "STATUS_CHANGE", "content": null, "statusAfter": "TREATING",
      "imageUrl": null, "actionDate": "2026-11-23", "createdAt": "…" }
  ],
  "reminders": [
    { "id": 3, "type": "RECHECK", "title": "Kiểm tra lại cây", "nextRemindAt": "…", "repeatDays": null, "source": "USER" }
  ]
}
```

| Trường | Ghi chú |
|---|---|
| `currentDisease` | "Bệnh đang mắc" = bệnh của lượt `DISEASE` gần nhất của cây (BR-06). **Chỉ trả khi tình trạng là `DISEASED` hoặc `TREATING`**, còn lại `null` (OQ-46 ✎) |
| `diagnoses` | Dòng thời gian phần chẩn đoán: lượt `COMPLETED` chưa xoá đang gắn với cây, cùng dạng `HistoryItem` của `history` (bỏ `crop`, `plant`). Mới nhất trước. Không phân trang |
| `logs` | Dòng thời gian phần nhật ký (`plant_logs`). Giao diện gộp với `diagnoses` và sắp theo ngày |
| `reminders` | Lịch nhắc **đang bật** của cây, chỉ để xem (OQ-49). Đợt 1 luôn rỗng |
| `allowedStatusChanges` | Thêm khi code (23/11): các lựa chọn của "Cập nhật tình trạng" theo OQ-47 (`TREATING`, `RECOVERED`); rỗng thì giao diện ẩn nút. Để quy tắc nằm một chỗ ở backend |

**`ReminderSuggestion`** (đợt 2; trả trong P2, A1, A2, D1): `{ "type": "WATERING" | "FERTILIZING" | "RECHECK", "days": 3 }`. `WATERING`, `FERTILIZING`: lặp mỗi `days` ngày (chu kỳ của loại cây, BR-18). `RECHECK`: một lần sau `days` ngày (`diseases.recheck_days`, diagnosis BR-26). Chỉ gợi ý khi cây chưa có nhắc cùng loại đang bật (BR-16).

**Câu thông báo chung:** chưa đăng nhập → 401 "Vui lòng đăng nhập". Sai tham số do giao diện tạo → 400 `VALIDATION_ERROR` "Dữ liệu không hợp lệ" (OQ-29). Không thấy cây → 404 `PLANT_NOT_FOUND` "Không tìm thấy dữ liệu".

---

## Đợt 1 — Hồ sơ cây

### P1. GET `/plants`

- **Query:** `page` (mặc định 1), `pageSize` (mặc định **10**, tối đa 50) (OQ-45).
- **Response 200:** `{ items: PlantCard[], page, pageSize, total }` (TD-05). Giao diện tải 10 cây mỗi lần, "Xem thêm" để tải tiếp.
- **Thứ tự (BR-01, OQ-45):** `DISEASED` → `TREATING` → các tình trạng còn lại; trong mỗi nhóm `lastDiagnosedAt` giảm dần (chưa chẩn đoán xếp sau), rồi `created_at` giảm dần.

### P2. POST `/plants`

- **Request** (`multipart/form-data`):

  | Trường | Bắt buộc | Validation | BR |
  |---|---|---|---|
  | `name` | Có | Cắt khoảng trắng, 1–100 ký tự | BR-02 |
  | `cropId` | Có | Loại cây `ACTIVE` | BR-02 |
  | `plantedDate` | Không | `yyyy-MM-dd`, không sau hôm nay ✎ | BR-02 |
  | `note` | Không | Tối đa 255 ký tự | BR-02 (vị trí hoặc ghi chú, DC-10) |
  | `avatar` | Không | JPG/PNG ≤ 10 MB, lưu thư mục `plants` (TD-01, TD-14) | BR-02 |

- **Xử lý:** tạo cây `NOT_DIAGNOSED` (BR-03). Đợt 2: kèm `suggestions` tưới, bón (BR-18).
- **Response 201:** `{ plant: PlantDetail, suggestions: ReminderSuggestion[] }`. Giao diện báo "Đã thêm cây".
- **Lỗi:**

  | HTTP | `code` | Khi nào | Câu |
  |---|---|---|---|
  | 400 | `VALIDATION_ERROR` | Thiếu tên gọi hoặc loại cây (C4 6.1) | "Dữ liệu không hợp lệ" + `errors` trường `name`/`cropId` với câu "Vui lòng nhập tên gọi và chọn loại cây" |
  | 400 | `VALIDATION_ERROR` | `plantedDate` sai định dạng hoặc sau hôm nay; `name`, `note` quá dài | `errors` từng trường; câu ✎ ở OQ-51 |
  | 400 | `CROP_NOT_FOUND` | Loại cây không có hoặc đang ẩn | "Vui lòng nhập tên gọi và chọn loại cây", trường `cropId` |
  | 400 | `INVALID_IMAGE_TYPE` / `IMAGE_TOO_LARGE` | Ảnh sai | "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" |

### P3. GET `/plants/:id`

- **Response 200:** `PlantDetail`. **Lỗi:** 404 `PLANT_NOT_FOUND`.

### P4. PATCH `/plants/:id`

- **Request** (`multipart/form-data`): các trường như P2, đều tuỳ chọn; gửi chuỗi rỗng cho `plantedDate`, `note` để xoá giá trị. Có `avatar` mới thì thay ảnh cũ (xoá ảnh cũ trong kho sau khi lưu).
- **Đổi loại cây:** được phép; không đổi tình trạng, lượt chẩn đoán hay lịch nhắc đã có.
- **Response 200:** `PlantDetail`. Giao diện báo "Đã cập nhật" (BR-10).
- **Lỗi:** như P2, thêm 404.

### P5. DELETE `/plants/:id`

- **Xử lý (BR-11):** một giao dịch xoá `plants`. Khoá ngoại tự làm phần còn lại: `plant_logs`, `reminders` xoá theo (CASCADE); `diagnoses.plant_id` thành `NULL`; `notifications.reminder_id` thành `NULL`. Sau khi giao dịch xong, xoá ảnh đại diện và ảnh ghi chú trong kho (lỗi xoá ảnh chỉ ghi log).
- **Response:** `204`. Giao diện báo "Đã xoá cây".

### P6. POST `/plants/:id/status`

- **Body:** `{ "status": "TREATING" | "RECOVERED" }`.
- **Được chuyển (OQ-47 ✎):** `TREATING` từ `DISEASED`; `RECOVERED` từ `DISEASED`, `TREATING`, `HEALTHY`. Trường hợp khác trả 400 `PLANT_STATUS_NOT_ALLOWED` ✎.
- **Xử lý (BR-08, BR-16):** một giao dịch: đổi `health_status`, thêm `plant_logs` `STATUS_CHANGE` với `status_after`, `action_date` hôm nay. Chuyển `RECOVERED` thì tắt mọi nhắc `RECHECK` đang bật của cây (`is_active = false`).
- **Response 200:** `PlantDetail`.

### P7. POST `/plants/:id/logs`

- **Request** (`multipart/form-data`): `content` bắt buộc, cắt khoảng trắng, 1–1000 ký tự ✎; `actionDate` `yyyy-MM-dd` tuỳ chọn, mặc định hôm nay, không sau hôm nay ✎; `image` JPG/PNG ≤ 10 MB tuỳ chọn, thư mục `plant-logs`.
- **Xử lý (BR-09):** thêm `plant_logs` `CARE_NOTE`. Không đổi tình trạng.
- **Response 201:** mục `logs` vừa tạo.
- **Lỗi:** 400 `VALIDATION_ERROR` trường `content` với câu ✎ "Vui lòng nhập nội dung ghi chú"; ảnh sai như P2; 404.
- Sửa, xoá ghi chú: không có trong specs, không làm.

### A1. POST `/diagnoses/:id/plant`

- **Body:** `{ "plantId": 4 }`.
- **Điều kiện:** lượt `COMPLETED`, chưa xoá, của người gọi, **chưa gắn cây** ("với lần tra cứu chưa gắn cây", C4 UC03 7a); cây của người gọi (BR-23).
- **Khác loại cây (BR-23):** backend vẫn gắn. Giao diện cảnh báo **trước khi** gửi (OQ-50 ✎).
- **Xử lý:** một giao dịch: đặt `diagnoses.plant_id`, áp kết quả vào cây theo bảng ở "Quy ước chung".
- **Response 200 `PlantLink`:** `{ "plant": { "id", "name", "healthStatus" }, "suggestRecovered": false, "suggestions": [] }`. Giao diện báo "Đã lưu vào hồ sơ cây" (BR-22).
- **Lỗi:** 404 `DIAGNOSIS_NOT_FOUND`; 404 `PLANT_NOT_FOUND`; 409 `DIAGNOSIS_ALREADY_LINKED` ✎ "Lần tra cứu này đã được lưu vào hồ sơ cây".

### A2. POST `/diagnoses/:id/new-plant`

- **Request:** như P2. Giao diện điền sẵn loại cây của lượt (C4 bước 14).
- **Xử lý (BR-27):** một giao dịch: tạo cây với tình trạng theo kết quả (`DISEASE` → `DISEASED`, `HEALTHY` → `HEALTHY`, `UNCERTAIN` → `NOT_DIAGNOSED`), rồi gắn lượt. Điều kiện về lượt như A1.
- **Response 201 `PlantLink`.** Lỗi: như P2 và A1.

### D1. POST `/diagnoses` (bổ sung)

- **Thêm trường** multipart `plantId` (tuỳ chọn, số nguyên dương). Có `plantId` thì:
  - Cây phải của người gọi (không thì 404 `PLANT_NOT_FOUND`, chưa ghi gì) và `cropId` phải bằng loại cây của cây (không thì 400 `VALIDATION_ERROR` trường `cropId`). Giao diện khoá chip loại cây (BR-24).
  - `diagnoses.plant_id` đặt ngay khi INSERT `PROCESSING`. Giao dịch hoàn tất (bước 6 của D1) áp thêm kết quả vào cây.
- **Response:** `DiagnosisResult` thêm trường `plantLink: PlantLink | null` (chỉ ở D1, khi có `plantId`). D2 không có trường này.

---

## Đợt 2 — Nhắc việc và thông báo

### R1. POST `/plants/:id/reminders/recheck`

- **Body:** `{ "days": 3 | 7 | 14 }` (BR-14).
- **Xử lý:** tạo `reminders` `RECHECK`, `source = USER`, `repeat_days = NULL`, `next_remind_at = now() + days`, `title` theo `template_my_plants.md`. Không chặn trùng với nhắc của người dùng.
- **Response 201:** mục `reminders`. Giao diện báo ✎ "Đã đặt nhắc kiểm tra lại".

### R2. POST `/plants/:id/reminders/suggested`

- **Body:** `{ "types": ["WATERING", "FERTILIZING", "RECHECK"] }` (1–3 loại không trùng).
- **Xử lý (BR-16, BR-18, diagnosis BR-26):** backend **tự tính lại** gợi ý cho cây tại thời điểm gọi và chỉ tạo loại vừa được gợi ý vừa được chọn, `source = SYSTEM`:
  - `WATERING`, `FERTILIZING`: lặp `repeat_days` = chu kỳ của loại cây, lần đầu `now() + repeat_days`.
  - `RECHECK`: một lần sau `recheck_days` của bệnh đang mắc.
  - Đã có nhắc cùng loại đang bật thì bỏ qua (BR-16).
- **Response 201:** các mục `reminders` đã tạo. Giao diện báo ✎ "Đã tạo lịch nhắc".

### N1. GET `/notifications`

- **Query:** `page` (mặc định 1), `pageSize` (mặc định 20, tối đa 50).
- **Response 200:** `{ items, page, pageSize, total, unreadCount }`. Mỗi mục: `{ id, title, content, isRead, createdAt, plantId }`. `plantId` lấy qua `reminder_id` → `reminders.plant_id`; `null` khi không gắn lịch nhắc (vd thông báo nhãn lạ cho ADMIN) hoặc lịch nhắc đã bị xoá. Mới nhất trước (BR-19).

### N2. GET `/notifications/unread-count`

- **Response 200:** `{ "count": 3 }`.

### N3. POST `/notifications/:id/read` · N4. POST `/notifications/read-all`

- N3: đặt `is_read = true` cho thông báo của mình; đã đọc rồi thì không lỗi. Không có thì 404 `NOTIFICATION_NOT_FOUND` "Không tìm thấy dữ liệu". N4: mọi thông báo chưa đọc của mình. Cả hai trả `204`.
- Không có xoá thông báo (BR-17).

### J1. Job gửi nhắc (TD-28)

- Chạy mỗi `REMINDER_JOB_INTERVAL_MINUTES` phút (mặc định 5); `REMINDER_JOB_ENABLED=false` để tắt. Cài bằng `setInterval` đăng ký ở `SchedulerRegistry` của `@nestjs/schedule`, không thêm thư viện `cron` (24/11, thay cho khoá `REMINDER_CRON` dự kiến). Mỗi lần: lấy các `reminders` `is_active` và `next_remind_at <= now()` (chỉ mục `ix_reminders_due`), khoá dòng `FOR UPDATE SKIP LOCKED`, mỗi lần tối đa 100 dòng.
- Với mỗi nhắc, trong một giao dịch: tạo một `notifications` cho chủ cây (`reminder_id` = nhắc, nội dung theo `template_my_plants.md`), đặt `last_sent_at = now()`. Nhắc lặp: cộng `repeat_days` cho tới khi `next_remind_at > now()` (máy tắt lâu thì chỉ gửi **một** thông báo, không dồn). Nhắc một lần: `is_active = false` (BR-15).
- Chỉ thông báo trong ứng dụng (OQ-09).

## Quyết định đã áp (chốt 23/11)

| Mã | Nội dung | Đề xuất |
|---|---|---|
| OQ-45 | Danh sách cây: thứ tự trong nhóm, có phân trang không | `DISEASED` → `TREATING` → còn lại; trong nhóm theo ngày chẩn đoán gần nhất rồi ngày tạo, mới trước. **Phân trang 10 cây** (Dương sửa đề xuất) |
| OQ-46 | "Bệnh đang mắc" khi cây đã khoẻ hoặc đã khỏi | Chỉ hiện khi tình trạng là "Đang có bệnh" hoặc "Đang điều trị" |
| OQ-47 | "Cập nhật tình trạng" được chuyển từ đâu sang đâu | "Đang điều trị" từ "Đang có bệnh"; "Đã khỏi" từ "Đang có bệnh", "Đang điều trị", "Khoẻ mạnh" (để xác nhận gợi ý "Đã khỏi" sau lần chẩn đoán khoẻ). Cây "Chưa chẩn đoán", "Đã khỏi" không có nút |
| OQ-48 | Gắn một lượt cũ từ lịch sử vào cây có đổi tình trạng không; gợi ý "Đã khỏi" làm thế nào | Chỉ đổi khi lượt mới hơn mọi lượt khác của cây và mới hơn lần cập nhật tình trạng gần nhất. Kết quả khoẻ áp vào cây đang bệnh hoặc đang điều trị: cây thành "Khoẻ mạnh", giao diện hỏi "Đã khỏi", đồng ý thì chuyển "Đã khỏi" |
| OQ-49 | Lịch nhắc có hiện ở chi tiết cây, có sửa, xoá không (NOTI-04 hoãn) | Hiện danh sách nhắc đang bật, chỉ xem; không sửa, xoá, bật tắt |
| OQ-50 | Cảnh báo khác loại cây khi gắn lượt vào cây (diagnosis BR-23) | Cảnh báo ngay trong hộp chọn cây; vẫn cho lưu |
| OQ-51 | Câu chữ Claude soạn cho `my_plants` và nội dung thông báo nhắc | Danh sách ở `design/screens/my_plants.md` và `template_my_plants.md` |
| OQ-52 | Dữ liệu dev chưa có chu kỳ tưới, bón của loại cây và `recheck_days` của bệnh, nên đợt 2 không có gợi ý nào để thử | Claude soạn giá trị mẫu trong seed dev, chỉ điền khi cột đang trống (như OQ-36, OQ-41) |
| TD-28 | Tần suất job nhắc việc (specs mục 6: phải hỏi) và cách gửi | Mỗi 5 phút, cấu hình `REMINDER_JOB_INTERVAL_MINUTES` (code 24/11, thay cho `REMINDER_CRON` để không thêm thư viện `cron`); `FOR UPDATE SKIP LOCKED`; nhắc lặp quá hạn nhiều chu kỳ chỉ gửi một thông báo |
| TD-29 | P1, P3 cần đọc `diagnoses` (ngày chẩn đoán gần nhất, bệnh đang mắc, dòng thời gian) trong khi `plants` không được import `diagnosis` (TD-25) | **A (khuyến nghị):** ngoại lệ thứ ba của ranh giới mô-đun như TD-24: `plants` có một truy vấn **chỉ đọc** `diagnoses` qua `DataSource`. **B:** giao diện gọi thêm `GET /diagnoses?plantId=` và một endpoint tóm tắt của `diagnosis`, rồi tự ghép |
| TD-30 | Feature lớn (UC04 + NOTI + phần hoãn của `diagnosis`, `history`) | Code hai đợt như bảng đầu file, mỗi đợt duyệt kế hoạch riêng |

## Ghi chú cài đặt đợt 1 (23/11)

| Mục | Cách làm |
|---|---|
| TD-29 | `plants/plant-reads.query.ts` (`PlantReadsQuery`): danh sách cây kèm ngày chẩn đoán gần nhất, lượt của cây, và kiểm tra "lượt mới nhất" (OQ-48). Chỉ đọc, qua `DataSource` |
| Áp kết quả vào cây | `PlantsService.applyDiagnosis(manager, …)` khoá dòng cây (`FOR UPDATE`) trong giao dịch của bên gọi (A1, D1) |
| A1, A2 | `diagnosis/plant-link/` (`PlantLinkController`, `PlantLinkService`). Khoá dòng lượt chẩn đoán trong giao dịch để hai yêu cầu cùng lúc không cùng gắn. A2 kiểm tra lượt và loại cây trước khi lưu ảnh; lỗi giữa chừng thì xoá ảnh |
| D1 có `plantId` | Cây bị xoá trong lúc chờ AI (`plant_id` đã thành NULL) thì bỏ qua phần gắn cây, lượt vẫn `COMPLETED`, `plantLink = null` |
| Ngày không sau hôm nay | Backend cho lệch một ngày so với ngày UTC của máy chủ (người dùng ở UTC+7); giao diện chặn chính xác bằng `max` = hôm nay theo giờ máy |
| Câu lỗi trường | Tên gọi, nội dung ghi chú dùng một ràng buộc chọn đúng câu (thiếu hay quá dài), tránh hai câu cùng lúc |

## Ghi chú cài đặt đợt 2 (24/11)

| Mục | Cách làm |
|---|---|
| Gợi ý `RECHECK` khi gắn lượt (A1, D1) | Chỉ khi lượt bệnh **được áp** vào cây, tức là lượt mới nhất của cây (OQ-48). Gắn lượt bệnh cũ từ lịch sử thì không gợi ý |
| R2 tính lại gợi ý | Khoá dòng cây trong giao dịch, nên bấm hai lần không tạo trùng. "Kiểm tra lại" lấy `recheck_days` của bệnh đang mắc (cây "Đang có bệnh" hoặc "Đang điều trị"); cây khác thì không tạo |
| J1 | Mỗi vòng lấy **một** nhắc đến hạn `FOR UPDATE OF r SKIP LOCKED` trong một giao dịch, lặp tối đa 100 lần. Lần chạy trước chưa xong thì lần sau bỏ qua |
| N1 → N4 | N1 `pageSize` mặc định 20, tối đa 50. N3 đánh dấu thông báo đã đọc rồi vẫn trả 204 |
| Giao diện | Chuông chỉ gọi API khi có phiên (trang `/dev/*` dùng chung khung trang mà không đăng nhập). Sau khi gắn lượt hoặc tạo cây: hỏi "Cây đã khỏi bệnh?" trước, rồi "Gợi ý lịch nhắc" |

## Nợ kỹ thuật

| # | Nội dung | Lý do để sau |
|---|---|---|
| N1 | Dòng thời gian của một cây không phân trang | Một cây có ít lượt và ghi chú; làm khi số liệu thật cho thấy cần |
| N2 | Chuông thông báo cập nhật số chưa đọc bằng cách hỏi lại định kỳ (OQ-51 màn hình), không đẩy thời gian thực | OQ-09: chỉ thông báo trong ứng dụng; đủ cho đồ án |

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 23/11/2026 | 0.1 | Sinh từ specs my_plants v0.2, diagnosis v0.3, history v0.3 (build-first) | Claude |
| 23/11/2026 | 0.2 | Dương duyệt: chốt OQ-45 (sửa: phân trang 10 cây), OQ-46 → OQ-52, TD-28, TD-29 (A), TD-30. Chuyển REVIEWED | Claude theo quyết định của Dương |
| 23/11/2026 | 0.3 | Code xong đợt 1: thêm `allowedStatusChanges` vào `PlantDetail`, mục "Ghi chú cài đặt đợt 1" | Claude |
| 24/11/2026 | 0.4 | Code xong đợt 2: job dùng `REMINDER_JOB_INTERVAL_MINUTES`, `REMINDER_JOB_ENABLED` thay cho `REMINDER_CRON`; mục "Ghi chú cài đặt đợt 2" | Claude |

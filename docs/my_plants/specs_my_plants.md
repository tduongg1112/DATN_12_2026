# Specs — Quản lý cây trồng của tôi (`my_plants`)

> **Trạng thái:** VERIFIED (build-first 20/11, review lại ở giai đoạn test). Các điểm mở được Dương chốt ngày 20/11 (`docs/_shared/open_questions.md`). Chưa chạy `/cross-check specs`.
> **UC:** UC04 · **Mã chức năng:** PLANT-01..04 (Must), PLANT-05 (Should), PLANT-06 (Could) · NOTI-01..03 (Should), NOTI-04 (Could). Phần NOTI gắn vào đây theo OQ-16 (chốt 20/11: thêm luồng "Xem thông báo" vào UC04).
> **Nguồn:** C4 = Chương 4 v0.2 Bảng 4.7, 4.8 · ERD = Phân tích Class & CSDL 3.2, 4.6–4.9, 6.5 · FL = Function List v0.2

## 1. Context
- Người dùng tạo và quản lý hồ sơ các cây mình đang trồng, theo dõi sức khoẻ từng cây qua các lần chẩn đoán, cập nhật tình trạng điều trị và ghi chú chăm sóc. **Một hồ sơ có thể là một cây, hoặc một khu trồng cùng loại.** *(C4 Bảng 4.7)*
- Vai trò: `USER`, và `ADMIN` vì ADMIN kế thừa chức năng USER (OQ-22). Mỗi người chỉ thao tác trên cây của mình.
- Phụ thuộc: `auth`, `catalog` (loại cây), `diagnosis` (dòng thời gian, chẩn đoán lại).

## 2. User stories
| Mã | User story | Nguồn | Ưu tiên |
|---|---|---|---|
| US-01 | Là người dùng, tôi muốn xem danh sách cây dạng thẻ kèm tình trạng sức khoẻ, cây đang có bệnh xếp lên đầu | C4 bước 1–2 | PLANT-02 Must |
| US-02 | Là người dùng, tôi muốn thêm cây: tên gọi, loại cây, ngày trồng, ảnh đại diện, vị trí hoặc ghi chú | C4 bước 3–6 | PLANT-01 Must |
| US-03 | Là người dùng, tôi muốn xem chi tiết cây: thông tin chung, tình trạng, bệnh đang mắc kèm hướng xử lý, dòng thời gian chẩn đoán, ghi chú chăm sóc | C4 bước 7–8 | PLANT-03 Must |
| US-04 | Là người dùng, tôi muốn chẩn đoán lại một cây | C4 9a | PLANT-03 Must |
| US-05 | Là người dùng, tôi muốn cập nhật tình trạng điều trị: "Đang điều trị" hoặc "Đã khỏi" | C4 9b–10b | PLANT-05 Should |
| US-06 | Là người dùng, tôi muốn thêm ghi chú chăm sóc: nội dung, ngày thực hiện, ảnh tuỳ chọn | C4 9c–10c | PLANT-06 Could |
| US-07 | Là người dùng, tôi muốn sửa thông tin cây | C4 9d–10d | PLANT-04 Must |
| US-08 | Là người dùng, tôi muốn xoá cây | C4 9e–11e | PLANT-04 Must |
| US-09 | Là người dùng, tôi muốn đặt nhắc kiểm tra lại sau 3, 7 hoặc 14 ngày | C4 9f–10f; OQ-09 | NOTI Should |
| US-10 | Là người dùng, tôi muốn xem thông báo và đánh dấu đã đọc | ERD C1; FL NOTI-03; OQ-16 | NOTI-03 Should |
| US-11 | Là người dùng, tôi muốn hệ thống gợi ý lịch nhắc tưới, bón khi tạo cây và nhắc kiểm tra lại khi cây có bệnh; tôi xác nhận thì mới tạo | OQ-15; ERD 4.8 | NOTI Should |

## 3. Business rules

**Hồ sơ cây**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Danh sách dạng thẻ: ảnh đại diện, tên gọi, loại cây, tình trạng sức khoẻ (nhãn màu), ngày chẩn đoán gần nhất. Cây đang có bệnh xếp lên đầu | C4 bước 2 |
| BR-02 | Thêm cây: form gồm tên gọi, loại cây, ngày trồng, ảnh đại diện, vị trí hoặc ghi chú. **Bắt buộc tên gọi và loại cây.** Thiếu thì đánh dấu trường và thông báo "Vui lòng nhập tên gọi và chọn loại cây" | C4 bước 4–6, 6.1 |
| BR-03 | Thêm thủ công: tạo hồ sơ với tình trạng "Chưa chẩn đoán" (`NOT_DIAGNOSED`) và thông báo "Đã thêm cây". Tạo từ kết quả chẩn đoán: tình trạng theo kết quả | C4 bước 6; ERD 4.6 |
| BR-04 | **Tình trạng sức khoẻ** theo Bảng 4.8: <br>• Chưa chẩn đoán: cây mới thêm thủ công <br>• Khoẻ mạnh: chẩn đoán gần nhất cho "Cây khoẻ mạnh" <br>• Đang có bệnh: chẩn đoán gần nhất cho "Phát hiện bệnh" <br>• Đang điều trị: người dùng cập nhật <br>• Đã khỏi: người dùng cập nhật, **hoặc** cây đang có bệnh được chẩn đoán lại ra "Cây khoẻ mạnh" (hệ thống gợi ý, người dùng xác nhận) <br>Kết quả "Chưa xác định" không làm đổi tình trạng. Xoá mềm hoặc hoàn tác một lượt chẩn đoán cũng không làm đổi tình trạng | C4 Bảng 4.8; OQ-24 |
| BR-05 | Chi tiết cây: thông tin chung, tình trạng hiện tại, bệnh đang mắc kèm hướng xử lý, dòng thời gian các lần chẩn đoán (ảnh, kết quả, ngày) và ghi chú chăm sóc, nút "Chẩn đoán lại" | C4 bước 8 |
| BR-06 | "Bệnh đang mắc" là lượt `DISEASE` gần nhất của cây. "Ngày chẩn đoán gần nhất" là `MAX(created_at)` của các lượt còn hiệu lực. Cả hai đều **không lưu** thành cột | ERD 3.2, D8 |
| BR-07 | "Chẩn đoán lại": mở luồng UC02 với loại cây chọn sẵn. Kết quả tự gắn vào cây và xuất hiện trên dòng thời gian | C4 9a |
| BR-08 | "Cập nhật tình trạng": chọn "Đang điều trị" hoặc "Đã khỏi". Hệ thống cập nhật nhãn tình trạng và ghi mốc thay đổi lên dòng thời gian (một `plant_logs` loại `STATUS_CHANGE` **trong cùng giao dịch**) | C4 9b–10b; ERD 6.5 |
| BR-09 | "Thêm ghi chú": nội dung (ví dụ "Phun thuốc lần 1"), ngày thực hiện, ảnh tuỳ chọn. Lưu thành `plant_logs` loại `CARE_NOTE` (nội dung bắt buộc; ngày mặc định là hôm nay) và hiển thị trên dòng thời gian | C4 9c–10c; ERD 4.7 |
| BR-10 | "Chỉnh sửa": cập nhật thông tin và nhấn "Lưu". Thông báo "Đã cập nhật" | C4 9d–10d |
| BR-11 | "Xoá cây": hộp thoại xác nhận nêu rõ các lần chẩn đoán của cây **vẫn được giữ** trong lịch sử tra cứu. Xác nhận thì xoá hồ sơ cây; nhật ký và lịch nhắc bị xoá theo; lượt chẩn đoán được gỡ liên kết (`plant_id = NULL`); thông báo đã gửi vẫn còn (`reminder_id = NULL`). Hiển thị "Đã xoá cây" | C4 9e–11e; ERD 4.6, 6.3 |
| BR-12 | Chưa có cây nào: "Bạn chưa thêm cây nào" cùng hai lựa chọn "Thêm cây" và "Chẩn đoán ngay" | C4 2.1 |
| BR-13 | Chỉ đọc và sửa cây có `user_id` của chính mình | ERD 6.5 |

**Nhắc việc và thông báo (OQ-09, OQ-15, OQ-16 đã chốt 20/11)**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-14 | "Nhắc tôi kiểm tra lại": chọn sau 3, 7 hoặc 14 ngày. Tạo `reminders` với `source = USER`, `reminder_type = RECHECK`, nhắc một lần | C4 9f; ERD 4.8 |
| BR-15 | Đến hạn thì hệ thống gửi thông báo nhắc người dùng chụp lại cây để theo dõi tiến triển. Job định kỳ: nhắc có `is_active` và `next_remind_at <= now()` thì tạo `notifications` và đặt `last_sent_at`. Nhắc lặp thì cộng `repeat_days`; nhắc một lần thì `is_active = false`. **Kênh: chỉ thông báo trong ứng dụng**, không email, không đẩy, không khung giờ gửi | C4 10f; ERD 4.8; OQ-09 |
| BR-16 | Cây chuyển `RECOVERED` thì tắt các nhắc `RECHECK` của cây. Nhắc `SYSTEM` không tạo trùng khi cây đã có nhắc cùng loại đang bật | ERD 4.8, 6.5 |
| BR-17 | Thông báo trong ứng dụng có `is_read`. Không có chức năng xoá thông báo | ERD 4.9 |
| BR-18 | Gợi ý nhắc tưới, bón: khi tạo cây (thủ công hoặc từ kết quả chẩn đoán), nếu loại cây có `watering_interval_days` hoặc `fertilizing_interval_days` thì gợi ý nhắc `WATERING` hoặc `FERTILIZING` lặp với `repeat_days` bằng chu kỳ đó. Người dùng xác nhận thì mới tạo, với `source = SYSTEM`. Gợi ý nhắc kiểm tra lại theo bệnh: `specs_diagnosis.md` BR-26 | OQ-15; DC-02; ERD 4.8 |
| BR-19 | Xem thông báo: biểu tượng chuông hiển thị số thông báo chưa đọc. Mở ra thấy danh sách thông báo của chính mình, mới nhất ở trên. Có thể đánh dấu đã đọc. Bấm vào thông báo gắn với lịch nhắc thì mở trang chi tiết cây tương ứng | OQ-16; FL NOTI-03; ERD 4.9 |

Ghi chú: Function List v0.2 còn có: gửi đẩy qua FCM trong khung 6:00–20:00 (NOTI-02), bật/tắt nhắc cho từng cây (NOTI-04, Could), và quy tắc không gửi nhắc cho cây đã khỏi hoặc đã bị xoá (NOTI-02). Theo OQ-09 (chốt 20/11): không đẩy FCM, không khung giờ, NOTI-04 hoãn. Cây bị xoá thì nhắc bị xoá theo (BR-11), cây đã khỏi thì tắt nhắc `RECHECK` (BR-16).

## 4. Data requirements
- Bảng: `plants`, `plant_logs`, `reminders`, `notifications`. Đọc thêm: `diagnoses` + `diagnosis_predictions` (dòng thời gian), `crops`, `diseases`.
- Thứ tự dòng thời gian: gộp lượt chẩn đoán còn hiệu lực và `plant_logs`, sắp theo thời gian. *(C4 bước 8; ERD 4.7)*
- Đã chốt 20/11: `plant_logs.plant_id` NOT NULL, CASCADE (DC-07); giữ `status_after`, `image_url` (DC-08) và `planted_date` (DC-09); cột vị trí hoặc ghi chú tên là `plants.note` (DC-10).

## 5. UI/UX requirements
- Danh sách: khuôn "Danh sách", thành phần "Thẻ cây". Chi tiết cây: khuôn "Chi tiết". Form thêm/sửa: khuôn "Biểu mẫu". *(design/05, 06)*
- Nhãn tình trạng có **cả màu lẫn chữ**, theo `design/01-color.md` mục "Trạng thái sức khoẻ cây". Chữ dùng đúng tên ở Bảng 4.8.
- Hộp thoại xác nhận khi xoá (BR-11).

## 6. Technical requirements
- Job nhắc việc dùng `@nestjs/schedule`. Tần suất chạy chưa có trong tài liệu, phải hỏi khi làm.
- Kênh gửi thông báo: chỉ trong ứng dụng (OQ-09). Lưu ảnh đại diện cây và ảnh ghi chú: AWS S3 qua `StorageService` (TD-01).
- Giao dịch: BR-08, BR-11.

## 7. Điểm chưa chốt và quyết định (build-first 20/11)
| Mã | Quyết định / trạng thái | Ảnh hưởng |
|---|---|---|
| OQ-09 | Đã chốt: giữ nhắc, chỉ thông báo trong ứng dụng, không khung giờ; NOTI-04 hoãn | BR-14 → BR-17 |
| OQ-15 | Đã chốt: gợi ý `RECHECK` và tưới, bón; người dùng xác nhận | US-11, BR-16, BR-18 |
| OQ-16 | Đã chốt: thêm luồng xem thông báo vào UC04 | US-10, BR-19 |
| OQ-22 | Đã chốt: ADMIN dùng được "Cây trồng của tôi" | Mục 1 |
| OQ-24 | Đã chốt: xoá mềm lượt chẩn đoán không đổi tình trạng cây | BR-04 |
| DC-07 → DC-10 | Đã chốt, xem mục 4 | Mục 4 |
| TD-01 | Đã chốt: AWS S3 | US-02, US-06 |

Còn mở: tần suất chạy job nhắc việc (mục 6) chưa có trong tài liệu, hỏi Dương khi làm.

Ghi chú ưu tiên: FL xếp PLANT-06 (ghi chú chăm sóc) là Could, nhưng C4 đưa thành luồng 9c của UC04.

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn, đủ luồng thay thế và ngoại lệ, câu chữ đúng nguyên văn
- [ ] Tester: mỗi chuyển trạng thái trong Bảng 4.8 có điều kiện kiểm thử được
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md` (sau khi chốt DC-07 → DC-10)
- [ ] `/cross-check my_plants specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 20/11/2026 | 0.1 | Tách từ C4 v0.2, ERD-doc, FL v0.2 khi dựng workflow | Claude (chờ Dương duyệt) |
| 20/11/2026 | 0.2 | Build-first: áp OQ-09, 15, 16, 22, 24, DC-07 → DC-10, TD-01. Thêm US-11, BR-18, BR-19; sửa BR-04, BR-15, BR-16. Chuyển VERIFIED | Claude theo quyết định của Dương |

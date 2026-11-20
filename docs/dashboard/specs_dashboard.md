# Specs — Xem dashboard & báo cáo (`dashboard`)

> **Trạng thái:** VERIFIED (build-first 20/11, review lại ở giai đoạn test). Các điểm mở được Dương chốt ngày 20/11 (`docs/_shared/open_questions.md`). Chưa chạy `/cross-check specs`. **Cần nhóm AI duyệt** nhóm chỉ số "Chất lượng mô hình" [AI].
> **UC:** UC07 · **Mã chức năng:** ADM-03 (Must) · ADM-04 (Should) · ADM-06 (Could)
> **Nguồn:** C4 = Chương 4 v0.2 Bảng 4.11, 4.12 · ERD = Phân tích Class & CSDL D5, 6.4 · FL = Function List v0.2

## 1. Context
- Quản trị viên theo dõi tình hình sử dụng hệ thống, hoạt động chẩn đoán và chất lượng mô hình AI qua các chỉ số và biểu đồ; lọc theo khoảng thời gian và xuất báo cáo. *(C4 Bảng 4.11)*
- Danh sách lượt "Chưa xác định" được dùng để tổng hợp, gửi nhóm AI cải thiện mô hình. *(C4 bước 6)* Phần lượt "bị đánh giá Sai" bỏ ở bản build này vì không có chức năng đánh giá (OQ-14).
- Vai trò: `ADMIN`. Dashboard là trang mặc định sau khi quản trị viên đăng nhập.
- Phụ thuộc: dữ liệu của `auth`, `diagnosis`, `catalog`.

## 2. User stories
| Mã | User story | Nguồn | Ưu tiên |
|---|---|---|---|
| US-01 | Là quản trị viên, tôi muốn xem dashboard 30 ngày gần nhất gồm ba nhóm chỉ số: người dùng, hoạt động chẩn đoán, chất lượng mô hình | C4 bước 1–2 | ADM-03 Must, ADM-04 Should |
| US-02 | Là quản trị viên, tôi muốn chọn khoảng thời gian 7 ngày, 30 ngày, 90 ngày hoặc tuỳ chọn | C4 bước 3–4 | ADM-03 Must |
| US-03 | Là quản trị viên, tôi muốn xem chi tiết một chỉ số, ví dụ danh sách lượt "Chưa xác định" | C4 bước 5–6; OQ-14 | ADM-04 Should |
| US-04 | Là quản trị viên, tôi muốn xuất báo cáo | C4 5a–6a | **Hoãn** (OQ-11) |

## 3. Business rules
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Mặc định hiển thị 30 ngày gần nhất. Đổi khoảng thời gian thì tính lại mọi chỉ số và biểu đồ | C4 bước 2–4 |
| BR-02 | Các chỉ số theo **Bảng 4.12**, xem bảng bên dưới | C4 Bảng 4.12 |
| BR-03 | Chi tiết chỉ số: danh sách gồm ảnh, kết quả, độ tin cậy, loại cây, thời gian | C4 bước 6 |
| BR-04 | Thời gian phản hồi = `completed_at − created_at` (khác với `inference_ms`, vốn chỉ là thời gian chạy mô hình) | ERD D5 |
| BR-05 | Lượt chẩn đoán đã bị người dùng xoá mềm **vẫn được tính** trong thống kê tổng hợp | C4 4.5; FL HIST-03 |
| BR-06 | Không có dữ liệu trong khoảng đã chọn: hiển thị "Chưa có dữ liệu trong khoảng thời gian này" thay cho biểu đồ | C4 4.1 |
| BR-07 | *Bỏ ở bản build này.* (Lượt của người dùng chưa đồng ý chia sẻ dữ liệu chỉ hiển thị kết quả, không hiển thị ảnh. Không làm vì đã bỏ `allow_data_sharing`) | C4 6.1; OQ-12, DC-01 |
| BR-08 | Mọi chỉ số chỉ đếm lượt `status = COMPLETED`. Lượt `FAILED`, `PROCESSING` không tính | OQ-23 |
| BR-09 | Loại cây của một lượt là `diagnoses.crop_id`; NULL thì lấy theo `crop_id` của nhãn hạng 1 | OQ-05 |

**Bảng 4.12. Các chỉ số trên dashboard**

| Nhóm | Chỉ số | Ý nghĩa / cách tính | Hiển thị | Ghi chú |
|---|---|---|---|---|
| Người dùng | Tổng số người dùng | Số tài khoản Người dùng đang hoạt động | Thẻ số | **Hoãn** ở bản build này (OQ-25) |
| Người dùng | Người dùng mới | Số tài khoản tạo mới trong kỳ, so với kỳ trước | Thẻ số, % tăng/giảm | |
| Người dùng | Người dùng hoạt động | Số người dùng có ít nhất một lượt chẩn đoán trong kỳ | Thẻ số | |
| Hoạt động chẩn đoán | Số lượt chẩn đoán | Tổng trong kỳ và theo từng ngày | Thẻ số, biểu đồ đường | |
| Hoạt động chẩn đoán | Phân bố theo loại cây | Số lượt của từng loại cây | Biểu đồ cột | Loại cây theo BR-09 |
| Hoạt động chẩn đoán | Bệnh phát hiện nhiều nhất | 5 bệnh có số lượt "Phát hiện bệnh" cao nhất | Bảng xếp hạng | |
| Hoạt động chẩn đoán | Tỷ lệ dạng kết quả | Phát hiện bệnh / Cây khoẻ mạnh / Chưa xác định | Biểu đồ tròn | |
| Chất lượng mô hình [AI] | Độ tin cậy trung bình | Trung bình độ tin cậy các lượt trong kỳ | Thẻ số | |
| Chất lượng mô hình [AI] | Tỷ lệ "Chưa xác định" | Tỷ lệ lượt dưới ngưỡng; tăng bất thường cho thấy ảnh thực tế khác dữ liệu huấn luyện | Thẻ số | |
| Chất lượng mô hình [AI] | Tỷ lệ đánh giá đúng | Số "Đúng" / tổng số (Đúng + Sai), theo từng loại cây | Thẻ số, biểu đồ cột | **Bỏ** ở bản build này (OQ-14) |
| Chất lượng mô hình [AI] | Thời gian phản hồi trung bình | Từ khi gửi ảnh tới khi có kết quả (BR-04) | Thẻ số | |
| Chất lượng mô hình [AI] | Phiên bản mô hình | Phiên bản mô hình AI đang sử dụng | Nhãn | |
| Nội dung | Số bệnh đang công khai | Số bệnh `PUBLISHED` theo từng loại cây | Bảng nhỏ | |

> FL ADM-03 có thêm chỉ số "số cây đang có bệnh", Bảng 4.12 không có. Specs theo Bảng 4.12.

## 4. Data requirements
- Đọc: `users`, `diagnoses` (gồm cả lượt đã xoá mềm), `diagnosis_predictions`, `model_labels`, `diseases`, `crops`.
- Chỉ mục: `ix_diagnoses_created`, `ix_predictions_label`.
- Chỉ đếm lượt `COMPLETED` (BR-08, OQ-23).

## 5. UI/UX requirements
- Khuôn "Quản trị": dock dọc, bento số liệu, bảng. Thiết kế cho desktop trước. *(design/06)*
- Biểu đồ cột có sẵn trong design/05. Biểu đồ đường và biểu đồ tròn chưa có trong `05-components.md`, phải tạo thành phần mới theo 6 câu hỏi ở `design/00`.
- Trạng thái rỗng theo BR-06.

## 6. Technical requirements
- Chỉ `ADMIN` truy cập.
- Truy vấn tổng hợp theo khoảng thời gian, dùng chỉ mục `created_at`.
- Mô-đun `dashboard` riêng (mô-đun thứ 5, không có bảng riêng), được chạy truy vấn tổng hợp chỉ đọc qua `DataSource` (TD-08).

## 7. Điểm chưa chốt và quyết định (build-first 20/11)
| Mã | Quyết định / trạng thái | Ảnh hưởng |
|---|---|---|
| OQ-11 | Hoãn: không xuất báo cáo ở bản build này | US-04 |
| OQ-12 | Đã chốt: bỏ đồng ý chia sẻ ảnh | BR-07 bị bỏ |
| OQ-14 | Đã chốt: bỏ đánh giá kết quả | Bỏ chỉ số "Tỷ lệ đánh giá đúng", danh sách "Sai" |
| OQ-23 | Đã chốt: chỉ đếm `COMPLETED` | BR-08 |
| OQ-25 | Hoãn: chưa làm chỉ số "Tổng số người dùng" | Bảng 4.12 |
| OQ-26 | Đã chốt: báo ADMIN bằng thông báo trong ứng dụng, không hiện trên dashboard | — |
| OQ-05 | Đã chốt tạm: loại cây NULL thì theo nhãn hạng 1 | BR-09 |
| OQ-06 [AI] | Đã chốt một phần: một ngưỡng chung. **Giá trị chờ nhóm AI** | Tỷ lệ "Chưa xác định" |
| TD-08 | Đã chốt: mô-đun `dashboard` riêng, SQL chỉ đọc | Mục 6 |

Ngoài phạm vi specs này: ADM-06 xuất ảnh cho nhóm AI (Could), hoãn vì đã bỏ OQ-12 và OQ-14.

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn; Bảng 4.12 chép đúng
- [ ] Tester: mỗi chỉ số có dữ liệu mẫu và kết quả tính tay để so
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md`
- [ ] **Nhóm AI**: nhóm chỉ số chất lượng mô hình
- [ ] `/cross-check dashboard specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 20/11/2026 | 0.1 | Tách từ C4 v0.2, ERD-doc, FL v0.2 khi dựng workflow | Claude (chờ Dương duyệt) |
| 20/11/2026 | 0.2 | Build-first: áp OQ-05, 06, 11, 12, 14, 23, 25, 26, TD-08. Bỏ BR-07; thêm BR-08, BR-09; Bảng 4.12 hoãn "Tổng số người dùng", bỏ "Tỷ lệ đánh giá đúng". Chuyển VERIFIED | Claude theo quyết định của Dương |

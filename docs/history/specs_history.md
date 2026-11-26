# Specs — Xem lịch sử tra cứu (`history`)

> **Trạng thái:** VERIFIED (build-first 20/11, review lại ở giai đoạn test). Các điểm mở được Dương chốt ngày 20/11 (`docs/_shared/open_questions.md`). Chưa chạy `/cross-check specs`.
> **UC:** UC03 · **Mã chức năng:** HIST-01, HIST-02 (Must) · HIST-03 (Should)
> **Nguồn:** C4 = Chương 4 v0.2 Bảng 4.5, 4.6 · ERD = Phân tích Class & CSDL 4.10, 6.4, 10.3 · FL = Function List v0.2

## 1. Context
- Người dùng xem lại mọi lần chẩn đoán đã thực hiện; tìm kiếm, lọc, xem chi tiết; gắn kết quả vào cây trồng; xoá những lần không còn cần. *(C4 Bảng 4.5)*
- Vai trò: `USER`, và `ADMIN` vì ADMIN kế thừa chức năng USER (OQ-22). Mỗi người chỉ xem lượt của chính mình.
- Phụ thuộc: `diagnosis` (dữ liệu). Liên quan: `my_plants` (gắn vào cây, dòng thời gian).

## 2. User stories
| Mã | User story | Nguồn | Ưu tiên |
|---|---|---|---|
| US-01 | Là người dùng, tôi muốn xem danh sách các lần tra cứu của mình, mới nhất ở trên, nhóm theo thời gian | C4 bước 1–2 | HIST-01 Must |
| US-02 | Là người dùng, tôi muốn tìm theo tên bệnh và lọc theo loại cây, dạng kết quả, khoảng thời gian | C4 bước 3–4 | HIST-01 Must |
| US-03 | Là người dùng, tôi muốn xem chi tiết một lần tra cứu | C4 bước 5–6 | HIST-02 Must |
| US-04 | Là người dùng, tôi muốn gắn một lần tra cứu chưa gắn cây vào cây đã có hoặc cây mới | C4 7a–8a | HIST-02 Must |
| US-05 | Là người dùng, tôi muốn chẩn đoán lại từ một lần tra cứu, loại cây được chọn sẵn | C4 7c | HIST-02 Must |
| US-06 | Là người dùng, tôi muốn xoá một hoặc nhiều lần tra cứu, và có thể hoàn tác | C4 5d–8d | HIST-03 Should |

## 3. Business rules
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Chỉ hiển thị lượt của chính người dùng, có `status = COMPLETED` và chưa bị xoá mềm (`deleted_at IS NULL`). Lượt `PROCESSING`, `FAILED` không hiện. Danh sách có phân trang | ERD 6.4; FL HIST-01; OQ-23 |
| BR-02 | Danh sách: mới nhất ở trên, nhóm theo "Hôm nay", "7 ngày qua", "Trước đó". Mỗi mục gồm ảnh thu nhỏ, kết quả, loại cây, tên cây đã gắn, độ tin cậy, thời gian | C4 bước 2 |
| BR-03 | Tìm theo tên bệnh. Lọc theo loại cây, dạng kết quả, khoảng thời gian | C4 bước 3 |
| BR-04 | Trường hiển thị ở danh sách (DS) và chi tiết (CT) theo Bảng 4.6, xem mục 4 | C4 Bảng 4.6 |
| BR-05 | Tên bệnh và độ tin cậy lấy từ dự đoán `rank_no = 1`. "Các khả năng khác" là `rank_no` 2–3 | ERD 10.3 |
| BR-06 | Gắn vào cây: với lượt chưa gắn cây, người dùng chọn "Lưu vào cây trồng của tôi", chọn cây đã có hoặc tạo cây mới. Hệ thống gắn và thông báo "Đã lưu vào hồ sơ cây". Áp dụng chung các quy tắc gắn cây của `diagnosis` (BR-22, 23, 25–27) | C4 7a–8a |
| BR-07 | "Chẩn đoán lại": mở luồng UC02 với loại cây được chọn sẵn | C4 7c |
| BR-08 | Xoá: chọn biểu tượng xoá ở một mục, hoặc chọn nhiều mục rồi nhấn "Xoá". Hệ thống hiện hộp thoại xác nhận. Người dùng xác nhận thì xoá các mục khỏi lịch sử; mục nào đã gắn cây thì đồng thời gỡ khỏi dòng thời gian của cây. Sau đó hiển thị thông báo kèm nút "Hoàn tác" trong **5 giây**. Xoá hoặc hoàn tác **không làm đổi** tình trạng sức khoẻ của cây | C4 5d–8d; OQ-24 |
| BR-09 | Xoá là **xoá mềm**: đặt `deleted_at`. Hoàn tác thì đặt lại NULL. Lượt đã xoá vẫn được tính trong thống kê tổng hợp. Ảnh đã xoá không được dùng làm dữ liệu huấn luyện | ERD 4.10, D1; C4 4.5; FL HIST-03 |
| BR-10 | Chưa có lượt nào: "Bạn chưa thực hiện chẩn đoán nào" và nút "Chẩn đoán ngay" | C4 2.1 |
| BR-11 | Không có kết quả phù hợp: "Không tìm thấy lần tra cứu phù hợp" và nút "Xoá bộ lọc" | C4 4.1 |

## 4. Data requirements

Bảng chính: `diagnoses` (+ `diagnosis_predictions`, `model_labels`, `diseases`, `crops`, `plants`). Chỉ mục `ix_diagnoses_user_created`.

Thông tin một lượt tra cứu theo **Bảng 4.6**. Chương 4 có ghi chú rằng bảng này chỉ để tạm làm căn cứ dựng màn hình, sẽ xoá khỏi báo cáo sau. DS = danh sách, CT = chi tiết.

| Nhóm | Trường | Mô tả | Hiển thị | Lấy từ |
|---|---|---|---|---|
| Ảnh | Ảnh chẩn đoán | Ảnh sau khi cắt, chỉnh sửa; dạng thu nhỏ ở danh sách | DS, CT | `processed_image_url` |
| Ảnh | Ảnh gốc | Ảnh trước khi chỉnh sửa | CT | `original_image_url` |
| Cây trồng | Loại cây | Lúa, ngô, cà chua, ớt, khoai tây | DS, CT | `crops` qua `diagnoses.crop_id` (luôn có, OQ-05 đổi 22/11) |
| Cây trồng | Tên cây | Tên cây trong "Cây trồng của tôi" nếu đã gắn | DS, CT | `plants.name` |
| Kết quả | Dạng kết quả | Phát hiện bệnh / Cây khoẻ mạnh / Chưa xác định | DS, CT | `result_type` |
| Kết quả | Tên bệnh | Tên thường gọi | DS, CT | nhãn hạng 1 → `diseases.name` |
| Kết quả | Độ tin cậy | Xác suất (%) | DS, CT | `probability` hạng 1 |
| Kết quả | Các khả năng khác | Hai bệnh có xác suất tiếp theo | CT | hạng 2, 3 |
| Thông tin bệnh | Mức độ nguy hại | Thấp / Trung bình / Cao | DS, CT | `diseases.severity` |
| Thông tin bệnh | Nhóm tác nhân | Nấm / vi khuẩn / virus / sinh lý (ERD thêm côn trùng, nhện hại) | CT | `diseases.pathogen_group` |
| Thông tin bệnh | Triệu chứng và hướng xử lý | Tóm tắt, kèm liên kết tới trang chi tiết bệnh | CT | `diseases.symptoms`, `treatment` |
| Hệ thống | Thời gian tra cứu | Ngày giờ chẩn đoán | DS, CT | `created_at` |
| Hệ thống | Phiên bản mô hình | Chỉ lưu để thống kê, **không hiển thị** cho người dùng | — | `model_version` |

> FL HIST-02 ghi rằng chi tiết hiển thị "phiên bản mô hình", nhưng Bảng 4.6 (mới hơn) ghi không hiển thị. Specs theo Bảng 4.6.
>
> Bảng 4.6 còn hai trường nhóm "Theo dõi" không làm ở bản build này: "Đánh giá của người dùng" (bỏ theo OQ-14) và "Ghi chú" (bỏ theo OQ-08, dùng ghi chú chăm sóc của cây).

## 5. UI/UX requirements
- Danh sách: khuôn "Danh sách" (nền `#F7F7F7`, tiêu đề, ô tìm kiếm, chip lọc, list). Chi tiết: khuôn "Chi tiết". *(design/06)*
- Hộp thoại xác nhận xoá. Toast có nút "Hoàn tác" trong 5 giây.
- Có trạng thái rỗng (BR-10, BR-11), loading và lỗi.

## 6. Technical requirements
- API danh sách hỗ trợ phân trang, tìm kiếm, lọc. Chỉ trả lượt của người gọi (guard và kiểm tra sở hữu).
- Xoá nhiều mục: một request, thực hiện trong một giao dịch **(đề xuất)**.
- Hoàn tác: đặt lại `deleted_at = NULL` cho đúng các mục vừa xoá.

## 7. Điểm chưa chốt và quyết định (build-first 20/11)
| Mã | Quyết định / trạng thái | Ảnh hưởng |
|---|---|---|
| OQ-08 | Đã chốt: bỏ ghi chú cho từng lượt | Bảng 4.6 |
| OQ-14 | Đã chốt: bỏ đánh giá kết quả | Bảng 4.6, bộ lọc |
| OQ-23 | Đã chốt: chỉ hiện lượt `COMPLETED` | BR-01 |
| OQ-24 | Đã chốt: xoá không đổi tình trạng cây | BR-08 |
| OQ-05 | Đã chốt 22/11: chọn loại cây bắt buộc, loại cây lấy thẳng từ `diagnoses.crop_id` | Bảng 4.6, bộ lọc loại cây |
| OQ-22 | Đã chốt: ADMIN xem được lịch sử của chính mình | Mục 1 |
| OQ-07 | Hoãn: "mức độ nguy hại" dùng `diseases.severity` | Bảng 4.6 |

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn, đủ luồng thay thế và ngoại lệ, câu chữ đúng nguyên văn
- [ ] Tester: mỗi BR kiểm thử được; có biên (hoàn tác ở giây thứ 5, phân trang)
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md`
- [ ] `/cross-check history specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 20/11/2026 | 0.1 | Tách từ C4 v0.2, ERD-doc, FL v0.2 khi dựng workflow | Claude (chờ Dương duyệt) |
| 20/11/2026 | 0.2 | Build-first: áp OQ-05, 07, 08, 14, 22, 23, 24. Sửa BR-01, BR-08, Bảng 4.6. Chuyển VERIFIED | Claude theo quyết định của Dương |
| 22/11/2026 | 0.3 | OQ-05 đổi (chọn loại cây bắt buộc): Bảng 4.6 bỏ cách lấy loại cây theo nhãn hạng 1 | Claude theo quyết định của Dương |

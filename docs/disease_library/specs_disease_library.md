# Specs — Xem bệnh cây hay gặp (`disease_library`)

> **Trạng thái:** VERIFIED (build-first 20/11, review lại ở giai đoạn test). Các điểm mở được Dương chốt ngày 20/11 (`docs/_shared/open_questions.md`). Chưa chạy `/cross-check specs`.
> **UC:** UC05 (kèm «extend» Xem chi tiết bệnh cây, dùng chung với UC02) · **Mã chức năng:** LIB-02 (Must) · LIB-01 (Should) · LIB-03, LIB-04 (Could) · DIAG-05 (Must, dùng chung trang chi tiết)
> **Nguồn:** C4 = Chương 4 v0.2 Bảng 4.9, 4.10 (luồng 4c) · ERD = Phân tích Class & CSDL 3.2, 4.3, 4.4 · FL = Function List v0.2 · UC-png 18/11

## 1. Context
- Chuyên mục "Bệnh cây hay gặp" trên trang chủ, trình bày dạng tin nổi bật. Người dùng duyệt theo loại cây, tìm kiếm và xem chi tiết từng bệnh để chủ động nhận biết và phòng bệnh. *(C4 Bảng 4.9)*
- Vai trò: `USER`, và `ADMIN` vì ADMIN kế thừa chức năng USER (OQ-22). Phải đăng nhập. FL v0.2 ghi thư viện công khai cho Khách, nhưng C4 đã thay bằng quy định bắt buộc đăng nhập.
- Phụ thuộc: `catalog` (nội dung bệnh). Trang chi tiết bệnh dùng chung với `diagnosis`.

## 2. User stories
| Mã | User story | Nguồn | Ưu tiên |
|---|---|---|---|
| US-01 | Là người dùng, tôi muốn thấy chuyên mục "Bệnh cây hay gặp" trên trang chủ dưới dạng thẻ tin | C4 bước 1–2 | LIB-01 Should |
| US-02 | Là người dùng, tôi muốn xem tất cả bệnh, lọc theo loại cây và tìm theo tên | C4 bước 3–4 | LIB-01 Should |
| US-03 | Là người dùng, tôi muốn xem trang chi tiết của một bệnh | C4 bước 5–6 | LIB-02, DIAG-05 Must |
| US-04 | Là người dùng, tôi muốn từ trang bệnh chuyển sang chẩn đoán cây của mình | C4 7b | — |

## 3. Business rules
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Chỉ hiển thị bệnh ở trạng thái **Công khai** (`PUBLISHED`). Bệnh bị ẩn không còn trong thư viện, nhưng vẫn được giữ trong lịch sử tra cứu của người dùng | C4 UC05 Post-condition; Bảng 4.10 luồng 4c |
| BR-02 | Thẻ tin trên trang chủ gồm ảnh, tên bệnh, loại cây, mô tả ngắn | C4 bước 2 |
| BR-03 | Thứ tự trên trang chủ: ưu tiên bệnh được quản trị viên đánh dấu nổi bật, và bệnh được phát hiện nhiều trên hệ thống trong 30 ngày gần nhất (nhãn "Đang phổ biến"). Thứ tự: bệnh nổi bật trước, rồi bệnh "Đang phổ biến" (BR-04), còn lại theo `published_at` giảm dần. Mục "Dành cho cây của bạn" (C4 2a) hoãn | C4 bước 2; OQ-10 |
| BR-04 | "Đang phổ biến": top N bệnh theo số lượt `DISEASE` có độ tin cậy ≥ ngưỡng trong 30 ngày gần nhất, chỉ xét bệnh có ít nhất 1 lượt. N và số ngày để trong cấu hình (giá trị N chọn khi làm feature này). Chỉ hiển thị số liệu tổng hợp, không lộ thông tin người dùng | FL LIB-03 (Could); OQ-28 |
| BR-05 | "Xem tất cả": thanh lọc loại cây gồm Tất cả, Lúa, Ngô, Cà chua, Ớt, Khoai tây, và ô tìm theo tên bệnh | C4 bước 3 |
| BR-06 | Trang chi tiết bệnh: tên bệnh và tác nhân gây bệnh, loại cây, ảnh minh hoạ, mức độ nguy hại, triệu chứng nhận biết, nguyên nhân và điều kiện phát sinh, biện pháp phòng ngừa, biện pháp xử lý, các bệnh liên quan. **Không hiển thị** nguồn tham khảo (bỏ `source_refs`, DC-04). **Kèm lưu ý nội dung chỉ mang tính tham khảo** | C4 bước 6; FL DIAG-05; DC-04 |
| BR-07 | "Các bệnh liên quan" là bệnh cùng loại cây hoặc cùng nhóm tác nhân | ERD 3.2 |
| BR-08 | Ảnh bìa là ảnh có `sort_order` nhỏ nhất. Trong cùng nhóm thứ tự của BR-03, thẻ tin sắp theo `published_at` | ERD 4.3, 4.4 |
| BR-09 | "Chẩn đoán cây của bạn": mở luồng chẩn đoán (UC02) | C4 7b |
| BR-10 | Danh mục chưa có bệnh nào công khai: ẩn chuyên mục trên trang chủ | C4 2.1 |
| BR-11 | Không tìm thấy bệnh phù hợp: "Không tìm thấy bệnh phù hợp" kèm gợi ý "Chẩn đoán bằng hình ảnh" | C4 4.1 |

## 4. Data requirements
- Đọc: `diseases` (`status = PUBLISHED`), `disease_images`, `crops`. Với BR-03, BR-04: `diagnoses`, `diagnosis_predictions`, `model_labels`.
- Chỉ mục `ix_diseases_crop_status`.
- Đã chốt 20/11: giữ `summary` làm mô tả ngắn trên thẻ tin (DC-03); bỏ `source_refs` (DC-04).

## 5. UI/UX requirements
- Trang chủ: khuôn "Trung tâm" (nền sage). "Xem tất cả": khuôn "Danh sách". Chi tiết bệnh: khuôn "Chi tiết". *(design/06)*
- Mức độ nguy hại thể hiện bằng cả màu lẫn chữ.

## 6. Technical requirements
- API chỉ đọc. Lọc theo `crop_id`, tìm theo tên, phân trang.
- Thống kê "Đang phổ biến" là truy vấn tổng hợp, không trả dữ liệu theo người dùng.

## 7. Điểm chưa chốt và quyết định (build-first 20/11)
| Mã | Quyết định / trạng thái | Ảnh hưởng |
|---|---|---|
| OQ-10 | Đã chốt: nổi bật, rồi đang phổ biến, rồi `published_at`; hoãn "Dành cho cây của bạn" | BR-03 |
| OQ-28 | Đã chốt: top N trong 30 ngày, N trong cấu hình | BR-04 |
| DC-03, DC-04 | Đã chốt: giữ `summary`, bỏ `source_refs` | BR-02, BR-06 |
| OQ-06 | Đã chốt một phần: một ngưỡng chung. **Giá trị chờ nhóm AI** | BR-04 |
| OQ-22 | Đã chốt: ADMIN xem được thư viện | Mục 1 |

Ngoài phạm vi specs này: LIB-04 bài viết chia sẻ (Could, chưa có trong C4); C4 2a "Dành cho cây của bạn" (hoãn theo OQ-10).

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn, đủ luồng thay thế và ngoại lệ, câu chữ đúng nguyên văn
- [ ] Tester: mỗi BR kiểm thử được (bệnh ẩn, chưa có bệnh công khai)
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md`
- [ ] `/cross-check disease_library specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 20/11/2026 | 0.1 | Tách từ C4 v0.2, ERD-doc, FL v0.2 khi dựng workflow | Claude (chờ Dương duyệt) |
| 20/11/2026 | 0.2 | Build-first: áp OQ-06, 10, 22, 28, DC-03, DC-04. Sửa BR-03, BR-04, BR-06, BR-08. Chuyển VERIFIED | Claude theo quyết định của Dương |

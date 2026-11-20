# Specs — Quản lý danh mục cây trồng & bệnh (`catalog`)

> **Trạng thái:** VERIFIED (build-first 20/11, review lại ở giai đoạn test). Các điểm mở được Dương chốt ngày 20/11 (`docs/_shared/open_questions.md`). Chưa chạy `/cross-check specs`. **Cần nhóm AI duyệt** phần nhãn mô hình [AI].
> **UC:** UC06 · **Mã chức năng:** ADM-01, ADM-02 (Must) · ADM-07 (Could)
> **Nguồn:** C4 = Chương 4 v0.2 Bảng 4.10 và đoạn sau bảng · ERD = Phân tích Class & CSDL 4.2–4.5, 6.2, 6.5, 7.2, C2 · FL = Function List v0.2

## 1. Context
- Quản trị viên thêm, sửa, ẩn hoặc hiện loại cây và bệnh cây; quản lý toàn bộ nội dung bệnh hiển thị cho người dùng; gán mã lớp tương ứng với nhãn đầu ra của mô hình AI; chọn bệnh nổi bật trên trang chủ. *(C4 Bảng 4.10)*
- Vai trò: `ADMIN`.
- Đây là dữ liệu bắt buộc cho `diagnosis` (ánh xạ nhãn), `disease_library` (nội dung) và nhắc việc (`recheck_days`). *(FL, UC08 đề xuất)*

## 2. User stories
| Mã | User story | Nguồn | Ưu tiên |
|---|---|---|---|
| US-01 | Là quản trị viên, tôi muốn xem danh sách bệnh, tìm kiếm và lọc theo loại cây, trạng thái | C4 bước 1–2 | ADM-02 Must |
| US-02 | Là quản trị viên, tôi muốn thêm bệnh mới với đủ nội dung và mã lớp mô hình | C4 bước 3–7 | ADM-02 Must |
| US-03 | Là quản trị viên, tôi muốn chỉnh sửa bệnh | C4 3a–5a | ADM-02 Must |
| US-04 | Là quản trị viên, tôi muốn xem trước trang bệnh đúng như người dùng sẽ thấy | C4 5b | ADM-02 Must |
| US-05 | Là quản trị viên, tôi muốn chuyển bệnh qua lại giữa "Công khai" và "Ẩn" | C4 3c–4c | ADM-02 Must |
| US-06 | Là quản trị viên, tôi muốn xem, thêm, sửa, ẩn loại cây | C4 1d–3d | ADM-01 Must |
| US-07 | [AI] Là quản trị viên, tôi muốn ánh xạ mọi nhãn đầu ra của mô hình (gồm nhãn khoẻ mạnh của từng loại cây) vào danh mục, để khi đổi mô hình chỉ cần cập nhật ánh xạ | C4 sau Bảng 4.10; ERD 4.5 | ADM-02 Must |

## 3. Business rules

**Bệnh**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Danh sách bệnh gồm: tên bệnh, loại cây, mã lớp, trạng thái, nổi bật, ngày cập nhật. Có tìm kiếm, lọc theo loại cây và trạng thái | C4 bước 2 |
| BR-02 | Form bệnh gồm: loại cây, tên bệnh, tác nhân gây bệnh, nhóm tác nhân, **mã lớp mô hình** (chọn từ danh sách nhãn của mô hình đang dùng), mức độ nguy hại, mô tả ngắn (`summary`), triệu chứng, nguyên nhân và điều kiện phát sinh, biện pháp phòng ngừa, biện pháp xử lý, số ngày gợi ý kiểm tra lại (`recheck_days`), ảnh minh hoạ, đánh dấu nổi bật, trạng thái (Nháp hoặc Công khai). **Không có** trường nguồn tham khảo (DC-04) | C4 bước 4; DC-03, DC-04, OQ-15 |
| BR-03 | Kiểm tra trường bắt buộc, và mã lớp chưa gán cho bệnh khác. Thiếu trường: đánh dấu và thông báo "Vui lòng nhập đầy đủ thông tin bắt buộc". Mã lớp đã gán: "Mã lớp này đã được gán cho bệnh [tên bệnh]" | C4 bước 6, 6.1, 6.2 |
| BR-04 | Thành công: "Thêm bệnh thành công" khi thêm, "Cập nhật thành công" khi sửa | C4 bước 7, 5a |
| BR-05 | Tên bệnh không được trùng trong cùng một loại cây | ERD 6.2 |
| BR-06 | Bệnh mới có `status = DRAFT`, `is_featured = false`. **Chỉ được chuyển sang Công khai khi đã có** mô tả ngắn (`summary`), triệu chứng, biện pháp xử lý. Lần công khai đầu tiên thì đặt `published_at` | ERD 4.3, 6.5 |
| BR-07 | "Xem trước": hiển thị trang bệnh đúng như người dùng sẽ thấy | C4 5b |
| BR-08 | Ẩn hoặc hiện: chuyển giữa "Công khai" và "Ẩn". Bệnh bị ẩn không còn trong thư viện nhưng vẫn được giữ trong lịch sử tra cứu của người dùng | C4 3c–4c |
| BR-09 | Bệnh đã có dữ liệu chẩn đoán: **không cho xoá vĩnh viễn**, chỉ cho ẩn | C4 3c1; ERD 6.3 |
| BR-10 | Tạo bệnh và tạo hoặc cập nhật nhãn mô hình tương ứng trong **cùng giao dịch**. Xoá bệnh thì ảnh minh hoạ bị xoá theo | ERD 4.3 |

**Loại cây**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-11 | Danh sách loại cây: tên, ảnh, số bệnh, trạng thái. Thêm, sửa hoặc ẩn loại cây (tên, ảnh, mô tả, chu kỳ tưới và chu kỳ bón tính bằng ngày, **mã lớp khoẻ mạnh**) rồi lưu | C4 1d–3d; DC-02, OQ-15, OQ-17 |
| BR-12 | Ẩn loại cây còn bệnh đang công khai: yêu cầu xác nhận, rồi ẩn kèm các bệnh thuộc loại cây đó | C4 3d1 |
| BR-13 | Loại cây đã có bệnh, nhãn, cây trồng hoặc lượt chẩn đoán tham chiếu thì không xoá được, chỉ ẩn | ERD 4.2 |
| BR-14 | Seed 5 loại cây: `RICE` Lúa, `CORN` Ngô, `TOMATO` Cà chua, `CHILI` Ớt, `POTATO` Khoai tây | ERD 4.2, 7.2 |

**Nhãn mô hình [AI]**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-15 | **Mỗi lớp đầu ra của mô hình, kể cả lớp "khoẻ mạnh" của từng loại cây, phải được gán cho đúng một mục trong danh mục trước khi mô hình được đưa vào dùng.** Danh sách nhãn do nhóm AI cung cấp | C4 sau Bảng 4.10 |
| BR-16 | Nhãn `HEALTHY` trỏ tới một loại cây, không trỏ tới bệnh. Nhãn `DISEASE` trỏ tới một loại cây và một bệnh **cùng loại cây đó**. `class_code` là duy nhất | ERD 4.5, 6.2 |
| BR-17 | Mỗi bệnh có tối đa một nhãn đang dùng. Mỗi loại cây có tối đa một nhãn khoẻ mạnh đang dùng | ERD 6.2 |
| BR-18 | Nhãn được tạo khi import danh sách nhãn (`GET /labels`) lúc nhóm AI giao mô hình, hoặc khi chọn mã lớp trong form bệnh (nhãn `DISEASE`) hay form loại cây (nhãn `HEALTHY`, OQ-17) | ERD 4.5 |
| BR-19 | Mô hình mới không còn nhãn nào đó: đặt `is_active = false`. Nhãn đã có dự đoán tham chiếu thì không xoá được | ERD 4.5 |

## 4. Data requirements
- Bảng: `crops`, `diseases`, `disease_images`, `model_labels`.
- Đã chốt 20/11: giữ `summary` (DC-03), bỏ `source_refs` (DC-04), giữ `watering_interval_days`, `fertilizing_interval_days` (DC-02), `model_labels` theo `data_model.md` (DC-05).
- `pathogen_group` có thêm giá trị `PEST` so với C4. *(ERD D15)*

## 5. UI/UX requirements
- Khuôn "Quản trị": dock dọc, bảng, thiết kế cho desktop trước, vẫn phải xem được trên mobile. Thành phần "Bảng quản trị". *(design/05, 06)*
- Form bệnh dài, nên chia nhóm trường. Nút "Xem trước".
- Hộp thoại xác nhận khi ẩn loại cây (BR-12).

## 6. Technical requirements
- Mọi route ghi chỉ dành cho `ADMIN`.
- Import nhãn từ AI service: `GET /labels` (`technical_overview.md` mục 5).
- Upload ảnh minh hoạ bệnh và ảnh loại cây: AWS S3 qua `StorageService` (TD-01).

## 7. Điểm chưa chốt và quyết định (build-first 20/11)
| Mã | Quyết định / trạng thái | Ảnh hưởng |
|---|---|---|
| OQ-17 | Đã chốt: form loại cây có trường "Mã lớp khoẻ mạnh" | BR-11, BR-18 |
| OQ-15 | Đã chốt: hệ thống gợi ý nhắc theo `recheck_days` và chu kỳ tưới, bón, nên hai form có các trường này | BR-02, BR-11 |
| DC-02 → DC-05 | Đã chốt, xem mục 4 | BR-02, BR-06, mục 4 |
| OQ-05 [AI] | Đã chốt tạm: một mô hình chung. Nhóm AI xác nhận lại | BR-15 → BR-19 |
| TD-01 | Đã chốt: AWS S3 | BR-02, BR-11 |
| OQ-19 | **Chưa chốt**: nguồn nội dung phòng trị. Không chặn code | Dữ liệu nhập |

Ghi chú:
- FL ADM-02 có trường "mẫu nhắc chăm sóc" trong form bệnh. ERD-doc đã thay bằng `diseases.recheck_days`, nay được đưa vào form theo OQ-15.
- FL ADM-07 (quản lý phiên bản mô hình, Could) nằm ngoài phạm vi specs này. Hiện mỗi lượt chẩn đoán lưu `model_version` dạng chuỗi.

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn, đủ luồng thay thế và ngoại lệ, câu chữ đúng nguyên văn
- [ ] Tester: mỗi ràng buộc nhãn (BR-16, BR-17) có ca vi phạm để kiểm thử
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md`
- [ ] **Nhóm AI**: danh sách nhãn, quy ước `class_code`, nhãn khoẻ mạnh theo từng loại cây, nhãn cho ớt
- [ ] `/cross-check catalog specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 20/11/2026 | 0.1 | Tách từ C4 v0.2, ERD-doc, FL v0.2 khi dựng workflow | Claude (chờ Dương duyệt) |
| 20/11/2026 | 0.2 | Build-first: áp DC-02 → DC-05, OQ-05, OQ-15, OQ-17, TD-01. Form bệnh thêm `summary`, `recheck_days`, bỏ nguồn tham khảo; form loại cây thêm chu kỳ tưới/bón, mã lớp khoẻ mạnh. Chuyển VERIFIED | Claude theo quyết định của Dương |

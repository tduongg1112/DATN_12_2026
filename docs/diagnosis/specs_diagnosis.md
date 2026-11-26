# Specs — Chẩn đoán bệnh qua hình ảnh (`diagnosis`)

> **Trạng thái:** VERIFIED (build-first 20/11, review lại ở giai đoạn test). Các điểm mở được Dương chốt ngày 20/11 (`docs/_shared/open_questions.md`). Chưa chạy `/cross-check specs`. **Cần nhóm AI duyệt** các mục đánh dấu [AI].
> **UC:** UC02 (chức năng lõi) · **Mã chức năng:** DIAG-01, 02, 04, 05, 06 (Must) · DIAG-03, 07 (Should) · DIAG-08, 09 (Could)
> **Nguồn:** C4 = Chương 4 v0.2 Bảng 4.3, 4.4 · ERD = Phân tích Class & CSDL 4.10, 4.11, 6.5, 7.4 · FL = Function List v0.2 (DIAG, sheet "Luồng chẩn đoán") · UC-png 18/11

## 1. Context
- Chức năng lõi của hệ thống. Người dùng chụp hoặc tải ảnh cây lên và chỉnh sửa cơ bản. Hệ thống nhận dạng bệnh bằng mô hình AI, hiển thị kết quả kèm độ tin cậy, thông tin bệnh và hướng xử lý, đồng thời lưu vào lịch sử tra cứu. *(C4 Bảng 4.3)*
- Vai trò: `USER`, và `ADMIN` vì ADMIN kế thừa chức năng USER (OQ-22). AI service là thành phần bên trong hệ thống, không phải tác nhân. *(C4 4.2.2)*
- Phụ thuộc: `auth`, `catalog` (cần `model_labels`, `diseases`, `crops`), AI service. Liên quan: `history`, `my_plants`, `disease_library` (trang chi tiết bệnh).
- Mô hình là **bộ phân loại đóng**: luôn chọn 1 trong N lớp, kể cả khi ảnh không phải lá. Vì vậy cần ngưỡng độ tin cậy và dạng kết quả "Chưa xác định". *(C4 sau Bảng 4.3; FL)*

## 2. User stories
| Mã | User story | Nguồn | Ưu tiên |
|---|---|---|---|
| US-01 | Là người dùng, tôi muốn chụp ảnh cây bằng camera, có khung ngắm vuông và hướng dẫn chụp | C4 bước 1–5 | DIAG-01 Must |
| US-02 | Là người dùng, tôi muốn tải ảnh có sẵn từ thiết bị lên | C4 3a–5a | DIAG-01 Must |
| US-03 | Là người dùng, tôi muốn cắt khung vuông, xoay, chỉnh độ sáng và độ tương phản, hoặc chụp lại | C4 bước 6 | DIAG-02 Must |
| US-04 | Là người dùng, tôi chọn loại cây trước khi chẩn đoán (**bắt buộc**, OQ-05 đổi 22/11) | C4 bước 7; OQ-05 | DIAG-03 (FL: Should; bắt buộc trong luồng theo OQ-05) |
| US-05 | Là người dùng, tôi muốn xem kết quả: tên bệnh, độ tin cậy, mức độ nguy hại, hai khả năng tiếp theo, triệu chứng, hướng xử lý | C4 bước 8–12 | DIAG-04 Must |
| US-06 | Là người dùng, tôi muốn lưu kết quả vào một cây trong "Cây trồng của tôi", hoặc tạo cây mới từ kết quả | C4 bước 14–15 | DIAG-06 Must |
| US-07 | Là người dùng, tôi muốn chẩn đoán lại từ trang chi tiết cây, loại cây được chọn sẵn và kết quả tự gắn vào cây | C4 1b, 7b, 14b | DIAG-06 Must |
| US-08 | Là người dùng, tôi muốn mở trang chi tiết bệnh từ kết quả | C4 12e | DIAG-05 Must |

## 3. Business rules

**Thu nhận ảnh**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Nhấn "Chẩn đoán" thì hiển thị hai lựa chọn "Chụp ảnh" và "Tải ảnh lên", kèm hướng dẫn chụp ngắn. Nội dung hướng dẫn theo FL: 1 lá, rõ nét, đủ sáng, nền đơn giản | C4 bước 1–2; FL DIAG-01 |
| BR-02 | Lần đầu dùng camera thì xin quyền truy cập. Camera có khung ngắm vuông | C4 bước 4 |
| BR-03 | Màn chỉnh sửa: cắt khung vuông, xoay, chỉnh độ sáng, độ tương phản, kèm nút "Chụp lại" | C4 bước 6 |
| BR-04 | Chỉ nhận ảnh JPG, PNG, tối đa 10 MB. Sai thì thông báo "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" | C4 4a, 5a1 |
| BR-05 | Người dùng từ chối quyền camera hoặc thiết bị không có camera: hướng dẫn cách cấp quyền và gợi ý chuyển sang "Tải ảnh lên" | C4 4.1 |
| BR-06 | Lưu cả **ảnh gốc** (trước khi chỉnh) và **ảnh đã chỉnh**. Ảnh đã chỉnh là ảnh gửi tới AI | C4 Bảng 4.6; ERD 4.10 |

**Gửi và xử lý**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-07 | Nhấn "Tiếp tục": kiểm tra ảnh hợp lệ, tải lên, hiển thị "Đang phân tích...". Tạo lượt chẩn đoán `status = PROCESSING` (gắn `user_id`, `crop_id` của loại cây đã chọn, `plant_id` nếu đang chẩn đoán từ hồ sơ cây) **trước khi** gọi AI. Chưa chọn loại cây thì không cho gửi (OQ-05); câu thông báo nguồn không có, soạn ở bước tài liệu của feature này | C4 bước 8; ERD 7.4; OQ-05 |
| BR-08 | Mất kết nối khi tải ảnh: thông báo và cho thử lại, không cần chụp lại | C4 8.1 |
| BR-09 | [AI] Gọi AI service với `top_k = 3`, **luôn** kèm `crop_code` của loại cây đã chọn (OQ-05 đổi 22/11: mô hình cho kết quả tốt hơn nhiều khi biết loại cây). AI trả các lớp có khả năng cao nhất kèm xác suất, `model_version`, `inference_ms` | C4 bước 9–10; ERD 4.11, 7.4; FL; OQ-05 |
| BR-10 | [AI] AI không phản hồi trong 15 giây hoặc báo lỗi: thông báo "Hệ thống đang bận, vui lòng thử lại sau", giữ ảnh để thử lại, đặt lượt là `FAILED` và ghi `completed_at`. Thời gian chờ để trong cấu hình | C4 10.1 ("define sau"); ERD 7.4 |
| BR-11 | Tra từng `class_code` trong `model_labels` (`is_active = true`). Có mã không tìm thấy thì coi là lỗi cấu hình: `FAILED`, ghi log mức ERROR và tạo thông báo trong ứng dụng cho mọi ADMIN, không gửi trùng cho cùng một `class_code` | ERD 6.5, 7.4; OQ-26 |
| BR-12 | [AI] Xác định dạng kết quả (Bảng 4.4): xác suất hạng 1 < ngưỡng thì `UNCERTAIN`; nhãn hạng 1 là `HEALTHY` thì `HEALTHY`; còn lại `DISEASE`. **Một ngưỡng chung** cho mọi loại cây, để trong cấu hình; giá trị chờ nhóm AI | C4 bước 11, Bảng 4.4; ERD 6.5; OQ-06 |
| BR-13 | Trong **một giao dịch**: ghi 3 dòng `diagnosis_predictions` (`rank_no` 1..3), đặt `status = COMPLETED`, `result_type`, `model_version`, `inference_ms`, `completed_at` | ERD 6.5, 7.4 |
| BR-14 | Lượt chẩn đoán được **tự động lưu vào lịch sử tra cứu** với mọi dạng kết quả | C4 bước 13, 12c |

**Hiển thị kết quả (Bảng 4.4)**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-15 | **Phát hiện bệnh** (`DISEASE`): ảnh đã chụp, tên bệnh, độ tin cậy (%), mức độ nguy hại, hai khả năng tiếp theo, tóm tắt triệu chứng và hướng xử lý | C4 bước 12, Bảng 4.4 |
| BR-16 | **Cây khoẻ mạnh** (`HEALTHY`): hiển thị "Cây khoẻ mạnh" kèm gợi ý chăm sóc phòng bệnh (`crops.care_guide`) | C4 12c; ERD 4.2 |
| BR-17 | **Chưa xác định** (`UNCERTAIN`): hiển thị "Chưa đủ chắc chắn để kết luận", hướng dẫn chụp lại (gần hơn, đủ sáng, một lá) và nút "Chụp lại". Các khả năng chỉ hiển thị **ở dạng tham khảo**, không đưa tên bệnh ra như kết luận | C4 12d; FL DIAG-04 |
| BR-18 | "Mức độ nguy hại" là thuộc tính của bệnh trong danh mục (Thấp, Trung bình, Cao), **không phải** mức độ nhiễm trên lá (OQ-07) | C4 sau Bảng 4.4 |
| BR-19 | Bệnh kết luận và độ tin cậy lấy từ dự đoán `rank_no = 1`. Hai khả năng tiếp theo là `rank_no` 2 và 3 | ERD L5, D2 |
| BR-20 | Luôn kèm lưu ý rằng kết quả chỉ mang tính tham khảo. Câu chữ dùng "có khả năng", không khẳng định tuyệt đối | FL DIAG-05; design/00 |
| BR-21 | "Xem chi tiết bệnh" mở trang thông tin bệnh dùng chung với UC05 | C4 12e; UC-png «extend» |

**Lưu vào cây trồng («extend» trên UC-png)**
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-22 | "Lưu vào cây trồng của tôi": chọn một cây đã có, hoặc tạo cây mới với loại cây điền sẵn từ kết quả. Hệ thống gắn kết quả vào hồ sơ cây, cập nhật tình trạng sức khoẻ của cây và thông báo "Đã lưu vào hồ sơ cây" | C4 bước 14–15 |
| BR-23 | Cây phải thuộc cùng người dùng. Cảnh báo nếu loại cây của cây khác loại cây của nhãn hạng 1 | ERD 6.5 |
| BR-24 | Chẩn đoán từ hồ sơ cây: loại cây chọn sẵn theo hồ sơ, kết quả tự gắn vào cây, người dùng không phải chọn lại | C4 1b, 7b, 14b |
| BR-25 | Kết quả gắn vào cây: `DISEASE` thì cây thành `DISEASED`, `HEALTHY` thì thành `HEALTHY`, `UNCERTAIN` thì không đổi (chi tiết ở `specs_my_plants.md` BR-04) | C4 Bảng 4.4, 4.8 |
| BR-26 | Gắn kết quả `DISEASE`: nếu bệnh có `recheck_days` và cây chưa có nhắc `RECHECK` đang bật thì **gợi ý** nhắc kiểm tra lại sau `recheck_days` ngày. Người dùng xác nhận thì mới tạo nhắc với `source = SYSTEM` | ERD 7.4; OQ-15 |
| BR-27 | Tạo cây mới từ kết quả: `health_status` lấy theo kết quả (`DISEASED` hoặc `HEALTHY`). Gợi ý nhắc tưới, bón như khi tạo cây (`specs_my_plants.md` BR-18) | ERD 4.6; OQ-15 |

## 4. Data requirements
- Ghi: `diagnoses`, `diagnosis_predictions`. Cập nhật: `plants.health_status`. Có thể tạo: `plants`, `reminders`.
- Đọc: `model_labels`, `diseases`, `crops`, `disease_images`.
- Thời gian phản hồi = `completed_at − created_at`, dùng cho dashboard. *(ERD D5)*
- `model_labels` và `diagnosis_predictions.label_id` theo `data_model.md` (DC-05, DC-06 đã chốt).
- `diagnoses.crop_id` **NOT NULL** (OQ-05 đổi 22/11). Migration hiện tại vẫn cho phép NULL, nên feature này thêm một migration mới để đổi ràng buộc. Loại cây hiển thị ở lịch sử và dashboard lấy thẳng từ `diagnoses.crop_id`.

## 5. UI/UX requirements
- Màn camera: khuôn "Chụp ảnh" (nền đen, ảnh tràn màn hình, không có dock). *(design/06)*
- Màn kết quả: khuôn "Chi tiết". Thành phần "Thẻ kết quả", "Tải ảnh", "Màn chụp ảnh". *(design/05 mục Nghiệp vụ)*
- Trạng thái phân tích ảnh theo design/07. Đủ trạng thái lỗi (BR-05, BR-08, BR-10).
- Ảnh được nén ở trình duyệt trước khi tải lên. Không resize về 224×224 ở client. *(design/06; FL DIAG-02)*

## 6. Technical requirements
- Hợp đồng AI service: `technical_overview.md` mục 5. Backend gọi qua một lớp client duy nhất. Tiền xử lý (resize, chuẩn hoá) do AI service làm. *(FL)*
- Ngưỡng tin cậy, thời gian chờ, `top_k` đều để trong cấu hình.
- Ảnh gốc và ảnh đã chỉnh lưu trên AWS S3 qua `StorageService`, đọc qua presigned URL (TD-01).
- Chưa có AI service thật thì dùng mock trong backend, `AI_MODE=mock|http`. Mock trả top-3 từ `model_labels` đã seed, ép được lỗi và timeout (TD-04). Vị trí mã AI service: hoãn.
- Phi chức năng gợi ý (chưa chốt): từ lúc gửi ảnh tới khi có kết quả không quá 3 giây trên 4G; suy luận không quá 1 giây/ảnh trên CPU. *(FL NFR)*

## 7. Điểm chưa chốt và quyết định (build-first 20/11)
| Mã | Quyết định / trạng thái | Ảnh hưởng |
|---|---|---|
| OQ-05 [AI] | Đã chốt 22/11 (đổi từ "tuỳ chọn"): chọn loại cây là **bắt buộc**, luôn gửi `crop_code` | US-04, BR-07, BR-09, `diagnoses.crop_id` NOT NULL |
| OQ-06 [AI] | Đã chốt một phần: một ngưỡng chung, chờ 15 giây. **Giá trị ngưỡng chờ nhóm AI** | BR-10, BR-12 |
| OQ-07 | Hoãn: bản build dùng `diseases.severity` như BR-18 | BR-18 |
| OQ-14 | Đã chốt: bỏ đánh giá kết quả (DIAG-07) ở bản build này | Không có US đánh giá |
| OQ-15 | Đã chốt: hệ thống gợi ý, người dùng xác nhận | BR-26, BR-27 |
| OQ-22 | Đã chốt: ADMIN dùng được chẩn đoán | Mục 1 |
| OQ-26 | Đã chốt: log ERROR và thông báo cho mọi ADMIN | BR-11 |
| OQ-12 | Đã chốt: bỏ đồng ý chia sẻ ảnh | Không ảnh hưởng luồng chẩn đoán |
| DC-05, DC-06 | Đã chốt theo `data_model.md` | Mục 4 |
| TD-01, TD-04 | Đã chốt: AWS S3; AI mock trong backend (vị trí mã AI service hoãn) | Mục 6 |
| OQ-18 [AI] | Đã chốt 22/11: mô hình chạy trên server, cả máy tính lẫn điện thoại đều gửi ảnh lên backend. Chạy trên điện thoại (DIAG-09) ngoài phạm vi | Mục 6 |

Ngoài phạm vi specs này (Could): DIAG-08 heatmap (phụ thuộc phần diễn giải của nhóm AI), DIAG-09 chẩn đoán ngoại tuyến. DIAG-07 đánh giá kết quả (Should) bị bỏ ở bản build này (OQ-14).

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn, đủ luồng thay thế và ngoại lệ, câu chữ đúng nguyên văn
- [ ] Tester: mỗi BR kiểm thử được; có giá trị biên (ảnh 10 MB, ngưỡng tin cậy, 15 giây)
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md`
- [ ] **Nhóm AI**: BR-09, BR-10, BR-12, hợp đồng API, danh sách nhãn
- [ ] `/cross-check diagnosis specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 20/11/2026 | 0.1 | Tách từ C4 v0.2, ERD-doc, FL v0.2 khi dựng workflow | Claude (chờ Dương duyệt) |
| 20/11/2026 | 0.2 | Build-first: áp OQ-05, 06, 07, 12, 14, 15, 22, 26, DC-05, DC-06, TD-01, TD-04. Sửa US-04, BR-09, BR-11, BR-12, BR-26, BR-27. Chuyển VERIFIED | Claude theo quyết định của Dương |
| 22/11/2026 | 0.3 | OQ-05 đổi: chọn loại cây bắt buộc. Sửa US-04, BR-07, BR-09, mục 4 (`crop_id` NOT NULL), mục 7 | Claude theo quyết định của Dương |

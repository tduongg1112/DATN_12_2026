# Project overview — Business context

> Bước 1.1 của framework (BA). Tổng hợp từ các nguồn ở mục 9, **không thêm nghiệp vụ mới**. Nội dung nào còn "Chưa chốt" được ghi ở `docs/_shared/open_questions.md`.
> Cập nhật: 20/11/2026 · Người duyệt: Nguyễn Tùng Dương

## 1. Mục đích hệ thống

**Tên đề tài:** Nghiên cứu và xây dựng hệ thống hỗ trợ quản lý sức khỏe cây trồng ứng dụng trí tuệ nhân tạo cho một số cây trồng phổ biến tại Việt Nam.

- Giúp người trồng nhận biết bệnh trên lá cây qua hình ảnh, biết hướng xử lý và theo dõi sức khoẻ cây trồng. Hệ thống gắn với khung Quản lý sức khoẻ cây trồng tổng hợp (IPHM). *(Chương 4, mục 4.1)*
- Chức năng lõi là chẩn đoán bệnh qua hình ảnh. Các chức năng còn lại phục vụ lưu trữ, theo dõi kết quả và quản trị nội dung, để người dùng đi trọn một vòng: **nhận biết bệnh → xử lý → theo dõi cây sau xử lý**. *(Chương 4, mục 4.2)*
- Đưa kết quả nghiên cứu mô hình lai CNN–Mamba của nhóm vào một hệ thống phần mềm hoàn chỉnh. Mô hình đã công bố trong bài báo *"A Hybrid CNN–State Space Model with Systematic Design Analysis for Efficient Plant Disease Recognition"* (JIHMSP), nặng 0,47M tham số, 1,79 MB. *(Đề cương, mục 3)*

## 2. Phạm vi

| Trong phạm vi | Ngoài phạm vi (giai đoạn này) |
|---|---|
| 5 loại cây: lúa, ngô, cà chua, ớt, khoai tây | Quản lý thửa ruộng, mùa vụ, nhật ký canh tác đầy đủ |
| Web app responsive dùng trên máy tính và điện thoại | Lịch chăm sóc theo giai đoạn sinh trưởng |
| Chẩn đoán bệnh từ ảnh lá, lịch sử tra cứu, cây trồng của tôi, thư viện bệnh | Bản đồ dịch hại, cảnh báo theo vùng |
| Quản trị danh mục cây, bệnh, nhãn mô hình; dashboard | Vai trò cán bộ khuyến nông, hỗ trợ chuyên gia |
| Nhắc kiểm tra lại cây và thông báo trong ứng dụng (chi tiết chưa chốt) | Chatbot LLM/RAG, tra cứu bệnh theo triệu chứng |
| | Nhận dạng sâu hại hoặc côn trùng, ảnh vệ tinh hoặc drone, IoT |

*Nguồn: Chương 4 mục 4.1; Function List v0.2, sheet "Đã loại khỏi phạm vi"; Đề cương mục 6.*

## 3. Đối tượng sử dụng (user roles)

| Vai trò | Mã | Mô tả | Cách tạo tài khoản |
|---|---|---|---|
| Người dùng | `USER` | Người trồng, người yêu cây | Tự đăng ký bằng email, hoặc đăng nhập Google lần đầu |
| Quản trị viên | `ADMIN` | Quản lý danh mục cây, bệnh và nội dung; xem dashboard | Khởi tạo sẵn bằng script seed, không đăng ký qua giao diện |

- Không có chế độ khách. Trừ bước xác thực, mọi chức năng đều yêu cầu đăng nhập. *(Chương 4, mục 4.2.2)*
- Mô-đun nhận dạng bệnh (AI service) là thành phần bên trong hệ thống, **không phải tác nhân**. *(Chương 4, mục 4.2.2)*
- Sơ đồ UC tổng quan bản 18/11 vẽ 3 tác nhân USER, MEMBER, ADMIN có quan hệ tổng quát hoá, khác với 2 tác nhân trong Chương 4. Xem **OQ-22**.

## 4. Nhóm thực hiện

| Thành viên | Phụ trách |
|---|---|
| Nguyễn Tùng Dương | Toàn bộ phần phần mềm: phân tích nghiệp vụ (BA), thiết kế UI/UX, kiến trúc (TechLead/SA), lập trình backend và frontend, kiểm thử |
| Phan Lê Huy (nhóm AI) | Mô hình AI: tối ưu, triển khai suy luận (gồm hướng thiết bị biên) |
| Nguyễn Chí Hiếu (nhóm AI) | Mô hình AI: dữ liệu, độ bền vững trên ảnh thực địa, khả năng diễn giải, ước lượng độ tin cậy |

Ranh giới với nhóm AI: nhóm AI cung cấp endpoint suy luận, danh sách nhãn, phiên bản mô hình và ngưỡng độ tin cậy đề xuất. Dương nhận ảnh, lưu trữ, gọi AI service, ánh xạ mã lớp sang danh mục, áp ngưỡng, rồi lưu và hiển thị kết quả. *(Function List v0.2, DIAG-04)*

## 5. Luồng nghiệp vụ tổng thể

```
[Đăng ký / Đăng nhập (email hoặc Google)]
          │
          ├── USER ──► Trang chủ (bệnh cây hay gặp)
          │             │
          │             ├─► Chẩn đoán: chụp/tải ảnh → chỉnh sửa (cắt vuông, xoay, sáng, tương phản)
          │             │     → chọn loại cây → AI service trả top-3 + xác suất
          │             │     → backend ánh xạ nhãn + áp ngưỡng → Phát hiện bệnh | Cây khoẻ mạnh | Chưa xác định
          │             │     → tự lưu vào Lịch sử tra cứu
          │             │     → (tuỳ chọn) Lưu vào cây trồng → cập nhật tình trạng cây → nhắc kiểm tra lại
          │             │     → (tuỳ chọn) Xem chi tiết bệnh
          │             ├─► Lịch sử tra cứu: xem, tìm, lọc, gắn vào cây, chẩn đoán lại, xoá (hoàn tác 5 giây)
          │             ├─► Cây trồng của tôi: thêm/sửa/xoá cây, dòng thời gian, cập nhật điều trị, ghi chú, chẩn đoán lại
          │             └─► Thư viện bệnh: lọc theo cây, tìm, xem chi tiết, chẩn đoán từ trang bệnh
          │
          └── ADMIN ─► Dashboard (mặc định sau đăng nhập): người dùng, hoạt động chẩn đoán, chất lượng mô hình
                        └─► Danh mục: loại cây, bệnh (Nháp/Công khai/Ẩn), ánh xạ nhãn mô hình
```

## 6. Use case tổng quát

Đánh số theo **Chương 4 v0.2, Bảng 4.1**. Function List v0.2 đánh số UC khác, khi lệch thì lấy theo Chương 4.

| Mã | Use case | Tác nhân | Feature (thư mục docs) | Mã chức năng (Function List v0.2) |
|---|---|---|---|---|
| UC01 | Xác thực tài khoản | USER, ADMIN | `auth` | AUTH-01 → AUTH-05 |
| UC02 | Chẩn đoán bệnh qua hình ảnh | USER | `diagnosis` | DIAG-01 → DIAG-09 |
| UC03 | Xem lịch sử tra cứu | USER | `history` | HIST-01 → HIST-03 |
| UC04 | Quản lý cây trồng của tôi | USER | `my_plants` | PLANT-01 → PLANT-06, NOTI-01 → NOTI-04 (tạm gắn, xem OQ-16) |
| UC05 | Xem bệnh cây hay gặp | USER | `disease_library` | LIB-01 → LIB-04 (DIAG-05 dùng chung trang chi tiết bệnh) |
| UC06 | Quản lý danh mục cây trồng & bệnh | ADMIN | `catalog` | ADM-01, ADM-02, ADM-07 |
| UC07 | Xem dashboard & báo cáo | ADMIN | `dashboard` | ADM-03, ADM-04, ADM-06 |

Function List v0.2 chỉ gắn ADM-01 → ADM-04 vào UC. **ADM-06** (xuất dữ liệu ảnh) và **ADM-07** (quản lý phiên bản mô hình) đều mức Could, được gắn tạm vào UC07 và UC06. **ADM-05** (quản lý người dùng) chưa gắn UC nào, xem OQ-13.

Quan hệ trên sơ đồ UC (bản 18/11):
- «extend» **Xem chi tiết bệnh cây** → Xem bệnh cây hay gặp, và → Chẩn đoán bệnh qua hình ảnh.
- «extend» **Lưu kết quả vào cây trồng** → Chẩn đoán bệnh qua hình ảnh.
- «extend» **Đánh giá kết quả chẩn đoán** → Chẩn đoán bệnh qua hình ảnh. Trong Chương 4 v0.2, chức năng này đã bị gạch, xem **OQ-14**.

## 7. Function list mức high-level

Theo Function List v0.2 (26/10/2026): 38 chức năng, gồm 18 Must, 10 Should, 10 Could. Phạm vi cam kết là Must + Should. Các chức năng Could đưa vào Hướng phát triển nếu không kịp.

| Phân hệ | Tổng | Must | Should | Could |
|---|---|---|---|---|
| AUTH — Tài khoản | 5 | 3 | 1 | 1 |
| DIAG — Chẩn đoán bệnh bằng ảnh | 9 | 5 | 2 | 2 |
| HIST — Lịch sử tra cứu | 3 | 2 | 1 | 0 |
| PLANT — Cây trồng của tôi | 6 | 4 | 1 | 1 |
| LIB — Thư viện bệnh cây | 4 | 1 | 1 | 2 |
| NOTI — Nhắc chăm sóc & thông báo | 4 | 0 | 3 | 1 |
| ADM — Quản trị & dashboard | 7 | 3 | 1 | 3 |

> Function List v0.2 được lập **trước** Chương 4 v0.2. Một số điểm trong đó đã được thay thế: vai trò Khách, đăng nhập bằng SĐT, app mobile với thông báo đẩy FCM, mẫu nhắc theo bệnh. Bảng đối chiếu ở `docs/_shared/open_questions.md` mục D. Mức ưu tiên Must/Should/Could vẫn dùng được.

## 8. Quy tắc nghiệp vụ chung

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-G01 | Mọi chức năng trừ xác thực đều yêu cầu đăng nhập; truy cập khi chưa đăng nhập bị chuyển tới màn đăng nhập | C4 4.2.2, UC01 |
| BR-G02 | Tài khoản ADMIN được tạo sẵn bằng seed, không đăng ký qua giao diện | C4 4.2.2; Class/ERD 4.1 |
| BR-G03 | Người dùng chỉ đọc và sửa dữ liệu thuộc về chính mình (cùng `user_id`) | Class/ERD 6.5 |
| BR-G04 | Kết quả AI luôn kèm độ tin cậy (%). Dưới ngưỡng thì trả "Chưa xác định", không đưa tên bệnh ra như kết luận | C4 Bảng 4.4; FL DIAG-04 |
| BR-G05 | Thông tin bệnh và hướng xử lý chỉ mang tính tham khảo, luôn kèm lưu ý | C4 UC05 bước 6; FL DIAG-05 |
| BR-G06 | Mỗi lớp đầu ra của mô hình, kể cả lớp "khoẻ mạnh", phải được ánh xạ tới đúng một nhãn trong danh mục trước khi mô hình được đưa vào dùng. Khi đổi mô hình chỉ cập nhật ánh xạ, không sửa mã nguồn | C4 sau Bảng 4.10; Class/ERD 4.5 |
| BR-G07 | Dữ liệu đã được tham chiếu thì không xoá cứng: lượt chẩn đoán chỉ xoá mềm; bệnh hoặc loại cây đã có dữ liệu chẩn đoán chỉ được ẩn | C4 4.5; Class/ERD 6.3 |
| BR-G08 | Tình trạng sức khoẻ cây thay đổi theo Bảng 4.8. Kết quả "Chưa xác định" không làm đổi tình trạng | C4 Bảng 4.8 |
| BR-G09 | Giao diện tiếng Việt, xưng "bạn", câu ngắn. Kết quả AI dùng từ "có khả năng", không khẳng định tuyệt đối | design/00; FL NFR |

Yêu cầu phi chức năng: Chương 4 mục 4.3 mới là khung. Function List v0.2 có gợi ý ban đầu, **chưa chốt**: từ lúc gửi ảnh tới khi có kết quả không quá 3 giây trên mạng 4G; suy luận trên server không quá 1 giây/ảnh bằng CPU; mật khẩu băm bcrypt, xác thực JWT; từ màn hình chính tới kết quả không quá 3 thao tác.

## 9. Nguồn tài liệu và thứ tự ưu tiên

Đường dẫn tính từ `code/`. **Tài liệu mới hơn thắng ở phần nó bao phủ.** Mọi mâu thuẫn đã phát hiện được ghi ở `docs/_shared/open_questions.md` và **chưa được coi là chốt**.

| Nguồn | Đường dẫn | Ngày | Dùng cho |
|---|---|---|---|
| ERD chuẩn (Visual Paradigm) | `../diagrams/Diagrams chuẩn/Entity Relationship Diagram.png` | 19/11 | Bản ERD mới nhất. Có điểm lệch, xem DC-01 → DC-12 |
| Phân tích Class & CSDL | `../Phân tích Class và ERD/01_Phan_tich_Class_va_CSDL.docx` | 08/11, sửa 19/11 | 11 lớp, bảng, ràng buộc, quy tắc ở tầng ứng dụng, luồng ghi dữ liệu |
| UC tổng quan chuẩn | `../diagrams/Diagrams chuẩn/UC Tổng quan.png` | 18/11 | Tác nhân, quan hệ extend |
| SQL / DBML / PlantUML / mã sinh | `../Phân tích Class và ERD/04_…sql`, `07_…dbml`, `_nguon_sinh_tu_dong/` | 08/11 | Bản máy đọc được của CSDL. **Chưa cập nhật** theo các sửa ngày 19/11 |
| Chương 4 v0.2 | `../doc/Chuong_4_Phan_tich_yeu_cau_va_thiet_ke_he_thong_v0.2.docx` | 05/11 | SRS chính: đặc tả UC01–UC07, Bảng 4.4, 4.6, 4.8, 4.12 |
| Function List v0.2 | `../Functions List/Function_List_He_thong_QLSKCT_v0.2.xlsx` | 26/10 | Mã chức năng, mức ưu tiên, luồng chẩn đoán, hợp đồng API AI, NFR gợi ý |
| Design system | `../design/` | — | Toàn bộ quy tắc giao diện |
| Đề cương sơ lược | `../Đề cương sơ lược ĐATN.md` | 09/2026 | Bối cảnh. Phạm vi đã thu hẹp sau đề cương |
| Bài báo gốc | `../Báo gốc.pdf` | — | Đặc điểm mô hình: đầu vào 224×224×3, phân loại đóng, softmax |
| Báo cáo mẫu | `../REF/` | — | Định dạng báo cáo, không dùng cho nghiệp vụ |

**Không dùng** (đã có bản mới hơn): `../diagrams/UC_tong_quan*.{png,svg,drawio}`, `../diagrams/So_do_lop_thuc_the.*`, `../diagrams/Thiet_ke_CSDL.*`, `../Functions List/…v0.1.xlsx`.

## 10. Điểm còn thiếu, cần BA xác nhận

Danh sách đầy đủ, có ID và mức ảnh hưởng, ở `docs/_shared/open_questions.md`. Các điểm chặn việc code nhiều nhất:
- **OQ-05**: chọn loại cây khi chẩn đoán là bắt buộc hay tuỳ chọn (phụ thuộc mô hình chung hay mô hình theo từng cây).
- **OQ-06**: ngưỡng độ tin cậy và thời gian chờ AI service.
- **OQ-14**: có giữ chức năng đánh giá kết quả chẩn đoán không.
- **DC-05 → DC-08**: ERD 19/11 lệch với tài liệu Class/CSDL ở các bảng `model_labels`, `diagnosis_predictions`, `plant_logs`.
- **TD-01**: chưa chọn nơi lưu trữ ảnh.

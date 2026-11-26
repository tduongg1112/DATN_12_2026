# Project overview — Business context

> Bước 1.1 của framework (BA). Tổng hợp từ các nguồn ở mục 9, **không thêm nghiệp vụ mới**. Nội dung nào còn "Chưa chốt" được ghi ở `docs/_shared/open_questions.md`.
> Cập nhật: 21/11/2026, đã áp các quyết định build-first ngày 20/11 · Người duyệt: Nguyễn Tùng Dương

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
| Nhắc kiểm tra lại, tưới, bón (hệ thống gợi ý, người dùng xác nhận) và thông báo trong ứng dụng (OQ-09, OQ-15, OQ-16) | Chatbot LLM/RAG, tra cứu bệnh theo triệu chứng |
| | Nhận dạng sâu hại hoặc côn trùng, ảnh vệ tinh hoặc drone, IoT |

*Nguồn: Chương 4 mục 4.1; Function List v0.2, sheet "Đã loại khỏi phạm vi"; Đề cương mục 6.*

**Hoãn hoặc bỏ ở bản build này (quyết định 20/11):** đánh giá kết quả chẩn đoán DIAG-07 (OQ-14); đồng ý chia sẻ ảnh và xuất ảnh cho nhóm AI ADM-06 (OQ-12); xuất báo cáo dashboard (OQ-11); quên mật khẩu AUTH-05 (OQ-03); bật/tắt nhắc theo từng cây NOTI-04 (OQ-09); mục "Dành cho cây của bạn" (OQ-10); chỉ số "Tổng số người dùng" (OQ-25); thông báo qua email hoặc đẩy (OQ-09).

## 3. Đối tượng sử dụng (user roles)

| Vai trò | Mã | Mô tả | Cách tạo tài khoản |
|---|---|---|---|
| Người dùng | `USER` | Người trồng, người yêu cây | Tự đăng ký bằng email, hoặc đăng nhập Google lần đầu |
| Quản trị viên | `ADMIN` | Quản lý danh mục cây, bệnh và nội dung; xem dashboard. Dùng được mọi chức năng của Người dùng (OQ-22) | Khởi tạo sẵn bằng script seed, không đăng ký qua giao diện |

- Không có chế độ khách. Trừ bước xác thực, mọi chức năng đều yêu cầu đăng nhập. *(Chương 4, mục 4.2.2)*
- Mô-đun nhận dạng bệnh (AI service) là thành phần bên trong hệ thống, **không phải tác nhân**. *(Chương 4, mục 4.2.2)*
- Sơ đồ UC tổng quan bản 18/11 vẽ 3 tác nhân USER, MEMBER, ADMIN có quan hệ tổng quát hoá, khác với 2 tác nhân trong Chương 4. **Quyết định 20/11 (OQ-22):** theo sơ đồ, ADMIN kế thừa mọi chức năng của USER; hệ thống vẫn chỉ có 2 role. Mỗi người, kể cả ADMIN, chỉ thấy dữ liệu cá nhân của mình (BR-G03). Chương 4 mục 4.2.2 cần sửa cho khớp.

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
          │             │     → chọn loại cây (bắt buộc, OQ-05) → AI service trả top-3 + xác suất
          │             │     → backend ánh xạ nhãn + áp ngưỡng → Phát hiện bệnh | Cây khoẻ mạnh | Chưa xác định
          │             │     → tự lưu vào Lịch sử tra cứu
          │             │     → (tuỳ chọn) Lưu vào cây trồng → cập nhật tình trạng cây → gợi ý nhắc kiểm tra lại (người dùng xác nhận)
          │             │     → (tuỳ chọn) Xem chi tiết bệnh
          │             ├─► Lịch sử tra cứu (lượt đã hoàn tất): xem, tìm, lọc, gắn vào cây, chẩn đoán lại, xoá (hoàn tác 5 giây)
          │             ├─► Cây trồng của tôi: thêm/sửa/xoá cây, dòng thời gian, cập nhật điều trị, ghi chú, chẩn đoán lại,
          │             │     nhắc việc (gợi ý tưới/bón), xem thông báo trong ứng dụng
          │             ├─► Hồ sơ: sửa họ tên, ảnh đại diện, đổi mật khẩu (AUTH-04)
          │             └─► Thư viện bệnh: lọc theo cây, tìm, xem chi tiết, chẩn đoán từ trang bệnh
          │
          └── ADMIN ─► Dashboard (mặc định sau đăng nhập): người dùng, hoạt động chẩn đoán, chất lượng mô hình
                        ├─► Danh mục: loại cây, bệnh (Nháp/Công khai/Ẩn), ánh xạ nhãn mô hình
                        └─► Mọi chức năng của USER (OQ-22)
```

## 6. Use case tổng quát

Đánh số theo **Chương 4 v0.2, Bảng 4.1**. Function List v0.2 đánh số UC khác, khi lệch thì lấy theo Chương 4.

| Mã | Use case | Tác nhân | Feature (thư mục docs) | Mã chức năng (Function List v0.2) |
|---|---|---|---|---|
| UC01 | Xác thực tài khoản | USER, ADMIN | `auth` | AUTH-01 → AUTH-05 |
| UC02 | Chẩn đoán bệnh qua hình ảnh | USER | `diagnosis` | DIAG-01 → DIAG-09 |
| UC03 | Xem lịch sử tra cứu | USER | `history` | HIST-01 → HIST-03 |
| UC04 | Quản lý cây trồng của tôi | USER | `my_plants` | PLANT-01 → PLANT-06, NOTI-01 → NOTI-04 (gắn theo OQ-16) |
| UC05 | Xem bệnh cây hay gặp | USER | `disease_library` | LIB-01 → LIB-04 (DIAG-05 dùng chung trang chi tiết bệnh) |
| UC06 | Quản lý danh mục cây trồng & bệnh | ADMIN | `catalog` | ADM-01, ADM-02, ADM-07 |
| UC07 | Xem dashboard & báo cáo | ADMIN | `dashboard` | ADM-03, ADM-04, ADM-06 |

Function List v0.2 chỉ gắn ADM-01 → ADM-04 vào UC. **ADM-06** (xuất dữ liệu ảnh) và **ADM-07** (quản lý phiên bản mô hình) đều mức Could, được gắn tạm vào UC07 và UC06. **ADM-05** (quản lý người dùng) chưa gắn UC nào, xem OQ-13.

Quan hệ trên sơ đồ UC (bản 18/11):
- «extend» **Xem chi tiết bệnh cây** → Xem bệnh cây hay gặp, và → Chẩn đoán bệnh qua hình ảnh.
- «extend» **Lưu kết quả vào cây trồng** → Chẩn đoán bệnh qua hình ảnh.
- «extend» **Đánh giá kết quả chẩn đoán** → Chẩn đoán bệnh qua hình ảnh. Trong Chương 4 v0.2, chức năng này đã bị gạch. **Quyết định 20/11 (OQ-14):** bỏ ở bản build này; sơ đồ cần sửa sau.

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
>
> Bản build này (quyết định 20/11): làm thêm AUTH-04 (OQ-04). Không làm AUTH-05, DIAG-07, ADM-06, NOTI-04 và xuất báo cáo (xem mục 2).

## 8. Quy tắc nghiệp vụ chung

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-G01 | Mọi chức năng trừ xác thực đều yêu cầu đăng nhập; truy cập khi chưa đăng nhập bị chuyển tới màn đăng nhập | C4 4.2.2, UC01 |
| BR-G02 | Tài khoản ADMIN được tạo sẵn bằng seed, không đăng ký qua giao diện | C4 4.2.2; Class/ERD 4.1 |
| BR-G03 | Người dùng chỉ đọc và sửa dữ liệu thuộc về chính mình (cùng `user_id`) | Class/ERD 6.5 |
| BR-G04 | Kết quả AI luôn kèm độ tin cậy (%). Dưới ngưỡng thì trả "Chưa xác định", không đưa tên bệnh ra như kết luận. Một ngưỡng chung cho mọi loại cây, để trong cấu hình; giá trị chờ nhóm AI | C4 Bảng 4.4; FL DIAG-04; OQ-06 |
| BR-G05 | Thông tin bệnh và hướng xử lý chỉ mang tính tham khảo, luôn kèm lưu ý | C4 UC05 bước 6; FL DIAG-05 |
| BR-G06 | Mỗi lớp đầu ra của mô hình, kể cả lớp "khoẻ mạnh", phải được ánh xạ tới đúng một nhãn trong danh mục trước khi mô hình được đưa vào dùng. Khi đổi mô hình chỉ cập nhật ánh xạ, không sửa mã nguồn | C4 sau Bảng 4.10; Class/ERD 4.5 |
| BR-G07 | Dữ liệu đã được tham chiếu thì không xoá cứng: lượt chẩn đoán chỉ xoá mềm; bệnh hoặc loại cây đã có dữ liệu chẩn đoán chỉ được ẩn | C4 4.5; Class/ERD 6.3 |
| BR-G08 | Tình trạng sức khoẻ cây thay đổi theo Bảng 4.8. Kết quả "Chưa xác định" không làm đổi tình trạng. Xoá mềm hoặc hoàn tác lượt chẩn đoán cũng không làm đổi | C4 Bảng 4.8; OQ-24 |
| BR-G09 | Giao diện tiếng Việt, xưng "bạn", câu ngắn. Kết quả AI dùng từ "có khả năng", không khẳng định tuyệt đối | design/00; FL NFR |
| BR-G10 | ADMIN dùng được mọi chức năng của USER và có thêm khu quản trị. BR-G03 vẫn áp dụng với ADMIN | UC-png 18/11; OQ-22 |
| BR-G11 | Thông báo chỉ gửi trong ứng dụng. Nhắc do hệ thống gợi ý chỉ được tạo khi người dùng xác nhận | OQ-09, OQ-15 |
| BR-G12 | Lịch sử tra cứu và thống kê chỉ tính lượt chẩn đoán đã hoàn tất (`COMPLETED`) | OQ-23 |

Yêu cầu phi chức năng: Chương 4 mục 4.3 mới là khung. Function List v0.2 có gợi ý ban đầu, **chưa chốt**: từ lúc gửi ảnh tới khi có kết quả không quá 3 giây trên mạng 4G; suy luận trên server không quá 1 giây/ảnh bằng CPU; mật khẩu băm bcrypt, xác thực JWT; từ màn hình chính tới kết quả không quá 3 thao tác.

## 9. Nguồn tài liệu và thứ tự ưu tiên

Đường dẫn tính từ `code/`. **Tài liệu mới hơn thắng ở phần nó bao phủ.** Mọi mâu thuẫn đã phát hiện được ghi ở `docs/_shared/open_questions.md`. **Quyết định ngày 20/11 (build-first) ở đó thắng các nguồn dưới đây** ở phần chúng đề cập. Các nguồn chưa được sửa theo (DC-12).

| Nguồn | Đường dẫn | Ngày | Dùng cho |
|---|---|---|---|
| ERD chuẩn (Visual Paradigm) | `../diagrams/Diagrams chuẩn/Entity Relationship Diagram.png` | 19/11 | Bản ERD mới nhất nhưng chưa đầy đủ. Lệch đã chốt theo `data_model.md` (DC-01 → DC-11) |
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

## 10. Điểm còn mở

Danh sách đầy đủ, có ID và mức ảnh hưởng, ở `docs/_shared/open_questions.md`. Các điểm chặn chính đã được chốt ngày 20/11 (build-first). Còn lại:
- **OQ-06 (giá trị)**: giá trị ngưỡng độ tin cậy, chờ nhóm AI. Khi dev dùng tạm 0.6 (chốt 22/11).
- **OQ-05** (đổi 22/11): chọn loại cây khi chẩn đoán là **bắt buộc**. Nhóm AI báo mô hình cho kết quả tốt hơn nhiều khi biết loại cây. Luôn gửi `crop_code`; `diagnoses.crop_id` NOT NULL.
- **OQ-18** (chốt 22/11): mô hình chạy trên server. Người dùng máy tính và điện thoại đều gửi ảnh lên backend để chẩn đoán. Chạy ngay trên điện thoại (DIAG-09) ngoài phạm vi bản build.
- **OQ-39** (chốt 22/11): bản build này tập trung giao diện máy tính; tối ưu cho điện thoại và đóng gói app làm sau, khi luồng trên máy tính đã ổn.
- **OQ-13** (chốt 22/11): không có chức năng admin khoá tài khoản.
- **OQ-07** (hoãn): cách hiểu "mức độ". Bản build dùng mức độ nguy hại của bệnh.
- **OQ-19**: nguồn nội dung phòng trị, chưa chốt, không chặn code. Khi dev dùng nội dung mẫu (OQ-36).
- **OQ-01** (chốt 22/11): dùng tiền điều kiện "đã đăng nhập", không vẽ «include». **OQ-20, OQ-21**: chỉ liên quan báo cáo.
- Câu thông báo cho AUTH-04 chưa có trong nguồn: soạn ở bước 6, Dương duyệt.
- **DC-12**: cập nhật lại Chương 4, tài liệu Class/CSDL, sơ đồ ERD và UC theo quyết định 20/11.

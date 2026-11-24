# Dữ liệu thật cần thay cho dữ liệu tạm

> **Mục đích (Dương yêu cầu 23/11):** liệt kê mọi chỗ hệ thống đang chạy bằng dữ liệu tạm, để nhóm thống nhất với nhóm AI rồi gửi lại giá trị thật. Khi đã build xong các feature, Claude thay theo bảng này.
> **Cách dùng:** điền cột "Giá trị thật" (hoặc gửi file theo mẫu ở mục 4), đổi "Trạng thái" thành `Đã có`. Mục nào chưa quyết thì để trống.
> **Cập nhật:** mỗi khi một feature thêm dữ liệu tạm mới, Claude thêm dòng vào đây cùng lượt code.

Người cung cấp: **AI** = nhóm AI (Phan Lê Huy, Nguyễn Chí Hiếu) · **Nhóm** = cả nhóm, nguồn nội dung theo OQ-19 (Cục BVTV hoặc trung tâm khuyến nông) · **D** = Dương.

## 1. Mô hình và AI service (nhóm AI)

| # | Dữ liệu | Hiện đang dùng (tạm) | Nơi trong hệ thống | Người cung cấp | Giá trị thật | Trạng thái |
|---|---|---|---|---|---|---|
| A1 | **Danh sách nhãn của mô hình**: mỗi lớp gồm `class_code`, loại cây, là lớp khoẻ hay lớp bệnh, bệnh tương ứng | 11 nhãn mẫu kiểu PlantVillage (2–3 nhãn mỗi loại cây); **mã của lúa là giả định** | Bảng `model_labels`; seed `backend/src/database/seeds/dev-sample-seed.ts` (`SAMPLE_LABELS`). Mỗi loại cây phải có **đúng một** nhãn khoẻ | AI | | Chưa có |
| A2 | **Ngưỡng độ tin cậy**: dưới ngưỡng thì kết quả "Chưa xác định"; cũng dùng cho "Đang phổ biến" | `0.6` | `AI_CONFIDENCE_THRESHOLD` trong `backend/.env` (OQ-06, TD-26) | AI | | Chưa có |
| A3 | Số dự đoán trả về (`top_k`) và thời gian chờ tối đa | `3`; `15000` ms (C4 UC02 10.1 ghi "define sau") | `AI_TOP_K`, `AI_TIMEOUT_MS` | AI | | Chưa có |
| A4 | **Mã loại cây gửi cho mô hình** (`crop_code`) | `RICE`, `CORN`, `TOMATO`, `CHILI`, `POTATO` | Cột `crops.code`; seed `base-seed.ts` | AI | | Chưa có |
| A5 | Hợp đồng `POST /predict`: tên trường, dạng JSON trả về, mã lỗi | Theo `technical_overview.md` mục 5: gửi `image`, `crop_code`, `top_k`; nhận `model_version`, `inference_ms`, `predictions[{class_code, probability}]` giảm dần, `heatmap_url` tuỳ chọn; lỗi 400/422 ảnh hỏng, 503 quá tải | `backend/src/modules/diagnosis/ai/http-ai-client.ts` | AI | | Chưa có |
| A6 | Dạng JSON của `GET /labels` | Mảng chuỗi `class_code` | `http-ai-client.ts` (TD-19) | AI | | Chưa có |
| A7 | Ảnh đầu vào mô hình chấp nhận | App gửi ảnh vuông JPEG, cạnh tối đa 1600 px, ≤ 10 MB; mô hình tự resize 224×224 | `frontend/lib/diagnosis/image-edit.ts`, `lib/device/image.ts` (TD-17) | AI | | Chưa có |
| A8 | Địa chỉ và cách chạy AI service | Chưa có; backend dùng AI giả (`AI_MODE=mock`) | `AI_MODE`, `AI_SERVICE_URL` (TD-04) | AI | | Chưa có |
| A9 | Chuỗi `model_version` | `mock-1` | Cột `diagnoses.model_version` (tối đa 50 ký tự) | AI | | Chưa có |

## 2. Danh mục bệnh và loại cây (cả nhóm)

Lần build này nhập bằng seed. Khi làm feature `catalog`, ADMIN nhập và sửa qua màn quản trị.

| # | Dữ liệu | Hiện đang dùng (tạm) | Nơi trong hệ thống | Người cung cấp | Giá trị thật | Trạng thái |
|---|---|---|---|---|---|---|
| B1 | **Danh sách bệnh** của từng loại cây: tên thường gọi, tác nhân, nhóm tác nhân (nấm, vi khuẩn, virus, côn trùng/nhện hại, sinh lý), mức độ nguy hại (thấp, trung bình, cao) | 6 bệnh mẫu chép từ SQL 04 (mỗi loại cây 1, cà chua 2) | Bảng `diseases`; `dev-sample-seed.ts` (`SAMPLE_DISEASES`) | Nhóm + AI (phải khớp A1) | | Chưa có |
| B2 | **Nội dung từng bệnh**: mô tả ngắn (≤ 500 ký tự), triệu chứng, nguyên nhân và điều kiện phát sinh, biện pháp phòng ngừa, biện pháp xử lý. Văn bản thuần, mỗi ý một dòng | Claude soạn mẫu (OQ-36), **không dùng cho demo** | `dev-sample-content.ts` (`SAMPLE_DISEASE_CONTENT`) | Nhóm (OQ-19) | | Chưa có |
| B3 | Ảnh minh hoạ từng bệnh (JPG/PNG ≤ 10 MB, kèm chú thích, ảnh đầu tiên là ảnh bìa) | Chưa có ảnh nào; giao diện hiện ảnh thay thế | Bảng `disease_images` | Nhóm | | Chưa có |
| B4 | **Số ngày nên kiểm tra lại** sau khi phát hiện từng bệnh (gợi ý nhắc "Kiểm tra lại") | `7` ngày cho cả 6 bệnh mẫu (OQ-52) | Cột `diseases.recheck_days`; seed dev (đợt 2 `my_plants`) | Nhóm | | Chưa có |
| B5 | Bệnh nổi bật trên trang chủ | "Bệnh mốc sương" (cà chua) | Cột `diseases.is_featured` | Nhóm | | Chưa có |
| B6 | **Gợi ý chăm sóc phòng bệnh** của từng loại cây (hiện ở kết quả "Cây khoẻ mạnh") | Claude soạn mẫu (OQ-41), **không dùng cho demo** | Cột `crops.care_guide`; `dev-sample-content.ts` (`SAMPLE_CROP_CARE_GUIDES`) | Nhóm | | Chưa có |
| B7 | **Chu kỳ tưới, bón** (ngày) của từng loại cây (gợi ý nhắc tưới, bón) | Tưới/bón: Lúa —/20, Ngô 3/21, Cà chua 2/14, Ớt 2/14, Khoai tây 3/14 (OQ-52) | Cột `crops.watering_interval_days`, `fertilizing_interval_days`; seed dev (đợt 2 `my_plants`) | Nhóm | | Chưa có |
| B8 | Mô tả, ảnh của từng loại cây | Trống | Cột `crops.description`, `crops.image_url` | Nhóm | | Chưa có |
| B9 | Ghi nguồn tham khảo cho nội dung bệnh | Chưa có chỗ lưu (DC-04 bỏ `source_refs`) | — (OQ-19 chưa chốt) | Nhóm | | Chưa có |

## 3. Tham số đang đặt tạm (đổi được bằng cấu hình)

| # | Tham số | Giá trị hiện tại | Nơi | Người quyết | Giá trị thật | Trạng thái |
|---|---|---|---|---|---|---|
| C1 | "Đang phổ biến": số bệnh, số ngày | 3 bệnh, 30 ngày | `LIBRARY_TRENDING_LIMIT`, `LIBRARY_TRENDING_DAYS` (OQ-28, TD-24) | D | | Đã chốt cho bản build, đổi được |
| C2 | Nén ảnh trước khi gửi | Cạnh dài 1600 px, JPEG 0.85 | `frontend/lib/device/image.ts` (TD-17) | D + AI | | Chờ AI xác nhận cùng A7 |
| C3 | Tần suất job gửi nhắc | Mỗi 5 phút | `REMINDER_CRON` (TD-28, đợt 2 `my_plants`) | D | | Đã chốt cho bản build, đổi được |
| C4 | Tài khoản ADMIN đầu tiên | Lấy từ `.env` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | D | (không ghi vào file này) | Dùng khi deploy |

## 4. Mẫu gửi lại (Excel hoặc CSV)

**Sheet `labels` (A1)** — một dòng một lớp của mô hình:

| class_code | crop_code | label_type | disease_name |
|---|---|---|---|
| Tomato___Late_blight | TOMATO | DISEASE | Bệnh mốc sương |
| Tomato___healthy | TOMATO | HEALTHY | |

**Sheet `diseases` (B1 → B5)** — một dòng một bệnh, `disease_name` trùng với sheet `labels`:

| crop_code | disease_name | pathogen | pathogen_group | severity | recheck_days | featured | summary | symptoms | causes | prevention | treatment |
|---|---|---|---|---|---|---|---|---|---|---|---|

`pathogen_group`: `FUNGUS` · `BACTERIA` · `VIRUS` · `PEST` · `PHYSIOLOGICAL`. `severity`: `LOW` · `MEDIUM` · `HIGH`. Các cột nội dung: mỗi ý xuống một dòng trong ô.

**Sheet `crops` (A4, B6 → B8)**:

| crop_code | name | watering_interval_days | fertilizing_interval_days | care_guide | description |
|---|---|---|---|---|---|

Ảnh (B3, B8): thư mục ảnh đặt tên theo `crop_code` và `disease_name`, kèm file chú thích.

## 5. Khi nhận được dữ liệu thật

1. Claude chuyển các sheet thành một seed dữ liệu thật mới (khác seed dev). Seed dev và nội dung Claude soạn chỉ còn dùng khi dev.
2. Đặt các giá trị cấu hình (A2, A3, A8) vào `backend/.env.example`. Dương tự sửa `backend/.env` (Claude không đọc, không sửa `.env`).
3. Chạy lại migration, seed, toàn bộ test. Kiểm tra mock AI bằng danh sách nhãn mới, rồi nghiệm thu với mô hình thật (`AI_MODE=http`) cùng nhóm AI.
4. Cập nhật `open_questions.md` (OQ-06, OQ-19, TD-04, TD-19) và bảng này.

## Lịch sử thay đổi

| Ngày | Nội dung | Người |
|---|---|---|
| 23/11/2026 | Tạo mới theo yêu cầu của Dương, sau `auth`, `disease_library`, `diagnosis`, `history` và tài liệu `my_plants` | Claude |

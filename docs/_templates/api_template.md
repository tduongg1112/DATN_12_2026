# API — <feature>

> **Trạng thái:** DRAFT · Sinh từ `specs_<feature>.md` (phiên bản …) · Định dạng response và lỗi: theo TD-05 *(ghi "tạm" nếu chưa chốt)*

## Tổng quan
| # | Method | Path | Mô tả | Quyền | Phục vụ (US/BR) |
|---|---|---|---|---|---|

## <METHOD> <path>
- **Quyền:** USER / ADMIN / công khai. **Sở hữu dữ liệu:** có kiểm tra / không
- **Request:** params, query, body (bảng: trường | kiểu | bắt buộc | validation | nguồn BR)
- **Response 2xx:** ví dụ JSON và mô tả từng trường
- **Lỗi:**
  | HTTP | Khi nào | Câu thông báo (nguyên văn trong specs) | BR |
  |---|---|---|---|
- **Ghi dữ liệu:** bảng nào, có transaction không
- **Ghi chú:**

## Tích hợp ngoài (nếu có)
AI service, Google OAuth…: endpoint, thời gian chờ, cách xử lý lỗi.

## Điểm chưa chốt

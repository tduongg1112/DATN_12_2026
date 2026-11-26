# Template — Nội dung nhắc việc và thông báo (`my_plants`)

> **Trạng thái:** REVIEWED (build-first 23/11) · Toàn bộ là câu Claude soạn ✎, Dương duyệt 23/11 (OQ-51), trừ ý "nhắc người dùng chụp lại cây để theo dõi tiến triển" lấy từ C4 UC04 10f.
> Kênh duy nhất: thông báo trong ứng dụng (OQ-09). Không email, không đẩy.

## 1. Tiêu đề lịch nhắc (`reminders.title`, tối đa 150 ký tự)

Lưu lúc tạo nhắc, không chứa tên cây (tên cây có thể đổi sau).

| Loại | `source` | Tiêu đề ✎ |
|---|---|---|
| `RECHECK` | `USER` (R1) hoặc `SYSTEM` (R2) | Kiểm tra lại cây |
| `WATERING` | `SYSTEM` (R2) | Tưới nước |
| `FERTILIZING` | `SYSTEM` (R2) | Bón phân |

## 2. Thông báo khi nhắc đến hạn (`notifications`, J1)

Ghép lúc gửi, lấy **tên cây hiện tại**. `{plant}` là `plants.name` (tối đa 100 ký tự), nên tiêu đề và nội dung luôn vừa cột (150, 500).

| Loại | Tiêu đề ✎ | Nội dung ✎ |
|---|---|---|
| `RECHECK` | Đến lúc kiểm tra lại {plant} | Hãy chụp lại {plant} để theo dõi tiến triển của cây. |
| `WATERING` | Đến lịch tưới nước cho {plant} | Đã đến lịch tưới nước cho {plant}. |
| `FERTILIZING` | Đến lịch bón phân cho {plant} | Đã đến lịch bón phân cho {plant}. |
| `OTHER` | Lịch nhắc cho {plant} | `reminders.title` |

`OTHER` có trong tập giá trị (`data_model.md`) nhưng lần build này không tạo; mẫu chỉ để job không lỗi nếu gặp.

## 3. Thông báo khác đã có

- Nhãn mô hình lạ, gửi ADMIN: `docs/diagnosis/api_diagnosis.md` D1 (OQ-40).

## Lịch sử thay đổi

| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|
| 23/11/2026 | 0.1 | Soạn mới | Claude |

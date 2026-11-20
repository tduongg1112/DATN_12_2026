# Database design — <feature>

> **Trạng thái:** DRAFT · Bảng và cột định nghĩa ở `docs/_shared/data_model.md`. File này **chỉ mô tả cách feature dùng chúng**, không định nghĩa lại.

## 1. Bảng sử dụng
| Bảng | Thao tác (C/R/U/D) | Cột dùng | Ghi chú |
|---|---|---|---|

## 2. Truy vấn chính
Mỗi truy vấn: mục đích (US/BR), SQL hoặc mô tả truy vấn TypeORM, chỉ mục dùng tới (`data_model.md` mục 4).

## 3. Giao dịch
Các thao tác nhiều bảng và thứ tự ghi.

## 4. Migration và seed
Thay đổi so với migration hiện có (nếu có). Mọi thay đổi schema phải đã được chốt trong `open_questions.md`.

## 5. Điểm chưa chốt (DC-xx, OQ-xx)

# Specs — <Tên tính năng> (`<feature>`)

> **Trạng thái:** DRAFT · *(VERIFIED: ngày …, người duyệt …)*
> **UC:** UCxx · **Mã chức năng:** … · **Nguồn:** C4 Bảng 4.x; ERD mục …; FL …
> Mọi US/BR phải có nguồn. Thiếu hoặc mâu thuẫn thì ghi vào mục 7, không tự bổ sung.

## 1. Context (ngữ cảnh)
- Hệ thống: 1–2 câu (lấy từ `project_overview.md`).
- Mục tiêu của feature:
- Vai trò liên quan:
- Feature liên quan hoặc phụ thuộc:

## 2. User stories
| Mã | Là … tôi muốn … để … | Nguồn | Ưu tiên (FL) |
|---|---|---|---|
| US-01 | | | |

## 3. Business rules
| Mã | Quy tắc (câu thông báo chép nguyên văn) | Nguồn |
|---|---|---|
| BR-01 | | |

## 4. Data requirements
- Bảng dùng: … (định nghĩa ở `docs/_shared/data_model.md`, không lặp lại cột)
- Trường hiển thị, nhập liệu, validation:
- Cột đang ⚠ (DC-xx) mà feature đụng tới:

## 5. UI/UX requirements
- Màn hình và khuôn trang (`design_overview.md` mục 2):
- Trạng thái loading, rỗng, lỗi (câu chữ lấy từ phần ngoại lệ):

## 6. Technical requirements
- API, phân quyền, giao dịch, cấu hình, tích hợp (AI service, Google…):
- Phi chức năng (nếu có):

## 7. Điểm chưa chốt
| Mã | Nội dung | Ảnh hưởng tới US/BR |
|---|---|---|

## 8. Checklist verify (bước 5)
- [ ] BA: US và BR đúng nguồn, không sót luồng thay thế hay ngoại lệ, câu chữ đúng nguyên văn
- [ ] Tester: mỗi BR kiểm thử được, có giá trị biên
- [ ] Dev: đủ rõ để code, dữ liệu khớp `data_model.md`
- [ ] Nhóm AI (nếu feature dùng mô hình): đã xác nhận phần liên quan
- [ ] `/cross-check <feature> specs` cho kết quả PASS hoặc PASS CÓ ĐIỀU KIỆN

## Lịch sử thay đổi
| Ngày | Phiên bản | Nội dung | Người |
|---|---|---|---|

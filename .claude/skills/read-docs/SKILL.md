---
name: read-docs
description: Bước 3–4 — đọc tài liệu nguồn (docx, xlsx, sơ đồ ngoài repo) và tách thành specs_<feature>.md theo mẫu, mỗi quy tắc đều ghi nguồn. Dùng khi tạo mới hoặc làm lại specs của một feature.
argument-hint: "<feature>"
disable-model-invocation: true
---

# /read-docs

Feature: `$ARGUMENTS`. Nếu để trống, hỏi lại rồi dừng.

## Chuẩn bị
1. Đọc `docs/README.md`, lấy UC và các mã chức năng của feature.
2. Đọc `project_overview.md` mục 9 để biết nguồn nào mới nhất.
3. Đọc `docs/_shared/open_questions.md` và `docs/_templates/specs_template.md`.
4. Nếu `docs/$ARGUMENTS/specs_$ARGUMENTS.md` đã có: đọc toàn bộ. Giữ phần "Lịch sử thay đổi". Báo trước những chỗ sẽ sửa.

## Đọc nguồn
5. Chuyển nguồn sang dạng text, **ghi file tạm ra ngoài repo** (ví dụ `/tmp`). Không chép file nguồn vào repo.
   - `.docx`: `pandoc "<file>" -t gfm --wrap=none` (nếu có pandoc), hoặc `markitdown "<file>"`.
   - `.xlsx`: Python + `openpyxl`, đọc từng sheet.
   - Ảnh sơ đồ: mở để xem trực tiếp.
   - Không có công cụ nào chạy được thì dừng, báo cho Dương. Không đoán nội dung file.
6. Chỉ lấy phần liên quan tới UC của feature: đặc tả UC, các bảng đi kèm, lớp và bảng CSDL liên quan, các dòng trong Function List.

## Viết specs
7. Viết `docs/$ARGUMENTS/specs_$ARGUMENTS.md` theo mẫu.
   - Mỗi `US-xx` và `BR-xx` có cột **Nguồn** (ví dụ `C4 UC02 bước 8`, `ERD 6.5`, `FL DIAG-04`).
   - Câu thông báo trên giao diện **chép nguyên văn** từ nguồn.
   - Phần dữ liệu chỉ tham chiếu tới `docs/_shared/data_model.md`. Không định nghĩa lại cột.
8. **Không thêm gì không có trong nguồn.** Nếu thiếu, hoặc hai nguồn mâu thuẫn:
   - Ghi vào mục "Điểm chưa chốt" của specs.
   - Thêm hoặc cập nhật mục tương ứng trong `docs/_shared/open_questions.md`, đánh số tiếp theo.
   - **Không tự chọn phương án.**
9. Đặt `Trạng thái: DRAFT`. Cập nhật bảng trạng thái trong `docs/README.md`.

## Báo cáo
10. Tóm tắt: đã thêm hoặc sửa những gì, mỗi phần lấy từ nguồn nào, những điểm chưa chốt mới phát sinh. Gợi ý bước tiếp theo: `/cross-check $ARGUMENTS specs`.

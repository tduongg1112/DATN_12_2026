---
name: review-code
description: Bước 9 — review code AI vừa sinh cho một feature theo .claude/rules và tài liệu. Lỗi nào là lỗi lặp lại thì đề xuất câu bổ sung vào rules (feedback loop), Dương duyệt rồi mới ghi.
argument-hint: "<feature>"
disable-model-invocation: true
---

# /review-code

Feature: `$ARGUMENTS`. Tên lệnh khác `/review` và `/code-review` có sẵn của Claude Code.

## 1. Phạm vi review
- Lấy thay đổi bằng `git diff main...HEAD` trên nhánh `feat/$ARGUMENTS`. Nếu chưa commit thì dùng `git diff` và `git diff --staged`.
- Đọc `docs/$ARGUMENTS/` (specs, api, database_design, design), `docs/_shared/data_model.md`, toàn bộ `.claude/rules/`.

## 2. Checklist

**Backend**
- Đúng ranh giới mô-đun.
- DTO có validation.
- Có guard JWT và role. Có kiểm tra quyền sở hữu dữ liệu.
- Thao tác nhiều bảng nằm trong transaction.
- Câu thông báo đúng như specs.
- Cấu hình đọc từ env. Không hard-code secret.
- Lời gọi AI đi qua lớp client duy nhất.
- Không log dữ liệu nhạy cảm.

**CSDL**
- Entity khớp `data_model.md`: tên, kiểu, NULL, CHECK, ON DELETE.
- Không có cột dẫn xuất.
- Migration có cả `up` và `down`.

**Frontend**
- Theo `frontend/AGENTS.md`.
- Gọi backend qua `lib/api/`, dùng thiết bị qua `lib/device/`.
- Đủ trạng thái loading, rỗng, lỗi.
- Chữ tiếng Việt, `lang="vi"`.

**Giao diện**
- Checklist trong `ui-design-rules.md`.
- Không có class sai phong cách.

**Test**
- Có test cho các TC loại API/Unit.
- Không có test nào bị sửa kết quả mong đợi cho dễ pass.

**Truy vết**
- Mỗi endpoint và màn hình phục vụ một US hoặc BR.
- Không có tính năng ngoài specs.

## 3. Kết quả
Bảng: `Mức (Chặn / Quan trọng / Nhỏ) | file:dòng | vấn đề | quy tắc hoặc tài liệu bị vi phạm | cách sửa`.

## 4. Feedback loop: cập nhật rules
Với mỗi lỗi **có khả năng lặp lại** (AI dễ làm sai lần sau), đề xuất:
- File rule cần sửa (`.claude/rules/...`).
- Câu quy tắc mới: cụ thể, kiểm chứng được, có ví dụ đúng và sai nếu cần.
- Trình bày dạng diff.

**Chỉ ghi vào rules sau khi Dương đồng ý.** Đồng thời bỏ nhãn "(đề xuất)" ở những quy tắc đã được xác nhận qua lần review này.

## 5. Sửa lỗi
Chỉ sửa những lỗi Dương chọn. Sửa xong chạy lại lệnh kiểm tra ở `/feature-dev` mục 5.

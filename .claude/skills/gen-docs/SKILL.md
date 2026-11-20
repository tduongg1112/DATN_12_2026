---
name: gen-docs
description: Bước 6 — từ specs đã VERIFIED, sinh tài liệu kỹ thuật và tài liệu kiểm thử của một feature (api, database_design, design, test_case, test_plan, template nếu cần).
argument-hint: "<feature>"
disable-model-invocation: true
---

# /gen-docs

Feature: `$ARGUMENTS`.

## Điều kiện
- `docs/$ARGUMENTS/specs_$ARGUMENTS.md` phải có `Trạng thái: VERIFIED`. Nếu chưa: **dừng lại**, báo cho Dương, gợi ý chạy `/cross-check $ARGUMENTS specs`.

## Đọc
1. Specs của feature, `docs/_shared/data_model.md`, `docs/_shared/open_questions.md`.
2. `technical_overview.md` mục 3–6, `design_overview.md`.
3. `.claude/rules/backend/be-coding-rules.md`, `.claude/rules/backend/database-rules.md`, `.claude/rules/tester/testing-rules.md`.
4. Các mẫu trong `docs/_templates/`.

## Sinh vào `docs/$ARGUMENTS/`

| File | Khi nào | Ghi chú |
|---|---|---|
| `api_$ARGUMENTS.md` | Luôn có | Endpoint, phân quyền, request, response, mã lỗi. Mỗi endpoint ghi US/BR mà nó phục vụ. Định dạng response chưa chốt (TD-05) thì ghi rõ "tạm" |
| `database_design_$ARGUMENTS.md` | Luôn có | Chỉ bảng, cột, truy vấn mà feature dùng, tham chiếu `data_model.md`. Cần cột mới thì **không thêm**, ghi vào open_questions |
| `design_$ARGUMENTS.md` | Feature có giao diện | Danh sách màn, khuôn trang, thành phần, trạng thái loading/rỗng/lỗi. Nơi đặt file theo TD-11 |
| `test_case_$ARGUMENTS.md` | Luôn có | Theo `testing-rules.md` |
| `test_plan_$ARGUMENTS.md` | Luôn có | |
| `template_$ARGUMENTS.md` | Chỉ khi feature có nội dung mẫu: thông báo, email, file xuất | Ví dụ nội dung thông báo nhắc việc (`my_plants`), file xuất báo cáo (`dashboard`) |

Mọi nội dung phải truy vết được về specs. Chỗ nào specs chưa nói thì ghi "Chưa chốt → OQ-xx", **không tự bổ sung**.

## Kết thúc
- Đặt `Trạng thái: DRAFT` ở đầu mỗi file. Cập nhật bảng trong `docs/README.md`.
- Báo danh sách file đã tạo và các điểm chưa chốt. Gợi ý bước tiếp theo: `/cross-check $ARGUMENTS docs`.

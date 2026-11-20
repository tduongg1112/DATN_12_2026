---
name: load-context
description: Bước 0 — nạp ngữ cảnh dự án đầu phiên và báo trạng thái, câu hỏi mở, bước tiếp theo. Thay cho /init của framework (đặt tên khác để không đè lệnh /init có sẵn của Claude Code).
argument-hint: "[feature]"
disable-model-invocation: true
---

# /load-context

Feature (có thể để trống): `$ARGUMENTS`

Chỉ đọc. **Không sửa file nào.**

1. Đọc `project_overview.md` và `technical_overview.md`. Lướt `design_overview.md`.
2. Đọc `docs/README.md`, phần bảng trạng thái feature.
3. Đọc `docs/_shared/open_questions.md`. Chỉ ghi nhận những mục đang ở trạng thái "Chưa chốt".
4. Nếu có feature:
   - Đọc mọi file `.md` trong `docs/$ARGUMENTS/`.
   - Lọc ra các mục OQ, TD, DC trong `open_questions.md` có nhắc tới feature này.
   - Đọc rule liên quan trong `.claude/rules/` (backend, frontend, tester).
5. Chạy `git status --short` và `git log --oneline -5`.
6. Báo cáo, tối đa 15 dòng:
   - Feature đang ở bước nào (theo bảng trong `docs/README.md`).
   - Các câu hỏi mở **đang chặn** bước tiếp theo.
   - Bước và lệnh tiếp theo nên chạy.
   - Thay đổi chưa commit, nếu có.

---
name: feature-dev
description: Bước 8 (/feature-development của framework) — phát triển một feature trọn vẹn backend và frontend theo tài liệu đã duyệt. Lên kế hoạch trước, Dương đồng ý mới code, xong thì build và test.
argument-hint: "<feature>"
disable-model-invocation: true
---

# /feature-dev

Feature: `$ARGUMENTS`.

## 1. Điều kiện (cổng chặn)
- `specs_$ARGUMENTS.md` ở trạng thái `VERIFIED`. `api_`, `database_design_`, `test_case_` ở trạng thái `REVIEWED`.
- Các mục OQ, TD, DC đang chặn feature (xem `docs/README.md` và `open_questions.md`) đã có quyết định, hoặc đã được Dương ghi rõ là "hoãn".
- Thiếu một trong các điều kiện trên thì **dừng lại và báo**, không code.

## 2. Đọc
- Toàn bộ `docs/$ARGUMENTS/`, `docs/_shared/data_model.md`, và `../design/screens/$ARGUMENTS.md` nếu feature có giao diện (TD-11).
- Rule: `.claude/rules/backend/*`, `.claude/rules/frontend/*`, `frontend/AGENTS.md`.
- Nếu có giao diện: `../design/README.md` và `../design/08-nextjs-shadcn.md`.
- Code hiện có ở các mô-đun liên quan. Nếu là CR: đọc thêm `test_report_` cũ.

## 3. Lên kế hoạch, chờ Dương OK
Liệt kê các bước nhỏ, mỗi bước có file cần sửa và cách kiểm tra. Thứ tự gợi ý:
1. Migration và entity (nếu có thay đổi CSDL).
2. Service và quy tắc nghiệp vụ.
3. Controller, DTO, guard.
4. Unit test và e2e test cho các TC loại API/Unit.
5. Lớp gọi API ở frontend (`lib/api/`).
6. Trang và component.
7. Các trạng thái loading, rỗng, lỗi.

Đánh dấu bước nào đụng tới mục chưa chốt. **Chờ Dương đồng ý mới làm.**

## 4. Cài đặt
- Làm trên nhánh `feat/$ARGUMENTS` (tạo nếu chưa có, sau khi hỏi Dương).
- Làm từng bước. Sau mỗi bước chạy lint, typecheck và test liên quan. Lỗi thì sửa ngay rồi mới đi tiếp.
- Đang code mà phát hiện tài liệu sai hoặc thiếu: dừng bước đó, báo cho Dương. Nếu được đồng ý thì cập nhật `docs/$ARGUMENTS/` trước, sau đó mới code tiếp.
- Không sửa ngoài phạm vi feature. Không thêm dependency khi chưa hỏi.

## 5. Tiêu chí "xong" (theo framework B7)
- [ ] Backend: `npm run lint`, `npm run build`, `npm test` pass. Ứng dụng khởi động được (`npm run dev`, không lỗi lúc khởi động).
- [ ] Frontend: `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [ ] Test case tự động của feature đều pass.
- [ ] Tuân thủ `.claude/rules/`. Màn hình đã qua checklist trong `ui-design-rules.md`.
- [ ] Tài liệu trong `docs/$ARGUMENTS/` khớp với code nếu đã có thay đổi lớn.

## 6. Báo cáo
- Danh sách file đã đổi.
- Các lệnh đã chạy và kết quả thật.
- Những chỗ lệch so với kế hoạch hoặc tài liệu.
- Tài liệu đã cập nhật.
- Đề xuất commit message theo Conventional Commits. **Chỉ commit khi Dương yêu cầu.**

Gợi ý bước tiếp theo: `/review-code $ARGUMENTS`.

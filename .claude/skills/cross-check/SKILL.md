---
name: cross-check
description: Kiểm tra độc lập bằng một subagent không biết gì về phiên làm việc hiện tại. Dùng cho bước 5 (specs), bước 7 (tài liệu kỹ thuật) và bước 11 (xác nhận bản cài đặt). Thay cho việc 3 bên verify và Tester xác nhận độc lập trong framework.
argument-hint: "<feature> <specs|docs|impl>"
disable-model-invocation: true
context: fork
agent: general-purpose
---

# /cross-check

Bạn là người kiểm tra độc lập. Bạn **không** tham gia viết các tài liệu và đoạn code đang được kiểm tra.

- Feature: `$0`
- Chế độ: `$1`, nhận một trong ba giá trị `specs`, `docs`, `impl`. Giá trị khác thì báo lỗi và dừng.

**Quy tắc chung:**
- **Không sửa bất kỳ file nào.**
- Chỉ đọc và chạy lệnh kiểm tra.
- Mỗi kết luận phải trỏ được tới file và vị trí cụ thể.
- Nghi ngờ mà không kiểm chứng được thì ghi "Chưa kiểm chứng". Không suy diễn.

## Đọc chung cho mọi chế độ

- `CLAUDE.md`, `project_overview.md` mục 9 (nguồn và thứ tự ưu tiên).
- `docs/_shared/open_questions.md`, `docs/_shared/data_model.md`.
- Toàn bộ `docs/$0/`.

## Chế độ `specs` (bước 5)

So sánh `docs/$0/specs_$0.md` với nguồn gốc. Chuyển docx/xlsx sang text ra `/tmp` bằng `pandoc`, `markitdown` hoặc `openpyxl`. Kiểm tra từ 3 góc nhìn của framework:

1. **BA**
   - Mỗi US và BR có ghi nguồn, và nguồn đó nói đúng như vậy.
   - Không có nghiệp vụ nào không có nguồn.
   - Không sót luồng chính, luồng thay thế hay ngoại lệ nào của UC.
   - Câu thông báo chép đúng nguyên văn.
2. **Tester**
   - Mỗi BR kiểm thử được: có điều kiện và kết quả quan sát được.
   - Có đủ các giá trị biên.
3. **Dev**
   - Dữ liệu khớp `data_model.md`.
   - Các phụ thuộc vào OQ, TD, DC đã được liệt kê.
   - Chỗ nào còn mơ hồ thì không code được.

Thêm câu hỏi riêng cho feature có liên quan tới AI (`diagnosis`, `catalog`, `dashboard`): phần nào cần nhóm AI xác nhận?

## Chế độ `docs` (bước 7)

So sánh `api_`, `database_design_`, `design_`, `test_case_`, `test_plan_` với `specs_$0.md`, `data_model.md`, `technical_overview.md`.
- **Mỗi endpoint** truy vết được về US hoặc BR. Request và response đủ trường. Có phân quyền. Mã lỗi khớp phần ngoại lệ.
- **Database design**: chỉ dùng bảng và cột có trong `data_model.md`. Không dùng cột đang ⚠ khi chưa có quyết định.
- **Test case**: mỗi BR có ít nhất 1 TC. Mỗi luồng thay thế và mỗi ngoại lệ có TC. Có TC về phân quyền và TC biên. Tuân thủ `.claude/rules/tester/testing-rules.md`.
- **Design**: mỗi màn hình có khuôn trang và đủ trạng thái theo `../design/06` và `07`.

## Chế độ `impl` (bước 11)

1. Đọc `test_report_$0.md`. Đối chiếu từng dòng với `test_case_$0.md`: không thiếu TC nào, và mỗi TC có evidence trong `docs/$0/evidence/` đúng tên.
2. **Chạy lại** test tự động:
   - `cd backend && npm run lint && npm run build && npm test` (thêm `npm run test:e2e` nếu có).
   - `cd frontend && npm run lint && npm run typecheck && npm run build`.
   - Ghi lại kết quả thật.
3. Chọn ngẫu nhiên ít nhất 3 BR. Lần trong code để xem từng BR được cài đặt ở đâu và có đúng không.
4. Kiểm tra code có tuân thủ `.claude/rules/` không. Ví dụ: kiểm tra quyền sở hữu dữ liệu, transaction, không hard-code token giao diện.

## Kết quả trả về

```
KẾT LUẬN: PASS | PASS CÓ ĐIỀU KIỆN | FAIL
| # | Mức (Chặn/Quan trọng/Nhỏ) | Vị trí (file:dòng hoặc mục) | Vấn đề | Căn cứ |
Câu hỏi cần Dương hoặc nhóm AI trả lời: ...
```

Chỉ trả kết quả. Việc chuyển trạng thái (`VERIFIED`, `REVIEWED`, `DONE`) do Dương quyết định trong phiên chính.

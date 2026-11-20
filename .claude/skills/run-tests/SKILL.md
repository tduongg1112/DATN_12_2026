---
name: run-tests
description: Bước 10 (/test của framework) — chạy toàn bộ test case của một feature, ghi kết quả từng case, lưu evidence, lập test_report và chuẩn bị bàn giao cho bước xác nhận độc lập.
argument-hint: "<feature>"
disable-model-invocation: true
---

# /run-tests

Feature: `$ARGUMENTS`.

## 1. Đọc
- `docs/$ARGUMENTS/test_case_$ARGUMENTS.md` và `test_plan_$ARGUMENTS.md`. Hai file này phải đã `REVIEWED`.
- `.claude/rules/tester/testing-rules.md`, `docs/_templates/test_report_template.md`.

## 2. Chuẩn bị môi trường
- Ghi lại: nhánh và commit (`git rev-parse --short HEAD`), CSDL (`docker compose ps` trong `backend/`), cổng chạy, phiên bản mô hình hoặc trạng thái mock AI.
- Tạo `docs/$ARGUMENTS/evidence/` nếu chưa có.

## 3. Chạy
1. Test tự động:
   - Backend: `npm test`, `npm run test:e2e`.
   - Frontend: `npm run lint`, `npm run typecheck`, `npm run build`.
   - Ánh xạ từng TC loại API/Unit vào test tương ứng.
2. TC loại API chưa có test tự động: gọi trực tiếp tới server local. Lưu request và response (đã che token) vào `evidence/api_logs_<YYYYMMDD>.txt`.
3. TC loại UI: chạy tay hoặc bằng công cụ đã chốt ở TD-10. Chụp màn hình theo tên `<TC_ID>_<ten_ngan>.png` ở 390px và 1440px nếu là màn hình. Không tự chụp được thì liệt kê các TC cần Dương chụp, ghi rõ bước làm.
4. Ghi kết quả từng TC: PASS, FAIL hoặc BLOCKED, kèm ghi chú.

## 4. Gặp FAIL
- Tìm nguyên nhân gốc trước khi sửa: tái hiện lỗi, đọc log, khoanh vùng.
- Sửa code (không sửa kết quả mong đợi). Chạy lại TC đó và các TC liên quan.
- Lặp lại tới khi đạt 100% PASS. Nếu không được thì ghi `BLOCKED` kèm lý do và báo Dương.

## 5. Lập báo cáo
- Viết `docs/$ARGUMENTS/test_report_$ARGUMENTS.md` theo mẫu. Để trống mục "Xác nhận độc lập".
- Cập nhật bảng trạng thái trong `docs/README.md`.
- Bàn giao: link commit, file test case, môi trường test. Gợi ý bước tiếp theo: `/cross-check $ARGUMENTS impl`.
- Đề xuất commit message `test(<feature>): ...` kèm evidence. **Chỉ commit khi Dương yêu cầu.**

---
paths:
  - "docs/**/test_case_*.md"
  - "docs/**/test_plan_*.md"
  - "docs/**/test_report_*.md"
  - "**/*.spec.ts"
  - "**/*.e2e-spec.ts"
  - "backend/test/**"
---

# Quy tắc kiểm thử

> Gộp `create_testcase.md` và `execute_test.md` của framework. Nguồn: HDSD AI Coding Assistant các bước B5, B6, B8, B9. Quy tắc gắn **(đề xuất)** là mặc định chưa được duyệt.

## 1. Sinh test case (`test_case_<feature>.md`)

- Mẫu: `docs/_templates/test_case_template.md`.
- Mã test case **(đề xuất)**: `TC-<MÃ>-<NNN>`. `<MÃ>` lấy theo feature: `AUTH`, `DIAG`, `HIST`, `PLANT`, `LIB`, `CAT`, `DASH`. Ví dụ `TC-DIAG-007`.
- Mỗi test case có: mã, tên, loại (API / UI / Unit), mức ưu tiên, **truy vết** (`US-xx`, `BR-xx` trong specs và mã chức năng trong Function List), tiền điều kiện, dữ liệu, các bước, kết quả mong đợi.
- Phải phủ đủ, theo framework B5:
  - Luồng chính của UC.
  - Mỗi **luồng thay thế** (Alternative Flow) có ít nhất 1 test case.
  - Mỗi **ngoại lệ** (Exception) có ít nhất 1 test case. Kết quả mong đợi chép đúng câu thông báo trong specs.
  - Biên (boundary): ảnh 10 MB, mật khẩu 8 ký tự, lần sai mật khẩu thứ 5, thời gian chờ AI 15 giây, ngưỡng độ tin cậy.
  - Negative: dữ liệu sai định dạng, thiếu trường bắt buộc.
  - **Phân quyền**: chưa đăng nhập; `USER` gọi route của `ADMIN`; truy cập dữ liệu của người dùng khác.
- Kết quả mong đợi phải kiểm chứng được (status code, trường dữ liệu, câu hiển thị, bản ghi trong CSDL). Không viết kiểu "hệ thống hoạt động đúng".
- Không viết test case cho nghiệp vụ không có trong specs.

## 2. Test plan (`test_plan_<feature>.md`)

Gồm: phạm vi (trong và ngoài), loại test, môi trường (URL, nhánh, CSDL, phiên bản mô hình hoặc mock AI), dữ liệu test, tiêu chí pass/fail, rủi ro, lịch.

## 3. Thực thi

- Test tự động:
  - Backend unit: `npm test`, viết bằng vitest trong file `*.spec.ts`.
  - Backend API: `npm run test:e2e`, vitest + supertest trong `backend/test/*.e2e-spec.ts`.
  - Frontend: `npm run lint && npm run typecheck && npm run build`.
- AI service: test backend dùng **mock** lớp client AI. Test nghiệm thu luồng chẩn đoán dùng mô hình thật cùng nhóm AI.
- Test UI: công cụ E2E chưa chốt (TD-10). Hiện test UI bằng tay và chụp màn hình ở 390px và 1440px.
- **Không bao giờ sửa kết quả mong đợi để test pass.** Test fail thì sửa code. Nếu bản thân test case sai thì báo Dương, sửa specs hoặc test case trước, rồi chạy lại.
- Lặp lại cho tới khi đạt 100% pass. Test case không chạy được thì ghi `BLOCKED` kèm lý do.

## 4. Evidence (`docs/<feature>/evidence/`)

| Loại | Tên file |
|---|---|
| Ảnh màn hình | `<TC_ID>_<ten_ngan>.png`, ví dụ `TC-DIAG-007_anh_qua_10mb.png` |
| Video (luồng phức tạp) | `<TC_ID>_<ten_ngan>.mp4` |
| Log API / console | `api_logs_<YYYYMMDD>.txt` |

Không đưa token, mật khẩu hay thông tin trong `.env` vào evidence.

## 5. Test report (`test_report_<feature>.md`)

Theo framework, gồm:
- Tổng số test case, số pass, số fail, số blocked.
- Bảng: Mã TC | Tên | Kết quả | Ghi chú | Link evidence.
- Môi trường: URL, phiên bản, nhánh, commit, CSDL, phiên bản mô hình hoặc mock.
- Ngày thực hiện và người thực hiện.
- Mục "Xác nhận độc lập", điền sau khi chạy `/cross-check <feature> impl`.

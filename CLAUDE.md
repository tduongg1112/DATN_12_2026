# CLAUDE.md — Hướng dẫn chung của dự án

> Tương đương `INSTRUCTION.md` của AI SDLC Framework (VTIT). Claude Code tự nạp file này ở mọi phiên, nên giữ ngắn (< 200 dòng). Chi tiết nằm ở các file được trỏ tới, chỉ đọc khi cần.

## 1. Dự án trong 5 dòng

- **Hệ thống hỗ trợ quản lý sức khoẻ cây trồng**, đồ án tốt nghiệp PTIT 2026, nhóm 3 người.
- Web app responsive chạy trên máy tính và điện thoại. Sau này đóng gói thành app, không code mobile thuần.
- Lõi: chẩn đoán bệnh trên lá cây từ ảnh. Backend gọi AI service (mô hình lai CNN–Mamba do nhóm AI xây). 5 loại cây: lúa, ngô, cà chua, ớt, khoai tây.
- 2 vai trò USER và ADMIN. Bắt buộc đăng nhập (email hoặc Google), không có chế độ khách.
- Nghiệp vụ chi tiết: `project_overview.md`. Kỹ thuật: `technical_overview.md`. Giao diện: `design_overview.md`.

## 2. Bản đồ repo (`code/` là gốc git)

```
code/
├── CLAUDE.md                 ← file này (= INSTRUCTION.md)
├── project_overview.md       ← Business context: mục tiêu, vai trò, UC, quy tắc chung, nguồn tài liệu
├── technical_overview.md     ← Technical context: kiến trúc, stack, hợp đồng AI service, quyết định kỹ thuật
├── design_overview.md        ← Design context: trỏ tới design system ở ../design/
├── .claude/
│   ├── rules/                ← Quy tắc bắt buộc, tự nạp theo đường dẫn file đang làm (frontmatter `paths`)
│   │   ├── backend/          be-coding-rules.md, database-rules.md
│   │   ├── frontend/         fe-coding-rules.md, ui-design-rules.md
│   │   └── tester/           testing-rules.md
│   └── skills/               ← Workflow gọi bằng lệnh "/" (bảng ở mục 5)
├── docs/
│   ├── README.md             ← Quy trình, vai trò, bảng trạng thái từng feature
│   ├── _shared/              open_questions.md (điểm chưa chốt), data_model.md (CSDL dùng chung)
│   ├── _templates/           Mẫu các loại tài liệu feature
│   └── <feature>/            specs_, api_, database_design_, design_, test_case_, test_plan_, test_report_ + evidence/
├── backend/                  NestJS 12 + TypeORM + PostgreSQL
└── frontend/                 Next.js 16 + Tailwind v4 + shadcn/ui (có AGENTS.md riêng, phải đọc)
```

Nguồn gốc (SRS) nằm **ngoài repo**, ở thư mục cha `../`: Chương 4, tài liệu Class/ERD, Function List, sơ đồ, design system. Danh sách và thứ tự ưu tiên ở `project_overview.md` mục 9. Lần đầu đọc file ngoài repo, Claude Code sẽ hỏi xác nhận, hãy đồng ý.

## 3. Đọc gì, khi nào

| Khi | Đọc |
|---|---|
| Đầu phiên | Chạy `/load-context [feature]` |
| Làm một feature | Toàn bộ `docs/<feature>/`, rồi `docs/_shared/data_model.md` nếu đụng CSDL |
| Viết code backend | `.claude/rules/backend/*` (tự nạp khi đọc file trong `backend/`) |
| Viết code frontend / UI | `frontend/AGENTS.md`, `.claude/rules/frontend/*`, `../design/README.md` |
| Gặp chỗ chưa rõ | `docs/_shared/open_questions.md` |

## 4. Luật cứng, áp dụng mọi phiên

1. **Không bịa nghiệp vụ.** Chỉ lấy yêu cầu từ `docs/<feature>/specs_<feature>.md` hoặc từ nguồn gốc đã liệt kê. Thiếu thông tin hoặc các nguồn mâu thuẫn thì tra `docs/_shared/open_questions.md`. Nếu chưa có ở đó: **dừng lại, hỏi Dương**, rồi ghi câu hỏi vào file. Không tự chọn phương án cho mục đang "Chưa chốt".
2. **Có cổng chặn trước khi code.** Chỉ code feature khi specs ở trạng thái `VERIFIED` và tài liệu kỹ thuật ở trạng thái `REVIEWED` (xem `docs/README.md`).
3. **Không đoán API thư viện.** Next.js 16, React 19, NestJS 12, TypeORM 1.x mới hơn kiến thức huấn luyện. Trước khi dùng một API chưa chắc chắn, kiểm tra phiên bản trong `package.json` và đọc tài liệu hoặc type definition trong `node_modules` (frontend: `node_modules/next/dist/docs/`).
4. **Đúng phạm vi.** Chỉ làm phần việc của feature đang làm. Không refactor lan sang chỗ khác. Không thêm thư viện, bảng hay cột mới khi chưa hỏi.
5. **Tài liệu đi cùng code.** Nếu đổi API, schema hoặc luồng, cập nhật file tương ứng trong `docs/<feature>/` ngay trong cùng lượt.
6. **"Xong" nghĩa là đã kiểm chứng.** Phải chạy build, lint, typecheck và test liên quan, sau đó báo rõ lệnh nào đã chạy và kết quả ra sao. Chưa chạy thì không được báo xong.
7. **Bảo mật.** Không đọc, in hay commit `.env`. Khoá cấu hình mới ghi vào `.env.example`. Không hard-code secret, mật khẩu, token.
8. **Giao diện** theo design system `../design/`. Gặp mâu thuẫn với thói quen mặc định thì design system thắng.
9. **Không tự sửa** `.claude/`, `CLAUDE.md` và 3 file overview. Muốn sửa thì đề xuất trong bước `/review-code`, Dương duyệt mới sửa.
10. **Ngôn ngữ.** Tài liệu, chú thích nghiệp vụ và chữ trên giao diện viết bằng tiếng Việt có dấu. Tên biến, hàm, bảng, cột, endpoint viết bằng tiếng Anh.

## 5. Quy trình và lệnh

Quy trình đầy đủ, vai trò và RACI: `docs/README.md`. Tóm tắt các bước cho mỗi feature:

| Bước (framework) | Lệnh | Kết quả |
|---|---|---|
| 0. Nạp ngữ cảnh (`/init`) | `/load-context [feature]` | Báo trạng thái, câu hỏi mở, bước tiếp theo |
| 3–4. Đọc SRS, chuẩn bị specs | `/read-docs <feature>` | `specs_<feature>.md` (DRAFT) |
| 5. Verify specs | `/cross-check <feature> specs` | Báo cáo kiểm tra độc lập. Dương duyệt thì chuyển sang `VERIFIED` |
| 6. AI sinh tài liệu kỹ thuật | `/gen-docs <feature>` | api_, database_design_, design_, test_case_, test_plan_ |
| 7. Review tài liệu | `/cross-check <feature> docs` | Dương duyệt thì chuyển sang `REVIEWED` |
| 8. Phát triển BE + FE | `/feature-dev <feature>` | Lên kế hoạch, Dương OK, rồi mới code, build và test |
| 9. Review code, cập nhật rules | `/review-code <feature>` | Danh sách lỗi và đề xuất sửa rules |
| 10. Chạy test, lưu evidence | `/run-tests <feature>` | `test_report_<feature>.md`, `evidence/` |
| 11. Xác nhận độc lập | `/cross-check <feature> impl` | Kết luận PASS hoặc FAIL |

Gặp CR (yêu cầu thay đổi) hoặc sửa lỗi trên feature đã xong: vẫn đi đủ các bước trên, nhưng trước tiên đọc lại specs, api, database_design và test_report cũ của feature đó.

## 6. Quy ước chung

- **Feature**: tên thư mục dạng snake_case, gồm `auth`, `diagnosis`, `history`, `my_plants`, `disease_library`, `catalog`, `dashboard`. Bảng ánh xạ sang UC và Function List ở `docs/README.md`.
- **Mã truy vết**: UC theo Chương 4 (UC01–UC07). Chức năng theo Function List v0.2 (AUTH-01, DIAG-04…). Trong specs, user story đánh số `US-xx`, quy tắc nghiệp vụ `BR-xx`. Câu hỏi mở `OQ-xx`, quyết định kỹ thuật `TD-xx`, lệch nguồn dữ liệu `DC-xx`.
- **Git**: nhánh `main`. Commit theo Conventional Commits (`feat:`, `fix:`, `docs:`…), commit đầu tiên của repo đã theo kiểu này. Đề xuất mỗi feature một nhánh `feat/<feature>`. Chỉ commit hoặc push khi Dương yêu cầu.
- **Người duyệt** mọi cổng chặn: Nguyễn Tùng Dương. Nhóm AI (Phan Lê Huy, Nguyễn Chí Hiếu) duyệt các phần đụng tới mô hình và AI service.

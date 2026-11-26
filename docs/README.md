# Quy trình phát triển có AI — bản rút gọn cho ĐATN

> Chuyển thể từ **AI SDLC Framework v1.1** và **HDSD AI Coding Assistant** (VTIT, 05/2026) cho nhóm 3 người dùng Claude Code. Giữ nguyên tinh thần của framework (ngữ cảnh rõ ràng, specs được verify trước, tài liệu kỹ thuật do AI sinh và người review, code theo rules, review rồi cập nhật rules, test có evidence, xác nhận độc lập). Những vai trò và bước thừa với quy mô đồ án đã được bỏ.

## 1. Từ framework sang dự án này

| Framework VTIT | Dự án này | Lý do |
|---|---|---|
| `INSTRUCTION.md` | `CLAUDE.md` ở `code/` | Claude Code tự nạp `CLAUDE.md` mỗi phiên |
| `project_overview.md`, `technical_overview.md`, `design_overview.md` | Giữ nguyên, đặt ở `code/` | `design_overview.md` chỉ trỏ sang `../design/`, không chép lại |
| `.agent/rules/` (backend, frontend 12 file, design, tester) | `.claude/rules/` (5 file) có `paths` | Claude Code tự nạp `.claude/rules/`. `paths` giúp rule backend chỉ nạp khi làm backend, tiết kiệm ngữ cảnh. Rule thiết kế đã có ở `../design/` nên chỉ trỏ tới |
| `.agent/workflows/` gọi bằng lệnh `/` | `.claude/skills/<lệnh>/SKILL.md` | Cơ chế lệnh `/` của Claude Code. Tên được đổi để không trùng lệnh có sẵn (`/init`, `/review`, `/verify`) |
| `.agent/skills/` (superpowers, design skill) | Không chép vào repo | Design skill được thay bằng `../design/`. Muốn dùng superpowers thì cài plugin (mục 7) |
| `docs/<feature>/` + `evidence/` | Giữ nguyên, thêm `docs/_shared/` và `docs/_templates/` | CSDL được thiết kế chung cho cả hệ thống, và câu hỏi mở cũng dùng chung |
| 5 vai trò BA, UI/UX, TechLead/SA, Dev, Tester | Dương + nhóm AI + Claude | Mục 2 |
| B5 verify 3 bên, B11 Tester xác nhận độc lập | `/cross-check` (subagent ngữ cảnh riêng) + nhóm AI (với feature dính AI) + Dương duyệt | Phía phần mềm không có người thứ hai để kiểm tra chéo |
| Bước 1–2: brainstorming nghiệp vụ, thiết kế giao diện trước SRS | **Đã làm phần lớn**: Chương 4, Function List, Class/ERD, design system | Màn hình cụ thể làm ở bước 6, lưu ở `../design/screens/<feature>.md` (TD-11) |

## 2. Vai trò và RACI

| Người | Vai trò |
|---|---|
| **Nguyễn Tùng Dương (D)** | BA + UI/UX + TechLead/SA + Dev + Tester phía phần mềm. Duyệt mọi cổng chặn |
| **Nhóm AI: Phan Lê Huy, Nguyễn Chí Hiếu (AI)** | Mô hình, AI service, danh sách nhãn, ngưỡng tin cậy, dữ liệu. Duyệt phần liên quan AI ở các feature `diagnosis`, `catalog`, `dashboard` |
| **GVHD** | Duyệt phạm vi đề tài. Vai trò tương đương "khách hàng" trong framework |
| **Claude** | Người thực thi, không phải một vai trò trong ma trận. Làm theo `.claude/rules/`, tự kiểm chứng trước khi báo xong |

R = trực tiếp làm · A = chịu trách nhiệm/duyệt · C = được hỏi ý kiến · I = được thông báo

| Bước | Hoạt động | D | AI | GVHD | Claude |
|---|---|---|---|---|---|
| 0 | Thiết lập ngữ cảnh: 3 overview, rules (đã dựng 20/11) | R/A | C | — | R (soạn) |
| 1–2 | Phân tích nghiệp vụ, thiết kế giao diện, CSDL | R/A | C | C | R (hỗ trợ) |
| 3–4 | Tách SRS thành `specs_<feature>.md` | A | C* | — | R `/read-docs` |
| 5 | Verify specs (cổng chặn) | A | R* | — | R `/cross-check specs` |
| 6 | AI sinh tài liệu kỹ thuật và kiểm thử | A | — | — | R `/gen-docs` |
| 7 | Review tài liệu (cổng chặn) | R/A | C* | — | R `/cross-check docs` |
| 8 | Code backend + frontend | A | — | — | R `/feature-dev` |
| 9 | Review code, cập nhật rules | R/A | — | — | R `/review-code` |
| 10 | Chạy test, lưu evidence, lập report | A | — | — | R `/run-tests` |
| 11 | Xác nhận độc lập | A | R* | I | R `/cross-check impl` |

\* Chỉ áp dụng cho feature dùng mô hình hoặc AI service: `diagnosis`, `catalog` (nhãn mô hình), `dashboard` (chỉ số chất lượng mô hình).

## 3. Các bước cho một feature

```
/load-context <f>
      │
/read-docs <f> ──► specs (DRAFT) ──► /cross-check <f> specs ──► Dương duyệt ──► specs VERIFIED   ◄── CỔNG 1
      │                                     (nhóm AI duyệt nếu có dính AI)
/gen-docs <f>  ──► api, database_design, test_case, test_plan (DRAFT) + ../design/screens/<f>.md
      │
/cross-check <f> docs ──► Dương sửa và duyệt ──► docs REVIEWED                                   ◄── CỔNG 2
      │
/feature-dev <f> ──► kế hoạch ──► Dương OK ──► code BE+FE ──► lint/build/test pass
      │
/review-code <f> ──► sửa lỗi + đề xuất rules ──► Dương duyệt ghi rules
      │
/run-tests <f>   ──► test_report + evidence (100% PASS)
      │
/cross-check <f> impl ──► PASS ──► Dương xác nhận DONE ──► merge vào main                         ◄── CỔNG 3
```

**Nguyên tắc chung:**
- Không qua cổng thì không đi tiếp.
- Gặp mục chưa chốt thì ghi vào `docs/_shared/open_questions.md`, không đoán.
- Nếu thay đổi lớn trong lúc code thì cập nhật lại tài liệu ở bước 6 (theo framework B7).

**Trạng thái** ghi ở đầu mỗi file và trong bảng mục 4:
- specs: `DRAFT` → `VERIFIED`
- docs: `DRAFT` → `REVIEWED`
- code: `—` → `IN PROGRESS` → `DONE`
- test: `—` → `PASS` → `CONFIRMED`

## 4. Feature và trạng thái

> **Chế độ build-first (20/11/2026).** Để bắt đầu code sớm, Dương chốt toàn bộ điểm mở đang chặn trong một phiên (`docs/_shared/open_questions.md`). Specs của 7 feature được chuyển sang `VERIFIED (build-first)` **mà chưa chạy `/cross-check specs`**. Toàn bộ specs và quyết định sẽ được review lại ở giai đoạn test (bước 10–11). Cổng 2 (docs `REVIEWED`) và cổng 3 vẫn áp dụng như cũ. Nguồn gốc ngoài repo (docx, SQL, ảnh ERD/UC) chưa cập nhật theo (DC-12).

Thứ tự gợi ý ban đầu (cột #) dựa trên phụ thuộc dữ liệu: Function List ghi rằng UC chẩn đoán, thư viện và nhắc việc đều cần dữ liệu bệnh và mã lớp từ danh mục.

**Thứ tự Dương chốt 22/11, sau `auth`:** `disease_library` → `diagnosis` → `history` → `my_plants` → `catalog` → `dashboard`. Làm các trang người dùng trước. Thư viện dựng trang chi tiết bệnh mà kết quả chẩn đoán cần mở. **Dữ liệu đang dùng tạm** (nhãn mô hình, ngưỡng, nội dung bệnh, chu kỳ chăm sóc…) và mẫu gửi lại giá trị thật: [`_shared/real_data_needed.md`](_shared/real_data_needed.md). Trong lúc chưa có `catalog`, dùng dữ liệu seed dev, với nội dung bệnh mẫu do Claude soạn (OQ-36). "Lưu vào cây trồng" của `diagnosis` và `history` nối khi làm `my_plants`, vì lúc đó mới có cây để chọn. Mỗi feature duyệt hai lần như `auth`: duyệt tài liệu, rồi duyệt kế hoạch code.

| # | Feature | UC | Mã chức năng (M/S/C) | Phụ thuộc | Còn chặn | specs | docs | code | test |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [`auth`](auth/specs_auth.md) | UC01 | AUTH-01..05 (3/1/1) | — | Cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` khi chạy thử Google thật | VERIFIED (build-first) | REVIEWED (build-first) · [api](auth/api_auth.md), [db](auth/database_design_auth.md), `../design/screens/auth.md` | DONE (build-first) | — |
| 2 | [`catalog`](catalog/specs_catalog.md) | UC06 | ADM-01, 02, 07 (2/0/1) | auth | — (nhóm AI xem phần nhãn cùng TD-19) | VERIFIED (build-first) | REVIEWED (build-first) · [api](catalog/api_catalog.md), [db](catalog/database_design_catalog.md), `../design/screens/catalog.md` | DONE (build-first 25/11) | — |
| 3 | [`diagnosis`](diagnosis/specs_diagnosis.md) | UC02 | DIAG-01..09 (5/2/2) | auth, catalog, AI service (tạm dùng mock) | — (ngưỡng OQ-06 tạm 0.6 khi dev) | VERIFIED (build-first) | REVIEWED (build-first) · [api](diagnosis/api_diagnosis.md), [db](diagnosis/database_design_diagnosis.md), `../design/screens/diagnosis.md` | DONE (build-first) | — |
| 4 | [`history`](history/specs_history.md) | UC03 | HIST-01..03 (2/1/0) | diagnosis | — | VERIFIED (build-first) | REVIEWED (build-first) · [api](history/api_history.md), [db](history/database_design_history.md), `../design/screens/history.md` | DONE (build-first) | — |
| 5 | [`my_plants`](my_plants/specs_my_plants.md) | UC04 | PLANT-01..06 (4/1/1), NOTI-01..04 (0/3/1) | diagnosis | — | VERIFIED (build-first) | REVIEWED (build-first) · [api](my_plants/api_my_plants.md), [db](my_plants/database_design_my_plants.md), [template](my_plants/template_my_plants.md), `../design/screens/my_plants.md` | DONE (build-first; đợt 1 23/11, đợt 2 24/11) | — |
| 6 | [`disease_library`](disease_library/specs_disease_library.md) | UC05 | LIB-01..04 (1/1/2) | catalog | — (ngưỡng OQ-06 tạm 0.6 khi dev) | VERIFIED (build-first) | REVIEWED (build-first) · [api](disease_library/api_disease_library.md), [db](disease_library/database_design_disease_library.md), `../design/screens/disease_library.md` | DONE (build-first) | — |
| 7 | [`dashboard`](dashboard/specs_dashboard.md) | UC07 | ADM-03, 04, 06 (1/1/1) | diagnosis | Chờ duyệt OQ-61 → OQ-65, TD-34, TD-35; nhóm AI xem nhóm chỉ số chất lượng mô hình | VERIFIED (build-first) | DRAFT (25/11) · [api](dashboard/api_dashboard.md), [db](dashboard/database_design_dashboard.md), `../design/screens/dashboard.md` | — | — |

**Bước 9 `/review-code` (25/11), chạy chung cho 6 feature đã code** (auth, disease_library, diagnosis, history, my_plants, catalog): không có lỗi Chặn hay Quan trọng. Dương duyệt sửa cả 7 lỗi Nhỏ:

- gom interceptor nhận ảnh về `common/storage/image-upload.interceptor.ts`;
- chuyển `escapeLike` sang `common/sql/`;
- thêm thời lượng token cho 2 hiệu ứng;
- thêm test 403 cho route ghi của quản trị và ca ADMIN dùng nhắc việc;
- ghi các chữ Claude soạn còn sót vào `screens/auth.md`, `screens/catalog.md` (chờ duyệt);
- đổi nhãn dock thành "Bệnh cây hay gặp".

Rules và `technical_overview.md` đã cập nhật theo các quyết định đã chốt: TD-14, 24, 26, 28, 29, 31, mã lỗi khoá ngoại, thời lượng chuyển động, Next.js 16.4.6, bỏ nhãn "(đề xuất)" ở các quy tắc đã áp. `dashboard` chạy `/review-code` riêng khi code xong.

**Việc nền, làm trước feature đầu tiên (đề xuất):**

| # | Việc | Căn cứ | Trạng thái (20/11) |
|---|---|---|---|
| N1 | Chốt DC-01 → DC-12, sửa `_nguon_sinh_tu_dong/model.py` rồi chạy lại để có SQL, DBML, PUML khớp nhau; cập nhật `data_model.md` | `open_questions.md` mục C | DC-01 → DC-11 đã chốt, `data_model.md` đã cập nhật. Sửa nguồn ngoài repo: hoãn (DC-12) |
| N2 | Chốt TD-02, TD-05, TD-06 (đóng gói, chuẩn API, cổng chạy) | `technical_overview.md` mục 10 | Xong (TD-02 hoãn, kèm ràng buộc code tương thích) |
| N3 | Cài design system vào `frontend/` (6 bước) | `../design/08-nextjs-shadcn.md` | Xong 21/11 |
| N4 | Migration đầu tiên, script seed, `backend/.env.example` | `.claude/rules/backend/database-rules.md` mục 6 | Xong 21/11 (dựng nền backend) |
| N5 | Chốt hợp đồng AI service với nhóm AI (OQ-05, OQ-06, TD-04) | `technical_overview.md` mục 5 | Một phần: OQ-05 chốt 22/11 (bắt buộc chọn loại cây), OQ-06 tạm 0.6 khi dev, TD-04 dùng mock |
| N6 | Gỡ `@nestjs/observe` (TD-09), đặt cổng backend 4000 (TD-06) | `open_questions.md` mục B | Xong 21/11 |
| N7 | Nền backend: config, CSDL, entity, seed, guard, filter, StorageService, AiClient | Phiên 21/11 | Xong 21/11. Chưa có controller nghiệp vụ |
| N8 | Nền frontend: design system, `components/ds/`, khung route 3 nhóm, `lib/api`, `lib/auth`, `lib/device`, trạng thái dùng chung | Phiên 21/11 | Xong 21/11. Chưa có màn hình nghiệp vụ |

## 5. Cấu trúc một thư mục feature

```
docs/<feature>/
├── specs_<feature>.md            Bước 4: yêu cầu tách từ SRS (mẫu: _templates/specs_template.md)
├── api_<feature>.md              Bước 6
├── database_design_<feature>.md  Bước 6: chỉ cách feature dùng bảng chung
├── template_<feature>.md         Bước 6: chỉ khi có thông báo, email hoặc file xuất
├── test_case_<feature>.md        Bước 6
├── test_plan_<feature>.md        Bước 6
├── test_report_<feature>.md      Bước 10
└── evidence/                     Bước 10: <TC_ID>_<ten>.png | .mp4, api_logs_<YYYYMMDD>.txt

../design/screens/<feature>.md   Bước 6: mô tả màn hình (TD-11, chốt 20/11). Nằm ngoài git, mẫu ở docs/_templates/design_template.md
```

## 6. Change request và bảo trì

Đi đủ các bước như một feature mới (bước 3 → 11). Trước bước 3, đọc lại các tài liệu sau (theo checklist slide 13 của framework):
- **Nghiệp vụ:** `project_overview.md`, specs của feature liên quan.
- **Kiến trúc và code:** `CLAUDE.md`, mã nguồn liên quan, `database_design_` và `api_` hiện có.
- **Rules và hành vi hiện tại:** `.claude/rules/`, `test_report_` cũ, `evidence/` cũ.

Ghi thay đổi vào "Lịch sử thay đổi" của specs.

## 7. Bổ sung từ thực hành AI coding hiện nay

**Đã áp dụng vào cấu trúc:**
- **Rule theo đường dẫn** (`.claude/rules/` với `paths`) thay cho rule nạp toàn bộ. Tài liệu Claude Code khuyên giữ `CLAUDE.md` dưới 200 dòng và dùng rule theo đường dẫn khi hướng dẫn dài ra.
- **Kiểm tra bằng subagent ngữ cảnh riêng** (`context: fork` trong `/cross-check`). Subagent không thấy cuộc hội thoại đã tạo ra code, nên khỏi cảnh "tự chấm bài mình".
- **Lên kế hoạch trước khi code** trong `/feature-dev`. Tương tự `writing-plans` của superpowers và bước `plan` trong Spec Kit.
- **Xử lý điểm chưa rõ ngay trong tài liệu Markdown** (`open_questions.md`, mục "Điểm chưa chốt" trong specs) thay vì để AI tự đoán, giống tinh thần spec-driven development.
- **Kiểm chứng trước khi báo xong** (tiêu chí "xong" trong `/feature-dev`, `/run-tests`). Tương tự `verification-before-completion` của superpowers.

**Tuỳ chọn, chưa cài:**
- Plugin **superpowers** (framework VTIT dùng bộ này): `/plugin marketplace add obra/superpowers-marketplace` rồi `/plugin install superpowers@superpowers-marketplace`. Hữu ích nhất: `brainstorming`, `systematic-debugging`, `test-driven-development`.
- **Hook** của Claude Code. `CLAUDE.md` và rules không đảm bảo được tuân thủ tuyệt đối, nên việc nào bắt buộc thì nên dùng hook. Ví dụ: chặn sửa `.env`, tự chạy prettier sau khi sửa file. Chỉ thêm khi thấy cần.

Tham khảo: [Claude Code memory & rules](https://code.claude.com/docs/en/memory) · [Claude Code skills](https://code.claude.com/docs/en/slash-commands) · [obra/superpowers](https://github.com/obra/superpowers) · [github/spec-kit](https://github.com/github/spec-kit)

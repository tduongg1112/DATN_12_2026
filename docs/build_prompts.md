# Prompt cho Claude Code — giai đoạn build-first

> Bối cảnh: chọn **build trước, sửa lỗi trong lúc test** (20/11/2026). Các cổng `VERIFIED`/`REVIEWED` được nới, nhưng 3 nguyên tắc vẫn giữ: **(1) mọi quyết định do Dương chọn và được ghi lại, (2) code bám theo tài liệu, (3) mỗi phần build xong phải chạy được.**
> Copy từng khối `text` bên dưới để dán vào Claude Code. **Mỗi prompt chạy trong một phiên mới** (`/clear` hoặc mở lại `claude`). Như vậy ngữ cảnh gọn, Claude đọc lại tài liệu từ đầu thay vì dựa vào trí nhớ của phiên trước.

## Trước khi bắt đầu (làm 1 lần trong Terminal)

```bash
cd "/Users/tungduong1112/Tài liệu học tập PTIT/ĐATN/code"
rm -rf .claude && mv _dot_claude .claude      # đưa rules và skills vào đúng chỗ
git checkout -b build/foundation
claude                                        # lần đầu: đồng ý cho đọc file ngoài repo (../design, ../doc…)
```

Thứ tự chạy: **P0 → P1 → P2 → P3 (lặp lại cho 7 feature) → P4 (test) → P5 (sửa lỗi, khi cần)**.

| Prompt | Việc | Ước lượng |
|---|---|---|
| P0 | Chốt quyết định cho build-first, cập nhật tài liệu | 1 phiên |
| P1 | Nền backend: cấu hình, CSDL, migration, seed, guard, AI mock, lưu ảnh | 1–2 phiên |
| P2 | Nền frontend: cài design system, khung app, lớp API, xác thực phía client | 1–2 phiên |
| P3 | Một feature từ đầu đến cuối (BE + FE). Chạy lần lượt: `auth` → `catalog` → `diagnosis` → `history` → `my_plants` → `disease_library` → `dashboard` | 1 phiên/feature |
| P4 | Giai đoạn test: test case, chạy test, evidence, kiểm tra độc lập | 1 phiên/feature |
| P5 | Sửa một lỗi phát hiện khi test | Khi cần |

---

## P0 — Chốt quyết định cho build-first

```text
Phiên này CHƯA viết code. Mục tiêu: chốt những quyết định đang chặn việc build, rồi ghi lại vào tài liệu.

0. Kiểm tra đã có .claude/skills/ và .claude/rules/. Nếu vẫn còn thư mục _dot_claude/ thì dừng, báo tôi.
1. Làm theo .claude/skills/load-context/SKILL.md (không có feature).
2. Đọc kỹ docs/_shared/open_questions.md (mục A, B, C), docs/_shared/data_model.md, technical_overview.md mục 9–10.
3. Hỏi tôi từng nhóm bằng công cụ hỏi lựa chọn (tối đa 4 câu mỗi lượt). Mỗi câu: phương án đề xuất đặt đầu tiên, ghi rõ đề xuất đó lấy từ tài liệu nào hay là "đề xuất kỹ thuật" của bạn. KHÔNG tự chọn thay tôi.
   Nhóm 1 — Dữ liệu:
     - DC-05 → DC-10: lấy data_model.md (theo tài liệu Class/CSDL mục 6.2) làm chuẩn, coi ERD 19/11 là bản vẽ chưa đầy đủ?
     - Từng cột bị gạch hoặc lệch: allow_data_sharing (DC-01, OQ-12), watering/fertilizing_interval_days (DC-02), summary (DC-03), source_refs (DC-04): giữ hay bỏ?
     - OQ-14 Đánh giá kết quả: bỏ ở bản build này, hay thêm 3 cột theo cách A?
   Nhóm 2 — Nghiệp vụ: OQ-02, OQ-05, OQ-06 (xin tôi một giá trị ngưỡng TẠM để chạy dev, không tự đề xuất số), OQ-09, OQ-15, OQ-16, OQ-17, OQ-22.
   Nhóm 3 — Nghiệp vụ nhỏ: OQ-03/OQ-04 (làm ngay hay hoãn), OQ-10, OQ-11, OQ-23, OQ-24, OQ-25, OQ-26.
   Nhóm 4 — Kỹ thuật:
     - TD-01 lưu ảnh (gợi ý: lưu đĩa local sau một interface StorageService, sau đổi sang S3/MinIO được).
     - TD-02 đóng gói (gợi ý: hoãn, code tương thích cả PWA lẫn Capacitor: gọi API phía client qua lib/api, không dùng Server Actions).
     - TD-03 Redis.
     - TD-05 chuẩn API: tiền tố route, dạng response, dạng lỗi, có dùng Swagger không (thêm dependency).
     - Cách frontend giữ token.
     - TD-06 cổng chạy.
     - TD-08 mô-đun cho dashboard.
     - TD-09 @nestjs/observe.
     - TD-04: dùng AI mock trong backend (AI_MODE=mock) cho tới khi nhóm AI giao service?
     - Google OAuth làm ngay (cần Client ID) hay để sau?
4. Sau khi tôi trả lời, cập nhật:
   - open_questions.md: điền cột "Quyết định", đổi trạng thái thành "Đã chốt (20/11, build-first)". Mục tôi chọn hoãn thì ghi "Hoãn".
   - data_model.md: áp quyết định của Nhóm 1, bỏ dấu ⚠ ở những chỗ đã chốt.
   - 7 file specs_<feature>.md: sửa BR/mục 7 theo quyết định; đổi trạng thái thành "VERIFIED (build-first 20/11, review lại ở giai đoạn test)".
   - technical_overview.md mục 10, và docs/README.md: thêm ghi chú "Chế độ build-first", cập nhật bảng trạng thái.
   - KHÔNG sửa file nguồn ngoài repo (docx, SQL). Ghi vào DC-12 rằng sẽ cập nhật sau.
5. Báo lại danh sách quyết định dạng bảng. Đề xuất commit "docs: chốt quyết định cho build-first", rồi commit luôn.
```

---

## P1 — Nền backend

```text
Chế độ build-first đã được tôi duyệt (xem docs/README.md). Phiên này dựng NỀN BACKEND, chưa làm nghiệp vụ của feature nào.

Đọc trước: CLAUDE.md, technical_overview.md, docs/_shared/data_model.md, docs/_shared/open_questions.md (các mục "Đã chốt"), .claude/rules/backend/be-coding-rules.md, .claude/rules/backend/database-rules.md, ../Phân tích Class và ERD/04_Khoi_tao_CSDL_PostgreSQL.sql, và code hiện có trong backend/.
NestJS 12 / TypeORM 1.x: API nào chưa chắc thì mở type definition trong node_modules để kiểm tra. Không viết theo trí nhớ.

Phạm vi:
1. Cấu hình: dùng @nestjs/config, kiểm tra biến môi trường khi khởi động. Tạo backend/.env.example có đủ khoá: DB_*, REDIS_*, PORT, JWT (access/refresh), ADMIN_EMAIL, ADMIN_PASSWORD, AI_MODE, AI_SERVICE_URL, AI_TIMEOUT_MS=15000, AI_TOP_K=3, AI_CONFIDENCE_THRESHOLD, số lần đăng nhập sai và số phút khoá, cấu hình lưu ảnh, Google (nếu đã chốt làm). Không đọc, không sửa .env.
2. Áp quyết định TD-09 (observe), TD-06 (cổng). Sửa healthcheck trong docker-compose cho khớp DB_NAME (hiện trạng H4).
3. CSDL: TypeORM data source, synchronize: false. Migration đầu tiên tạo 11 bảng ĐÚNG như data_model.md (đã áp quyết định P0): CHECK, UNIQUE, FK kép, partial index, ON DELETE. Thêm script npm "migration:run", "migration:revert", "seed".
4. Entity cho 11 bảng, chia theo 4 mô-đun ở cấu trúc trong be-coding-rules.md mục 2. Chọn MỘT cách xử lý BIGINT/DECIMAL trả về dạng chuỗi, áp dụng thống nhất, ghi lại lựa chọn vào database-rules.md mục 3.
5. Seed: 1 ADMIN đọc từ env, 5 loại cây. Thêm seed DEV riêng (có cờ hoặc lệnh riêng) dùng dữ liệu mẫu ở phần 2 của file SQL 04 (bệnh và nhãn ví dụ), ghi rõ đây là dữ liệu mẫu.
6. Dùng chung (common/): guard JWT toàn cục kèm decorator @Public, decorator @Roles + RolesGuard, decorator @CurrentUser, ValidationPipe toàn cục, exception filter và dạng response theo TD-05.
7. Hạ tầng cho các feature sau:
   - StorageService (theo TD-01): nhận JPG/PNG ≤ 10 MB, trả URL.
   - AiClient (đúng hợp đồng ở technical_overview.md mục 5), có 2 chế độ http | mock. Mock trả top-k từ các model_labels đang dùng, có thể giả lập lỗi và quá thời gian bằng tham số. Mọi chỗ gọi AI đều đi qua AiClient.
   - Đăng ký ScheduleModule (job làm ở feature my_plants).
8. Test: unit test cho guard, AiClient (mock); 1 e2e test "app khởi động và kết nối được DB".

Không làm: controller nghiệp vụ, màn hình.
Cách làm: lên kế hoạch trước, chờ tôi OK. Làm từng bước, sau mỗi bước chạy lint/build/test.
Xong: chạy `docker compose up -d`, `npm run migration:run`, `npm run seed`, `npm run lint && npm run build && npm test && npm run test:e2e`. Báo kết quả thật, cập nhật technical_overview.md mục 9 (hiện trạng), rồi commit "feat(backend): dựng nền" trên nhánh hiện tại.
```

---

## P2 — Nền frontend

```text
Chế độ build-first đã được duyệt. Phiên này dựng NỀN FRONTEND, chưa làm màn hình nghiệp vụ.

Đọc trước: CLAUDE.md, frontend/AGENTS.md (Next.js 16: tra node_modules/next/dist/docs/ trước khi dùng API), design_overview.md, ../design/README.md, ../design/08-nextjs-shadcn.md, ../design/05-components.md, ../design/06-layout-responsive.md, ../design/07-motion-states.md, .claude/rules/frontend/*, quyết định TD-02, TD-05 và cách giữ token trong docs/_shared/open_questions.md.

Phạm vi:
1. Làm ĐỦ 6 bước trong ../design/08-nextjs-shadcn.md:
   - chép tokens.css, components.css, globals.css
   - font Be Vietnam Pro (có bộ vietnamese), lang="vi"
   - khoá light mode, bỏ phím "d"
   - chỉnh components/ui/button.tsx theo bảng
   - thêm phần "Giao diện" vào frontend/CLAUDE.md, giữ nguyên dòng @AGENTS.md
   - kiểm tra lại
2. Thành phần design system trong components/ds/: dock (mobile ở đáy, desktop dọc bên trái), card-stack (seam, notch), health-status, stat-row. Các thành phần khác để feature nào cần thì tạo.
3. Khung route bằng App Router: nhóm trang xác thực (khuôn Biểu mẫu), nhóm trang USER (khuôn Trung tâm/Danh sách/Chi tiết, có dock), nhóm trang ADMIN (khuôn Quản trị). Trang tạm có trạng thái rỗng, chưa có nghiệp vụ.
4. lib/api/: client duy nhất gọi backend. Đọc base URL từ env, gắn token, làm mới token, chuẩn hoá lỗi theo TD-05, hiển thị message tiếng Việt từ backend. Thêm frontend/.env.example.
5. Bảo vệ route phía client: chưa đăng nhập thì chuyển sang màn đăng nhập và nhớ trang định vào. Đăng nhập xong USER về trang đó, ADMIN về Dashboard (C4 UC01). Làm sẵn khung, màn đăng nhập thật để feature auth làm.
6. lib/device/: lớp bọc camera (getUserMedia) và nén ảnh phía trình duyệt. Mới cần interface và bản cài đặt web.
7. Trạng thái dùng chung: loading, rỗng, lỗi, mất mạng theo design/07.

Không dùng Server Actions để gọi backend (cho tới khi chốt TD-02).
Cách làm: lên kế hoạch trước, chờ tôi OK.
Xong: chạy `npm run lint && npm run typecheck && npm run build`, chạy dev, tự kiểm tra checklist trong ui-design-rules.md ở 390px và 1440px (liệt kê những mục tôi cần nhìn bằng mắt). Báo kết quả, rồi commit "feat(frontend): dựng nền và cài design system".
```

---

## P3 — Một feature từ đầu đến cuối (dùng cho cả 7 feature)

Đổi `FEATURE = ...` ở dòng đầu, rồi dán thêm **ghi chú riêng** của feature đó (bảng bên dưới) vào cuối prompt. Trước khi chạy: `git checkout main && git merge <nhánh trước> && git checkout -b feat/<feature>`.

```text
FEATURE = auth

Chế độ build-first đã được duyệt: specs đang ở trạng thái "VERIFIED (build-first)". Phiên này build trọn FEATURE (backend + frontend).

Bước 1 — Nạp ngữ cảnh: làm theo .claude/skills/load-context/SKILL.md với FEATURE. Đọc toàn bộ docs/<FEATURE>/, docs/_shared/data_model.md, các mục "Đã chốt" trong open_questions.md, .claude/rules/ (backend, frontend), frontend/AGENTS.md, ../design/README.md. Đọc code nền đã có (common/, lib/api/, components/ds/) để dùng lại, không viết trùng.

Bước 2 — Tài liệu kỹ thuật bản gọn (thay /gen-docs ở chế độ build-first):
- Sinh docs/<FEATURE>/api_<FEATURE>.md và database_design_<FEATURE>.md theo docs/_templates/ và quy tắc trong .claude/skills/gen-docs/SKILL.md.
- Nếu feature có giao diện: thêm ../design/screens/<FEATURE>.md (TD-11; danh sách màn, khuôn trang, thành phần, trạng thái).
- Mỗi endpoint và màn hình ghi rõ phục vụ US/BR nào.
- Chưa sinh test_case/test_plan (để giai đoạn test).
- Đặt trạng thái "REVIEWED (build-first)". Cho tôi xem bảng tổng quan endpoint và màn hình, chờ tôi OK.

Bước 3 — Build: làm theo .claude/skills/feature-dev/SKILL.md, bắt đầu từ mục 2 (điều kiện coi như đã đạt nhờ bước 1–2). Lên kế hoạch, chờ tôi OK, rồi làm theo thứ tự backend → test API → frontend.
Bám sát tài liệu:
- Câu thông báo chép NGUYÊN VĂN từ specs.
- Quy tắc trong data_model.md mục 5 cài đặt ở service.
- Thao tác nhiều bảng phải nằm trong transaction.
- Có kiểm tra quyền sở hữu dữ liệu.
- Giao diện dùng token và thành phần của design system.
- Gặp chỗ tài liệu không nói, hoặc mâu thuẫn với một quyết định đã chốt: DỪNG lại hỏi tôi, rồi ghi vào open_questions.md. Không tự bịa.

Bước 4 — Kiểm chứng:
- Backend: `npm run lint && npm run build && npm test && npm run test:e2e`. E2E test bao luồng chính và các ngoại lệ chính của UC.
- Frontend: `npm run lint && npm run typecheck && npm run build`.
- Chạy cả hai app, tự thử luồng chính bằng tay qua API.
- Liệt kê các bước tôi cần tự bấm thử trên giao diện ở 390px và 1440px.

Bước 5 — Kết thúc:
- Cập nhật docs/<FEATURE>/ nếu khi code có thay đổi.
- Cập nhật bảng trạng thái trong docs/README.md (code: DONE (build-first)).
- Liệt kê nợ kỹ thuật và những chỗ đã đơn giản hoá để xử lý ở giai đoạn test.
- Commit "feat(<FEATURE>): ..." theo Conventional Commits.

Ghi chú riêng:
```

**Ghi chú riêng cho từng feature** (dán vào sau dòng "Ghi chú riêng:"):

| FEATURE | Ghi chú riêng |
|---|---|
| `auth` | Đăng ký và đăng nhập bằng email trước. Google OAuth làm theo quyết định ở P0. Nếu để sau thì giữ chỗ trong giao diện nhưng tắt bằng cấu hình. Khoá tài khoản theo cấu hình (BR-08). Điều hướng theo vai trò (BR-03). Đăng xuất phải huỷ refresh token theo TD-03. Không trả các trường nhạy cảm (be-coding-rules mục 9). |
| `catalog` | Chỉ ADMIN. Ràng buộc nhãn mô hình BR-15 → BR-19 phải có e2e test cho từng ca vi phạm. Quy tắc công khai bệnh (BR-06). Ẩn loại cây kéo theo ẩn bệnh (BR-12). Import nhãn qua AiClient.getLabels() (chế độ mock). Ảnh đi qua StorageService. Có màn "Xem trước". |
| `diagnosis` | Feature lõi. Làm đúng luồng ghi dữ liệu ở tài liệu Class/CSDL mục 7.4: tạo PROCESSING trước khi gọi AI → gọi AiClient → ánh xạ nhãn → áp ngưỡng → transaction COMPLETED + 3 dự đoán. Lỗi hoặc quá 15 giây thì FAILED. Lưu cả ảnh gốc lẫn ảnh đã chỉnh. Frontend: camera qua lib/device, có màn chỉnh sửa (cắt vuông, xoay, sáng, tương phản), nén ảnh trước khi gửi, KHÔNG resize về 224 ở client. Có 3 dạng kết quả (BR-15 → BR-17), lưu vào cây (BR-22 → BR-27, phần tạo nhắc tuỳ OQ-15). E2E test dùng mock có giả lập lỗi và quá thời gian. |
| `history` | Phân trang, tìm kiếm, lọc, nhóm "Hôm nay / 7 ngày qua / Trước đó". Xoá mềm nhiều mục trong một transaction, hoàn tác 5 giây (BR-08, BR-09). Áp quyết định OQ-23, OQ-24. Các trường hiển thị theo bảng ở mục 4 của specs. |
| `my_plants` | Máy trạng thái sức khoẻ theo Bảng 4.8 (BR-04), có unit test cho từng chuyển trạng thái. STATUS_CHANGE ghi kèm PlantLog trong cùng transaction. Xoá cây theo BR-11 (CASCADE / SET NULL). Job nhắc việc bằng @nestjs/schedule (BR-15, BR-16). Hỏi tôi tần suất chạy job. Danh sách thông báo theo quyết định OQ-16. |
| `disease_library` | Chỉ hiện bệnh PUBLISHED. Trang chủ (khuôn Trung tâm) theo quyết định OQ-10. Trang chi tiết bệnh dùng chung với diagnosis, có lưu ý "chỉ mang tính tham khảo". Bệnh liên quan = cùng loại cây hoặc cùng nhóm tác nhân. |
| `dashboard` | Chỉ ADMIN, là trang mặc định sau khi đăng nhập. Chỉ số theo bảng ở mục 3 của specs (Bảng 4.12), áp OQ-14, OQ-23, OQ-25. Thời gian phản hồi = completed_at − created_at. Tính cả lượt đã xoá mềm. Biểu đồ đường và biểu đồ tròn là thành phần mới, làm theo 6 câu hỏi ở design/00. Mỗi chỉ số có e2e test với dữ liệu mẫu, kết quả tính tay trước. |

---

## P4 — Giai đoạn test (mỗi feature một phiên)

```text
FEATURE = auth

Giai đoạn test cho FEATURE. Code đã build ở chế độ build-first.
1. Sinh docs/<FEATURE>/test_case_<FEATURE>.md và test_plan_<FEATURE>.md theo .claude/rules/tester/testing-rules.md: đủ luồng chính, luồng thay thế, ngoại lệ, biên, phân quyền. Truy vết về US/BR. Cho tôi xem ma trận truy vết, chờ tôi OK.
2. Làm theo .claude/skills/run-tests/SKILL.md: chạy toàn bộ, lưu evidence, viết test_report_<FEATURE>.md.
3. Mỗi lỗi tìm được: ghi vào report, sửa theo quy trình P5 (tìm nguyên nhân gốc trước, có test hồi quy). Lặp lại tới 100% PASS. Ca nào chặn thì ghi BLOCKED kèm lý do.
4. Đổi trạng thái specs và docs từ "(build-first)" sang VERIFIED / REVIEWED thật, sau khi tôi xác nhận.
5. Nhắc tôi chạy `/cross-check <FEATURE> impl` ở bước cuối.
Commit "test(<FEATURE>): ..." kèm evidence.
```

Sau đó chạy riêng: `/cross-check auth impl`. Lệnh này chạy trong subagent ngữ cảnh riêng, nên gõ lệnh trực tiếp, không kèm prompt.

---

## P5 — Sửa một lỗi

```text
Lỗi: <mô tả: đang ở màn hoặc endpoint nào, thao tác gì, kết quả thực tế, kết quả mong đợi, ảnh hoặc log nếu có>
Feature: <feature> · Tham chiếu: <BR-xx / TC-xx nếu biết>

1. Đọc docs/<feature>/specs_<feature>.md và các phần liên quan. Xác định hành vi ĐÚNG theo tài liệu. Nếu tài liệu không nói rõ: hỏi tôi, không đoán.
2. Tái hiện lỗi (viết test fail trước nếu được). Tìm nguyên nhân gốc, không vá triệu chứng.
3. Sửa trong phạm vi hẹp nhất. Thêm hoặc giữ test hồi quy.
4. Chạy lint, build, test của phần bị ảnh hưởng. Báo kết quả thật.
5. Nếu lỗi do AI hiểu sai một quy ước có thể lặp lại: đề xuất thêm một dòng vào .claude/rules/ (chờ tôi duyệt).
6. Commit "fix(<feature>): ...".
```

---

## Mẹo dùng

- **Phiên mới cho mỗi prompt.** Mỗi khi Claude hỏi hoặc lên kế hoạch, trả lời luôn trong phiên đó. Bạn có thể nói "OK, làm hết kế hoạch, chỉ dừng khi gặp chỗ tài liệu không nói" để nó chạy liền mạch.
- **Plan Mode** (Shift+Tab) hợp với P1, P2 và feature `diagnosis`.
- Claude hỏi một điểm chưa chốt mới → trả lời → bảo nó ghi vào `open_questions.md`. Đó là cách giữ cho phiên sau không đoán lại.
- Thấy code sai phong cách hoặc sai quy ước nhiều lần → chạy `/review-code <feature>` để đưa quy tắc vào `.claude/rules/`.
- Nhóm AI giao AI service → đổi `AI_MODE=http`, cập nhật `AI_SERVICE_URL`, chạy P4 cho `diagnosis` cùng nhóm AI.

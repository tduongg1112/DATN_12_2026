# Technical overview — Technical context

> Bước 1.2 của framework (TechLead/SA). Cập nhật 21/11/2026 theo quyết định build-first ngày 20/11 (mục 10, `docs/_shared/open_questions.md` mục B). Mục 9 mô tả hiện trạng code, **chưa** sửa theo quyết định. Mục nào còn "Chưa chốt" thì Claude **không tự chọn**.
> Người duyệt: Nguyễn Tùng Dương

## 1. Kiến trúc

**Đã chốt:** backend là một khối (modular monolith) chia mô-đun, AI service tách riêng, CSDL PostgreSQL. *(Class/ERD mục 10.3, trả lời câu hỏi #16 và #17 của Chương 4)* Hạ tầng phụ trợ chốt ngày 20/11 (mục 10).

```
┌──────────────────────┐  REST/JSON /api/v1  ┌──────────────────────────────┐   SQL   ┌──────────────┐
│ frontend (Next.js 16)│ ──────────────────► │ backend (NestJS 12) :4000    │ ──────► │ PostgreSQL 18│
│ :3000, web responsive│  Bearer + cookie    │  ├─ Tài khoản                │         └──────────────┘
│ chạy phía client,    │  httpOnly (refresh) │  ├─ Danh mục & nhãn mô hình  │ ──────► Redis 7: refresh token (TD-03)
│ tương thích PWA và   │                     │  ├─ Chẩn đoán                │ ──────► Ảnh qua StorageService: đĩa local (dev), AWS S3 (deploy) (TD-01)
│ Capacitor (TD-02)    │                     │  ├─ Cây trồng & nhắc việc    │ ──────► Google OAuth (TD-13)
└──────────────────────┘                     │  │  + job nhắc (@nestjs/schedule)
                                             │  └─ Dashboard (chỉ đọc, TD-08)
                                             └──────────────┬───────────────┘
                                                            │ HTTP multipart (mục 5); AI_MODE=mock khi chưa có
                                                            ▼
                                             ┌──────────────────────────────┐
                                             │ AI service (Python) :8000    │  POST /predict, GET /labels
                                             │ nhóm AI, vị trí mã: hoãn     │
                                             └──────────────────────────────┘
```

### Mô-đun backend *(Class/ERD mục 8; TD-08)*

| Mô-đun | Lớp / bảng | Quan hệ ra ngoài mô-đun |
|---|---|---|
| Tài khoản | User | → Plant, Diagnosis, Notification |
| Danh mục & nhãn mô hình | Crop, Disease, DiseaseImage, ModelLabel | → Plant, Diagnosis, DiagnosisPrediction |
| Chẩn đoán | Diagnosis, DiagnosisPrediction | ← User, Crop, Plant, ModelLabel |
| Cây trồng & nhắc việc | Plant, PlantLog, Reminder, Notification | ← User, Crop; → Diagnosis |
| Dashboard | Không có bảng riêng | Chỉ đọc bảng của các mô-đun trên bằng truy vấn tổng hợp |

Mọi quan hệ hợp thành nằm gọn trong một mô-đun. Giữa các mô-đun chỉ có quan hệ kết hợp và kết tập. AI service không có bảng riêng. Mô-đun `dashboard` là ngoại lệ duy nhất được truy vấn trực tiếp bảng của mô-đun khác, và chỉ để đọc (`be-coding-rules.md` mục 2).

## 2. Tech stack (theo `package.json` hiện tại)

### Frontend — `frontend/`

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Next.js (App Router) | 16.4.3 | **Đọc `frontend/AGENTS.md`**: API khác kiến thức cũ, tài liệu ở `node_modules/next/dist/docs/` |
| React / React DOM | 19.3.1 | |
| Tailwind CSS | ^4 (`@tailwindcss/postcss`) | Cấu hình trong CSS, không có `tailwind.config` |
| shadcn/ui | ^4.23.0, style `base-nova` | Xây trên `@base-ui/react` ^1.9.0, **không phải Radix** |
| Icon | lucide-react ^1.65.0 | Nét 1.5px theo design system |
| Theme | next-themes ^0.4.6 | Phải khoá về light mode (design/08 bước 3) |
| Tiện ích | class-variance-authority, cn, tw-animate-css | `lib/utils.ts` re-export `cn` |
| Chất lượng code | TypeScript ^5, ESLint ^9 + eslint-config-next, Prettier + prettier-plugin-tailwindcss | Script: `dev`, `build`, `start`, `lint`, `typecheck`, `format` |

Alias `@/*` trỏ về gốc `frontend/`. Thư mục hiện có: `app/`, `components/ui/`, `hooks/`, `lib/`, `public/`.

### Backend — `backend/`

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| NestJS | ^12 (common, core, config, jwt, passport, platform-express, schedule, typeorm) | `"type": "module"`, `module: nodenext`. Import tương đối phải có đuôi `.js` |
| ORM / DB driver | typeorm ^1.1.2, pg ^8.23.1 | Tắt `synchronize`, dùng migration (Class/ERD 7.1) |
| Xác thực | passport ^0.7, passport-jwt ^4, @nestjs/jwt, bcrypt ^6 | Google OAuth làm ngay trong `auth` (TD-13), thư viện chọn khi làm |
| Validation | class-validator ^0.15.1, class-transformer ^0.5.1 | |
| Test | vitest ^4, supertest ^7, @vitest/coverage-v8 | Unit: `*.spec.ts`. E2E: `test/*.e2e-spec.ts` |
| Lint / format | oxlint ^1.58, prettier (singleQuote, trailingComma all) | Script: `dev`, `build`, `lint`, `test`, `test:e2e`, `test:cov`, `format` |
| TypeScript | ^6.0.2, strict | |

### Hạ tầng — `backend/docker-compose.yml`

| Dịch vụ | Image | Biến môi trường (`backend/.env`) |
|---|---|---|
| PostgreSQL | postgres:18-alpine, DB mặc định `da_2026` | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Redis | redis:7-alpine | `REDIS_HOST`, `REDIS_PORT`. Dùng để lưu refresh token (TD-03) |
| Lưu ảnh | Dev: đĩa local `backend/uploads/` (gitignore), phục vụ tĩnh ở `/uploads`. Deploy: AWS S3 | `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR`, `STORAGE_PUBLIC_BASE_URL`, `STORAGE_MAX_BYTES`; khoá S3 thêm khi deploy (TD-01) |

**Dependency sẽ thêm** (đã duyệt về nguyên tắc ngày 20/11; tên gói và phiên bản hỏi lại khi cài): SDK S3 khi deploy (TD-01), client Redis (TD-03), `@nestjs/swagger` (TD-05), thư viện Google OAuth (TD-13), có thể thêm `cookie-parser` (TD-12).

Script SQL trong `../Phân tích Class và ERD/04_…sql` đã được chạy thử trên PostgreSQL 16 (Class/ERD 7.5).

### AI service — chưa có trong repo

Dự kiến viết bằng Python, PyTorch, chuyển sang ONNX/TFLite (Đề cương mục 7; Function List DIAG-04). Mã đặt ở đâu và chạy cùng hệ thống thế nào: hoãn, chờ nhóm AI (TD-04). Trong lúc chờ, backend dùng AI mock (`AI_MODE=mock`), trả top-3 từ `model_labels` đã seed. Cổng dự kiến 8000 (TD-06).

## 3. Cách thức giao tiếp

| Giữa | Cách | Trạng thái |
|---|---|---|
| Frontend ↔ Backend | REST/JSON, tiền tố `/api/v1`. JWT access token qua header Bearer, refresh token trong cookie httpOnly (FL AUTH-02). Thành công trả thẳng dữ liệu; lỗi `{statusCode, code, message, errors?}`; Swagger ở `/api/docs` khi dev | Đã chốt (TD-05, TD-12) |
| Backend ↔ AI service | HTTP: `POST /predict` (multipart), `GET /labels` (mục 5) | Dự kiến, cần chốt với nhóm AI. Hiện dùng mock (TD-04) |
| Backend ↔ Google | OAuth đăng nhập, lấy họ tên, email, ảnh đại diện (UC01) | Làm ngay trong `auth` (TD-13) |
| Backend ↔ lưu ảnh | Qua `StorageService`. Dev: `LocalDiskStorage`. Deploy: AWS S3, bucket riêng tư, presigned URL ngắn hạn | Đã chốt (TD-01, cập nhật 21/11) |
| Backend ↔ Redis | Lưu bản băm refresh token, xoay vòng, xoá khi đăng xuất | Đã chốt (TD-03) |
| Bất đồng bộ | Job định kỳ `@nestjs/schedule` quét lịch nhắc đến hạn, tạo thông báo (Class/ERD 4.8) | Chỉ thông báo trong ứng dụng, không khung giờ (OQ-09) |

## 4. Xác thực và phân quyền

- Đăng nhập bằng email + mật khẩu (bcrypt), hoặc Google. Email lưu chữ thường và là duy nhất. Tài khoản phải có ít nhất `password_hash` hoặc `google_id`. *(Class/ERD 4.1, 6.2)*
- Nhập sai mật khẩu 5 lần liên tiếp thì `locked_until` = hiện tại + 15 phút. Đăng nhập đúng thì đếm lại từ 0. *(Class/ERD 4.1. Chương 4 ghi "define sau", nên để các giá trị này trong cấu hình.)*
- Hai vai trò `USER` và `ADMIN`. Guard JWT áp cho mọi route trừ đăng ký và đăng nhập. Người dùng chỉ truy cập bản ghi có `user_id` của chính mình. *(Class/ERD 6.5)*
- Phiên đăng nhập, refresh token, OTP là dữ liệu ngắn hạn, không lưu thành bảng nghiệp vụ. *(Class/ERD 3.2)* Refresh token lưu bản băm trong Redis, xoay vòng mỗi lần refresh, xoá khi đăng xuất (TD-03).
- Phía trình duyệt: access token giữ trong bộ nhớ; refresh token trong cookie httpOnly, SameSite=Lax, path `/api/v1/auth` (TD-12). Khi triển khai, frontend và backend phải cùng site.
- Không xác minh email khi đăng ký (OQ-02). Có cập nhật hồ sơ và đổi mật khẩu (AUTH-04, OQ-04); tài khoản chỉ dùng Google thì không đổi mật khẩu (OQ-27). Quên mật khẩu hoãn (OQ-03).
- ADMIN dùng được mọi route của USER và có thêm route quản trị (OQ-22). Quy tắc sở hữu dữ liệu áp dụng cả với ADMIN.

## 5. Hợp đồng AI service (dự kiến, cần chốt với nhóm AI)

*Nguồn: Function List v0.2, sheet "Luồng chẩn đoán" mục C; Class/ERD 7.4.*

| Mục | Nội dung |
|---|---|
| `POST /predict` (multipart) | `image`: ảnh đã cắt vuông · `crop_code`: mã loại cây (**bắt buộc**, OQ-05 chốt 22/11) · `top_k`: mặc định 3 |
| `200 OK` (JSON) | `model_version` · `inference_ms` · `predictions: [{ class_code, probability }]` giảm dần · `heatmap_url` (tuỳ chọn) |
| Lỗi | `400` hoặc `422`: ảnh hỏng, sai định dạng, loại cây không hỗ trợ · `503`: AI service quá tải. Gặp lỗi thì backend đánh dấu lượt chẩn đoán `FAILED` và cho thử lại |
| `GET /labels` | Danh sách `class_code` của phiên bản mô hình đang dùng, để đối chiếu với `model_labels` khi đổi mô hình. Dạng JSON chưa chốt với nhóm AI; `HttpAiClient` tạm nhận mảng chuỗi |
| Thời gian chờ | 15 giây (Chương 4 UC02 ngoại lệ 10.1, ghi "define sau"). Để trong cấu hình |
| Tiền xử lý | AI service resize về 224×224 và chuẩn hoá giống hệt lúc huấn luyện. Ứng dụng chỉ cắt vuông |
| Ngưỡng độ tin cậy | **Một ngưỡng chung**, để trong cấu hình backend. Giá trị chờ nhóm AI (OQ-06) |
| Ánh xạ | Backend tra `class_code` trong `model_labels` (`is_active = true`). Không tìm thấy thì coi là lỗi cấu hình: `FAILED`, ghi log ERROR và gửi thông báo trong ứng dụng cho mọi ADMIN (OQ-26) |

Phía backend, mọi lời gọi AI service đi qua một interface client duy nhất, chọn bản cài theo `AI_MODE` (`mock` hoặc `http`, TD-04). Khi dev và test backend thì dùng mock; khi nghiệm thu thì dùng mô hình thật cùng nhóm AI. `crop_code` luôn được gửi, vì người dùng bắt buộc chọn loại cây trước khi chẩn đoán (OQ-05, chốt 22/11). Mô hình chạy trên server (OQ-18, chốt 22/11).

## 6. Dữ liệu

- Thiết kế CSDL dùng chung cho mọi feature: `docs/_shared/data_model.md`. Bản này chép từ Class/ERD mục 6 và đã áp quyết định DC-01 → DC-11 (20/11). Migration đầu tiên dựng theo `data_model.md`, không theo SQL 04 (SQL 04 chưa cập nhật, DC-12). Cột ảnh `*_url` lưu gì: chưa chốt (TD-14).
- Quy tắc đặt tên, kiểu dữ liệu, migration, seed: `.claude/rules/backend/database-rules.md`.
- Seed: 1 tài khoản ADMIN, email và mật khẩu đọc từ `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `.env`; 5 loại cây; nhãn mô hình do nhóm AI cung cấp; bệnh ở trạng thái `DRAFT`. *(Class/ERD 7.1, 7.2)*

## 7. Môi trường, triển khai, Git

| Mục | Hiện trạng |
|---|---|
| Môi trường | Chỉ có môi trường dev local: `docker compose up` cho PostgreSQL và Redis, `npm run dev` cho từng app. Cổng: frontend 3000, backend 4000, AI service 8000 (TD-06). Staging và production chưa định nghĩa (TD-07) |
| Docker | Đề cương dự kiến triển khai bằng Docker. Hiện mới có compose cho DB và Redis |
| CI/CD | Chưa có |
| Git | Monorepo `code/` với nhánh `main` và remote `origin`. Xem lịch sử bằng `git log`. Bản sao `.git` cũ của hai repo riêng được lưu ở `../git-backup-20261108/` |
| Commit | Conventional Commits. Phát triển trên nhánh `tduong-dev`, merge vào `main` sau bước 11; không bắt buộc nhánh riêng cho feature (Dương chốt 21/11) |
| Biến môi trường | `.env` bị ignore ở cả gốc lẫn `backend/`. Mẫu ở `backend/.env.example`. Backend kiểm tra biến khi khởi động (`src/config/env.validation.ts`): thiếu hoặc sai thì dừng và nêu tên khoá. Migration và seed chỉ cần `DB_*` (seed cần thêm `ADMIN_*`) |
| Tài liệu ngoài git | `../design/`, gồm mô tả màn hình ở `../design/screens/<feature>.md` (TD-11) và nguồn SRS ở thư mục cha |

## 8. Bộ quy tắc bắt buộc (`.claude/rules/`)

| File | Tự nạp khi Claude đọc | Nội dung |
|---|---|---|
| `backend/be-coding-rules.md` | `backend/**` | Cấu trúc mô-đun NestJS, ESM, config, auth, validation, transaction, gọi AI service, job |
| `backend/database-rules.md` | entity, migration, seed, `docs/**/database_design_*.md` | Đặt tên, kiểu dữ liệu, khoá, xoá mềm, ON DELETE, migration |
| `frontend/fe-coding-rules.md` | `frontend/**` | Next.js 16, cấu trúc thư mục, lớp gọi API, lớp dịch vụ thiết bị, xử lý ảnh |
| `frontend/ui-design-rules.md` | `frontend/**/*.{tsx,css}` | Áp dụng design system `../design/` và mô tả màn hình ở `../design/screens/` (đọc tường minh vì nằm ngoài repo) |
| `tester/testing-rules.md` | `docs/**/test_*.md`, file test | Mẫu test case, độ phủ, evidence, test report |

Các rule chỉ tự nạp khi Claude **đọc** file khớp đường dẫn. Vì vậy các skill `/feature-dev`, `/gen-docs`, `/run-tests` luôn yêu cầu đọc rule tương ứng ngay từ đầu.

## 9. Hiện trạng repo (cập nhật 21/11/2026, sau phiên dựng nền backend và frontend)

**Backend: đã có nền, chưa có nghiệp vụ.**

| # | Hiện trạng | Ghi chú |
|---|---|---|
| B1 | Cấu hình: `@nestjs/config` toàn cục, kiểm tra biến môi trường lúc khởi động (`src/config/env.validation.ts`), mẫu ở `backend/.env.example`. Cổng 4000, tiền tố `/api/v1`, CORS theo `FRONTEND_URL` có `credentials` (`src/configure-app.ts`) | TD-05, TD-06, TD-12 |
| B2 | CSDL: data source dùng chung Nest và CLI, `synchronize: false`, `parseInt8: true`. Migration `InitSchema1795219200000` tạo 11 bảng đúng `data_model.md`. `schema:log` báo entity khớp CSDL | `database-rules.md` mục 3, 6 |
| B3 | 11 entity chia theo 4 mô-đun `accounts`, `catalog`, `diagnosis`, `plants`; module khung đăng ký entity, chưa có controller | |
| B4 | Seed: `npm run seed` (1 ADMIN + 5 loại cây), `npm run seed:dev` (thêm 6 bệnh, 11 nhãn **mẫu** từ SQL 04). Chạy lại không tạo trùng | |
| B5 | `src/common/`: `JwtAuthGuard` toàn cục + `@Public()`, `RolesGuard` + `@Roles()` (ADMIN qua được route USER, OQ-22), `@CurrentUser()`, `ValidationPipe` toàn cục, `AllExceptionsFilter` và `AppException` theo TD-05 | Câu lỗi dự phòng ở `default-errors.ts` chờ Dương duyệt |
| B6 | `StorageService` + `LocalDiskStorage` (JPG/PNG theo magic bytes, ≤ 10 MB). Ảnh phục vụ tĩnh ở `/uploads`, ngoài tiền tố API nên 404 trả HTML mặc định của Express | TD-01 (dev) |
| B7 | `AiClient` (mô-đun `diagnosis`): `HttpAiClient` đúng hợp đồng mục 5; `MockAiClient` lấy top-k từ `model_labels` đang dùng, giả lập lỗi bằng `AI_MOCK_SCENARIO` | TD-04 |
| B8 | `ScheduleModule.forRoot()` đã đăng ký; chưa có job | Job làm ở `my_plants` |
| B9 | `GET /api/v1/health` (`@Public`): kiểm tra kết nối CSDL | Endpoint hạ tầng |
| B10 | Test: 53 unit test (`npm test`), 4 e2e (`npm run test:e2e`, cần Docker, migration và `.env` đủ khoá) | |
| B11 | `@nestjs/observe` đã gỡ (TD-09). Healthcheck compose dùng `${DB_NAME:-da_2026}` | H3, H4 cũ đã xử lý |
| B12 | Chưa có: client Redis (TD-03), Swagger (TD-05), Google OAuth (TD-13), bản S3 của StorageService | Làm ở feature `auth` hoặc khi deploy |

**Frontend: đã có nền và design system, chưa có màn hình nghiệp vụ.**

| # | Hiện trạng | Ghi chú |
|---|---|---|
| F1 | Design system cài đủ 6 bước của design/08: `styles/tokens.css`, `styles/components.css`, `app/globals.css`; Be Vietnam Pro (bộ `vietnamese`), `lang="vi"`, khoá light mode, `button.tsx` chỉnh theo bảng (bỏ size `xs`, `icon-xs` vì dưới 44px), `frontend/CLAUDE.md` có mục "Giao diện" | H1 cũ đã xử lý |
| F2 | `components/ds/`: `dock`, `card-stack` (Card, seam, notch), `health-status`, `stat-row`, `states/` (rỗng, lỗi, skeleton, mất mạng) | |
| F3 | Route (URL tiếng Anh): `(auth)` `/login`, `/register` (khuôn Biểu mẫu); `(user)` `/`, `/diagnose`, `/history`, `/plants`, `/library` (có dock, USER và ADMIN); `admin` `/admin`, `/admin/catalog` (chỉ ADMIN). Trang tạm, chưa có nghiệp vụ. Mọi route đều tĩnh (○) | TD-02 |
| F4 | `lib/api/`: client duy nhất, base URL từ `NEXT_PUBLIC_API_URL` (`frontend/.env.example`), gắn Bearer, refresh một lần khi gặp 401, `ApiError` theo TD-05. Hợp đồng `/auth/refresh`, `/auth/logout` là **giả định** ở `auth-endpoints.ts` | TD-05, TD-12 |
| F5 | `lib/auth/`: access token trong bộ nhớ, khôi phục phiên bằng refresh khi mở app, `RequireAuth` (chuyển tới `/login?next=…`), `postLoginRedirect` (ADMIN về `/admin`) | C4 UC01, OQ-22 |
| F6 | `lib/device/`: `CameraService` + bản web (`getUserMedia`), nén ảnh (cạnh dài 1600px, JPEG 0.85, đề xuất), kiểm tra JPG/PNG ≤ 10 MB | design/06 |
| F7 | Trang `/dev/*` (`app/dev/**/page.dev.tsx`) chỉ có khi `next dev` nhờ `pageExtensions` theo phase trong `next.config.ts`; bản build production không chứa chúng. Dùng để xem thành phần và khung trang không cần đăng nhập | |
| F8 | Next.js 16.4.3 báo có lỗ hổng bảo mật đã công bố (npm advisories); `next build`/`next dev` đôi khi dừng lần đầu để nhắc. Chưa nâng cấp, chờ Dương quyết | |

**Tài liệu:**

| # | Hiện trạng | Ảnh hưởng |
|---|---|---|
| H2 | `../design/08-nextjs-shadcn.md` ghi "frontend repo git riêng" | Đã lỗi thời: `code/` hiện là monorepo. `design/` vẫn nằm ngoài git |

## 10. Quyết định kỹ thuật (TechLead)

> **Chế độ build-first (20/11/2026):** Dương chốt các quyết định dưới đây để bắt đầu code, sẽ review lại ở giai đoạn test. Chi tiết, lý do và trạng thái ở `docs/_shared/open_questions.md` mục B. Mục 1–8 đã viết lại theo các quyết định này (21/11); mục 9 vẫn là hiện trạng code.

| Mã | Quyết định | Trạng thái | Chặn feature |
|---|---|---|---|
| TD-01 | Ảnh đi qua interface `StorageService`. Dev: đĩa local (cập nhật 21/11). Deploy: **AWS S3**, bucket riêng tư, presigned URL ngắn hạn, thêm SDK S3 | Đã chốt | diagnosis, catalog, my_plants, auth |
| TD-02 | Chưa chọn PWA hay Capacitor. Code tương thích cả hai: gọi API phía client qua `lib/api`, không dùng Server Actions, không dùng Server Components lấy dữ liệu động | Hoãn | — |
| TD-03 | Redis lưu bản băm refresh token, xoay vòng khi refresh, xoá khi đăng xuất | Đã chốt | — |
| TD-04 | AI mock trong backend (`AI_MODE=mock\|http`). Vị trí mã AI service và cách chạy chung: chờ nhóm AI | Chốt một phần | — |
| TD-05 | Tiền tố `/api/v1`; trả thẳng dữ liệu; danh sách `{items, page, pageSize, total}`; lỗi `{statusCode, code, message, errors?}`; Swagger chỉ bật ở dev tại `/api/docs` | Đã chốt | — |
| TD-06 | Frontend 3000, backend 4000, AI service 8000 | Đã chốt | — |
| TD-07 | Môi trường demo/staging và cách triển khai | Chưa chốt | Bước 10–11 |
| TD-08 | Mô-đun thứ 5 `dashboard`, truy vấn tổng hợp chỉ đọc qua `DataSource` | Đã chốt | — |
| TD-24 | Ngoại lệ thứ hai của ranh giới mô-đun: truy vấn "Đang phổ biến" đặt trong `catalog`, chỉ đọc `diagnoses`, `diagnosis_predictions` qua `DataSource` | Đã chốt 22/11 | disease_library |
| TD-09 | Bỏ `@nestjs/observe` | Đã áp dụng 21/11 | — |
| TD-10 | Công cụ test UI end-to-end | Hoãn tới bước 10 | — |
| TD-11 | Mô tả màn hình đặt ở `../design/screens/` (ngoài git) | Đã chốt | Bước 6 (`/gen-docs` và các skill đã cập nhật 21/11) |
| TD-12 | Access token trong bộ nhớ; refresh token trong cookie httpOnly, SameSite=Lax, path `/api/v1/auth` | Đã chốt | — |
| TD-13 | Google OAuth làm ngay trong `auth` | Đã chốt | — |
| TD-14 | Cột ảnh `*_url` lưu khoá đối tượng S3 hay URL đầy đủ | Chưa chốt | Entity đầu tiên có cột ảnh (auth: `avatar_url`) |

Dependency mới đã được duyệt về nguyên tắc, tên gói và phiên bản cụ thể hỏi lại khi cài: SDK S3 (TD-01), client Redis (TD-03), `@nestjs/swagger` (TD-05), thư viện Google OAuth (TD-13), có thể thêm `cookie-parser` (TD-12).

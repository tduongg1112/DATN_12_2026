# Technical overview — Technical context

> Bước 1.2 của framework (TechLead/SA). Phần "Hiện trạng" mô tả đúng những gì đang có trong repo ngày 20/11/2026. Phần "Quyết định cần chốt" là lựa chọn kỹ thuật chưa được ghi ở tài liệu nào. Claude **không tự chọn** các mục này.
> Người duyệt: Nguyễn Tùng Dương

## 1. Kiến trúc

**Đã chốt:** backend là một khối (modular monolith) chia mô-đun, AI service tách riêng, CSDL PostgreSQL. *(Class/ERD mục 10.3, trả lời câu hỏi #16 và #17 của Chương 4)*

```
┌──────────────────────┐   REST/JSON + JWT   ┌──────────────────────────────┐   SQL   ┌──────────────┐
│ frontend (Next.js 16)│ ──────────────────► │ backend (NestJS 12)          │ ──────► │ PostgreSQL 18│
│ web responsive,      │                     │  ├─ Tài khoản                │         └──────────────┘
│ đóng gói app sau     │                     │  ├─ Danh mục & nhãn mô hình  │ ──────► Redis 7 (mục đích: TD-03)
└──────────────────────┘                     │  ├─ Chẩn đoán                │ ──────► Lưu trữ ảnh (TD-01)
                                             │  └─ Cây trồng & nhắc việc    │ ──────► Google OAuth
                                             │     + job nhắc (@nestjs/schedule)
                                             └──────────────┬───────────────┘
                                                            │ HTTP multipart (mục 5)
                                                            ▼
                                             ┌──────────────────────────────┐
                                             │ AI service (Python) — nhóm AI│  POST /predict, GET /labels
                                             └──────────────────────────────┘
```

### Mô-đun backend *(Class/ERD mục 8)*

| Mô-đun | Lớp / bảng | Quan hệ ra ngoài mô-đun |
|---|---|---|
| Tài khoản | User | → Plant, Diagnosis, Notification |
| Danh mục & nhãn mô hình | Crop, Disease, DiseaseImage, ModelLabel | → Plant, Diagnosis, DiagnosisPrediction |
| Chẩn đoán | Diagnosis, DiagnosisPrediction | ← User, Crop, Plant, ModelLabel |
| Cây trồng & nhắc việc | Plant, PlantLog, Reminder, Notification | ← User, Crop; → Diagnosis |

Mọi quan hệ hợp thành nằm gọn trong một mô-đun. Giữa các mô-đun chỉ có quan hệ kết hợp và kết tập. AI service không có bảng riêng. Dashboard (UC07) đọc dữ liệu của nhiều mô-đun nhưng chưa được xếp vào mô-đun nào, xem TD-08.

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
| Xác thực | passport ^0.7, passport-jwt ^4, @nestjs/jwt, bcrypt ^6 | Google OAuth chưa có thư viện, cần chọn khi làm `auth` |
| Validation | class-validator ^0.15.1, class-transformer ^0.5.1 | |
| Quan sát | @nestjs/observe ^0.1.8 | Đang để khoá mẫu `YOUR_APP_KEY`, xem TD-09 |
| Test | vitest ^4, supertest ^7, @vitest/coverage-v8 | Unit: `*.spec.ts`. E2E: `test/*.e2e-spec.ts` |
| Lint / format | oxlint ^1.58, prettier (singleQuote, trailingComma all) | Script: `dev`, `build`, `lint`, `test`, `test:e2e`, `test:cov`, `format` |
| TypeScript | ^6.0.2, strict | |

### Hạ tầng — `backend/docker-compose.yml`

| Dịch vụ | Image | Biến môi trường (`backend/.env`) |
|---|---|---|
| PostgreSQL | postgres:18-alpine, DB mặc định `da_2026` | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Redis | redis:7-alpine | `REDIS_HOST`, `REDIS_PORT` |

Script SQL trong `../Phân tích Class và ERD/04_…sql` đã được chạy thử trên PostgreSQL 16 (Class/ERD 7.5).

### AI service — chưa có trong repo

Dự kiến viết bằng Python, PyTorch, chuyển sang ONNX/TFLite (Đề cương mục 7; Function List DIAG-04). Mã đặt ở đâu và chạy cùng hệ thống thế nào: xem TD-04.

## 3. Cách thức giao tiếp

| Giữa | Cách | Trạng thái |
|---|---|---|
| Frontend ↔ Backend | REST/JSON, JWT access + refresh token (FL AUTH-02) | Định dạng response và lỗi chưa chốt (TD-05) |
| Backend ↔ AI service | HTTP: `POST /predict` (multipart), `GET /labels` (mục 5) | Dự kiến, cần chốt với nhóm AI |
| Backend ↔ Google | OAuth đăng nhập, lấy họ tên, email, ảnh đại diện (UC01) | |
| Bất đồng bộ | Job định kỳ `@nestjs/schedule` quét lịch nhắc đến hạn, tạo thông báo (Class/ERD 4.8) | Kênh gửi thông báo chưa chốt (OQ-09) |

## 4. Xác thực và phân quyền

- Đăng nhập bằng email + mật khẩu (bcrypt), hoặc Google. Email lưu chữ thường và là duy nhất. Tài khoản phải có ít nhất `password_hash` hoặc `google_id`. *(Class/ERD 4.1, 6.2)*
- Nhập sai mật khẩu 5 lần liên tiếp thì `locked_until` = hiện tại + 15 phút. Đăng nhập đúng thì đếm lại từ 0. *(Class/ERD 4.1. Chương 4 ghi "define sau", nên để các giá trị này trong cấu hình.)*
- Hai vai trò `USER` và `ADMIN`. Guard JWT áp cho mọi route trừ đăng ký và đăng nhập. Người dùng chỉ truy cập bản ghi có `user_id` của chính mình. *(Class/ERD 6.5)*
- Phiên đăng nhập, refresh token, OTP là dữ liệu ngắn hạn, không lưu thành bảng nghiệp vụ. *(Class/ERD 3.2)*

## 5. Hợp đồng AI service (dự kiến, cần chốt với nhóm AI)

*Nguồn: Function List v0.2, sheet "Luồng chẩn đoán" mục C; Class/ERD 7.4.*

| Mục | Nội dung |
|---|---|
| `POST /predict` (multipart) | `image`: ảnh đã cắt vuông · `crop_code`: mã loại cây (tuỳ chọn) · `top_k`: mặc định 3 |
| `200 OK` (JSON) | `model_version` · `inference_ms` · `predictions: [{ class_code, probability }]` giảm dần · `heatmap_url` (tuỳ chọn) |
| Lỗi | `400` hoặc `422`: ảnh hỏng, sai định dạng, loại cây không hỗ trợ · `503`: AI service quá tải. Gặp lỗi thì backend đánh dấu lượt chẩn đoán `FAILED` và cho thử lại |
| `GET /labels` | Danh sách `class_code` của phiên bản mô hình đang dùng, để đối chiếu với `model_labels` khi đổi mô hình |
| Thời gian chờ | 15 giây (Chương 4 UC02 ngoại lệ 10.1, ghi "define sau"). Để trong cấu hình |
| Tiền xử lý | AI service resize về 224×224 và chuẩn hoá giống hệt lúc huấn luyện. Ứng dụng chỉ cắt vuông |
| Ngưỡng độ tin cậy | Để trong cấu hình backend. Nhóm AI đề xuất giá trị (OQ-06) |
| Ánh xạ | Backend tra `class_code` trong `model_labels` (`is_active = true`). Không tìm thấy thì coi là lỗi cấu hình: `FAILED` và báo Quản trị viên (OQ-26) |

Phía backend, mọi lời gọi AI service đi qua một lớp client duy nhất. Khi test backend thì mock lớp này, khi nghiệm thu thì dùng mô hình thật cùng nhóm AI.

## 6. Dữ liệu

- Thiết kế CSDL dùng chung cho mọi feature: `docs/_shared/data_model.md`. Bản này chép từ Class/ERD mục 6 và đánh dấu các điểm lệch với ERD 19/11.
- Quy tắc đặt tên, kiểu dữ liệu, migration, seed: `.claude/rules/backend/database-rules.md`.
- Seed: 1 tài khoản ADMIN, email và mật khẩu đọc từ `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `.env`; 5 loại cây; nhãn mô hình do nhóm AI cung cấp; bệnh ở trạng thái `DRAFT`. *(Class/ERD 7.1, 7.2)*

## 7. Môi trường, triển khai, Git

| Mục | Hiện trạng |
|---|---|
| Môi trường | Chỉ có môi trường dev local: `docker compose up` cho PostgreSQL và Redis, `npm run dev` cho từng app. Staging và production chưa định nghĩa (TD-07) |
| Docker | Đề cương dự kiến triển khai bằng Docker. Hiện mới có compose cho DB và Redis |
| CI/CD | Chưa có |
| Git | Monorepo `code/` với nhánh `main` và remote `origin`. Có 1 commit `e1800bf feat: khởi tạo monorepo cho backend và frontend`. Bản sao `.git` cũ của hai repo riêng được lưu ở `../git-backup-20261108/` |
| Commit | Conventional Commits. Đề xuất mỗi feature một nhánh `feat/<feature>`, merge vào `main` sau bước 11 |
| Biến môi trường | `.env` bị ignore ở cả gốc lẫn `backend/`. **Chưa có `.env.example`** (`.gitignore` gốc đã cho phép `!.env.example`) |

## 8. Bộ quy tắc bắt buộc (`.claude/rules/`)

| File | Tự nạp khi Claude đọc | Nội dung |
|---|---|---|
| `backend/be-coding-rules.md` | `backend/**` | Cấu trúc mô-đun NestJS, ESM, config, auth, validation, transaction, gọi AI service, job |
| `backend/database-rules.md` | entity, migration, seed, `docs/**/database_design_*.md` | Đặt tên, kiểu dữ liệu, khoá, xoá mềm, ON DELETE, migration |
| `frontend/fe-coding-rules.md` | `frontend/**` | Next.js 16, cấu trúc thư mục, lớp gọi API, lớp dịch vụ thiết bị, xử lý ảnh |
| `frontend/ui-design-rules.md` | `frontend/**/*.{tsx,css}`, `docs/**/design_*.md` | Áp dụng design system `../design/` |
| `tester/testing-rules.md` | `docs/**/test_*.md`, file test | Mẫu test case, độ phủ, evidence, test report |

Các rule chỉ tự nạp khi Claude **đọc** file khớp đường dẫn. Vì vậy các skill `/feature-dev`, `/gen-docs`, `/run-tests` luôn yêu cầu đọc rule tương ứng ngay từ đầu.

## 9. Hiện trạng repo cần biết (sự thật, chưa sửa)

| # | Hiện trạng | Ảnh hưởng |
|---|---|---|
| H1 | `frontend/`: font Inter (chỉ bộ latin), `lang="en"`, phím `d` đổi dark mode, `app/globals.css` là theme mặc định của shadcn | Chưa cài design system. Làm 6 bước ở `../design/08-nextjs-shadcn.md` trước màn hình đầu tiên |
| H2 | `../design/08-nextjs-shadcn.md` ghi "frontend repo git riêng" | Đã lỗi thời: `code/` hiện là monorepo. `design/` vẫn nằm ngoài git |
| H3 | `backend/src/app.module.ts` khởi tạo `ObserveModule` với `appKey: 'YOUR_APP_KEY'` | Khoá mẫu của template (TD-09) |
| H4 | Healthcheck trong `docker-compose.yml` dùng tên DB mặc định `task_management`, trong khi `POSTGRES_DB` mặc định là `da_2026` | Healthcheck có thể sai khi không đặt `DB_NAME` |
| H5 | Backend nghe `PORT ?? 3000`, `next dev` mặc định cũng là 3000 | Trùng cổng khi chạy cả hai (TD-06) |
| H6 | `backend/` mới là template: chỉ có `AppController` trả "Hello World!" | Các mô-đun nghiệp vụ chưa có |

## 10. Quyết định kỹ thuật (TechLead)

> **Chế độ build-first (20/11/2026):** Dương chốt các quyết định dưới đây để bắt đầu code, sẽ review lại ở giai đoạn test. Chi tiết, lý do và trạng thái ở `docs/_shared/open_questions.md` mục B. Các mục 1–9 phía trên vẫn mô tả hiện trạng ngày 20/11, **chưa** được viết lại theo các quyết định này.

| Mã | Quyết định | Trạng thái | Chặn feature |
|---|---|---|---|
| TD-01 | Lưu ảnh trên **AWS S3**, đặt sau interface `StorageService`; bucket riêng tư, đọc qua presigned URL ngắn hạn; thêm SDK S3 | Đã chốt | diagnosis, catalog, my_plants, auth |
| TD-02 | Chưa chọn PWA hay Capacitor. Code tương thích cả hai: gọi API phía client qua `lib/api`, không dùng Server Actions, không dùng Server Components lấy dữ liệu động | Hoãn | — |
| TD-03 | Redis lưu bản băm refresh token, xoay vòng khi refresh, xoá khi đăng xuất | Đã chốt | — |
| TD-04 | AI mock trong backend (`AI_MODE=mock\|http`). Vị trí mã AI service và cách chạy chung: chờ nhóm AI | Chốt một phần | — |
| TD-05 | Tiền tố `/api/v1`; trả thẳng dữ liệu; danh sách `{items, page, pageSize, total}`; lỗi `{statusCode, code, message, errors?}`; Swagger chỉ bật ở dev tại `/api/docs` | Đã chốt | — |
| TD-06 | Frontend 3000, backend 4000, AI service 8000 | Đã chốt | — |
| TD-07 | Môi trường demo/staging và cách triển khai | Chưa chốt | Bước 10–11 |
| TD-08 | Mô-đun thứ 5 `dashboard`, truy vấn tổng hợp chỉ đọc qua `DataSource` | Đã chốt | — |
| TD-09 | Bỏ `@nestjs/observe` (gỡ ở việc nền) | Đã chốt | — |
| TD-10 | Công cụ test UI end-to-end | Hoãn tới bước 10 | — |
| TD-11 | Mô tả màn hình đặt ở `../design/screens/` (ngoài git) | Đã chốt | Bước 6 (cần sửa `/gen-docs`, chờ duyệt) |
| TD-12 | Access token trong bộ nhớ; refresh token trong cookie httpOnly, SameSite=Lax, path `/api/v1/auth` | Đã chốt | — |
| TD-13 | Google OAuth làm ngay trong `auth` | Đã chốt | — |

Dependency mới đã được duyệt về nguyên tắc, tên gói và phiên bản cụ thể hỏi lại khi cài: SDK S3 (TD-01), client Redis (TD-03), `@nestjs/swagger` (TD-05), thư viện Google OAuth (TD-13), có thể thêm `cookie-parser` (TD-12).

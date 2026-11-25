---
paths:
  - "backend/**"
---

# Quy tắc code backend (NestJS)

> Mỗi quy tắc ghi nguồn trong ngoặc: **[Repo]** cấu hình hiện có, **[ERD]** tài liệu Phân tích Class & CSDL, **[C4]** Chương 4, **[FL]** Function List v0.2, **[OQ-xx] / [TD-xx]** quyết định ngày 20/11 (build-first) trong `docs/_shared/open_questions.md`. Quy tắc gắn nhãn **(đề xuất)** là mặc định do Claude soạn và chưa được Dương duyệt. Sau bước `/review-code`, quy tắc nào được duyệt thì bỏ nhãn. Dữ liệu và CSDL: xem `database-rules.md`.

## 1. Nền tảng

- NestJS ^12, ESM (`"type": "module"`, `module: nodenext`). Import tương đối **phải có đuôi `.js`**, ví dụ `import { AppService } from './app.service.js'`. [Repo]
- TypeScript strict. Prettier dùng `singleQuote`, `trailingComma: all`. Lint bằng `npm run lint` (oxlint). [Repo]
- NestJS 12 và TypeORM 1.x mới hơn kiến thức huấn luyện. Trước khi dùng decorator hay API chưa chắc chắn, mở type definition trong `node_modules/@nestjs/*` hoặc `node_modules/typeorm` để kiểm tra. Không viết theo trí nhớ. [Repo]
- Không thêm dependency khi chưa hỏi Dương. Các dependency sau **đã được duyệt về nguyên tắc**, nhưng vẫn phải hỏi tên gói và phiên bản, và kiểm tra tương thích NestJS 12 trước khi cài: SDK S3 khi deploy [TD-01], client Redis [TD-03], `@nestjs/swagger` [TD-05], thư viện Google OAuth [TD-13], `cookie-parser` nếu cần [TD-12].
- `@nestjs/observe` đã gỡ (21/11). Không dùng lại [TD-09].
- Backend chạy cổng **4000** (`PORT` trong `.env.example`). Frontend 3000, AI service 8000 [TD-06].

## 2. Cấu trúc mô-đun

- Có **5 mô-đun**: 4 mô-đun nghiệp vụ theo [ERD] mục 8 (Tài khoản, Danh mục & nhãn mô hình, Chẩn đoán, Cây trồng & nhắc việc) và mô-đun `dashboard` [TD-08]. Không tự tạo thêm mô-đun nghiệp vụ.
- Thư mục:
  ```
  backend/src/
  ├── main.ts, app.module.ts
  ├── config/                 cấu hình đọc từ env (@nestjs/config)
  ├── common/                 guard, decorator, filter, pipe dùng chung
  │   └── storage/            StorageService; bản LocalDiskStorage (dev), bản S3 thêm khi deploy [TD-01]
  ├── database/               data source, migrations/, seeds/
  └── modules/
      ├── accounts/           User + xác thực (đăng ký, đăng nhập, Google, JWT, hồ sơ)
      ├── catalog/            Crop, Disease, DiseaseImage, ModelLabel
      ├── diagnosis/          Diagnosis, DiagnosisPrediction + client gọi AI service (thật và mock)
      ├── plants/             Plant, PlantLog, Reminder, Notification + job nhắc việc
      └── dashboard/          Chỉ đọc, không có entity riêng [TD-08]
  ```
  Trong mỗi mô-đun: `<x>.module.ts`, `<x>.controller.ts`, `<x>.service.ts`, `entities/`, `dto/`. Test đơn vị `*.spec.ts` đặt cạnh file được test.
- Mô-đun này gọi mô-đun khác qua **service mà mô-đun kia export**, không inject repository của mô-đun khác. Lý do: [ERD] mục 8 giữ ranh giới mô-đun để sau này tách service được.
- **Ngoại lệ (chỉ ba chỗ):** được chạy truy vấn tổng hợp **chỉ đọc** trực tiếp qua `DataSource` / QueryBuilder trên bảng của mô-đun khác. Không ghi, không inject repository của mô-đun khác.
  - Mô-đun `dashboard` [TD-08].
  - Truy vấn "Đang phổ biến" của thư viện bệnh, đặt trong `catalog` (`disease-trends.query.ts`), đọc `diagnoses`, `diagnosis_predictions` [TD-24]. Lý do: `diagnosis` đã import `catalog`, import ngược sẽ tạo vòng phụ thuộc mô-đun.
  - Truy vấn lượt chẩn đoán của cây, đặt trong `plants` (`plant-reads.query.ts`): ngày chẩn đoán gần nhất, bệnh đang mắc, dòng thời gian [TD-29]. Lý do như trên: `diagnosis` đã import `plants`.
- API quản trị cần gọi AI (đối chiếu, ngừng dùng nhãn mô hình) đặt ở `diagnosis/labels/`, ghi CSDL qua hàm do `ModelLabelService` của `catalog` export [TD-31].

## 3. Cấu hình

- Mọi tham số đều đọc qua `@nestjs/config`, không hard-code. Gồm:
  - AI: `AI_MODE` (`mock` hoặc `http`) [TD-04], URL AI service, thời gian chờ (15 giây [C4]), `top_k` = 3 [ERD], **một ngưỡng độ tin cậy chung** [OQ-06].
  - Tài khoản: số lần đăng nhập sai và thời gian khoá (5 lần, 15 phút [ERD][OQ-02]), JWT secret và thời hạn access/refresh, `ADMIN_EMAIL`, `ADMIN_PASSWORD` [ERD 7.1], `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` [TD-13].
  - Hạ tầng: `PORT`, `DB_*`, `REDIS_HOST`, `REDIS_PORT` [TD-03], cấu hình S3 (bucket, region, khoá truy cập, thời hạn presigned URL) [TD-01], URL frontend cho CORS.
  - Thư viện bệnh: số bệnh N và số ngày (30) cho "Đang phổ biến" [OQ-28].
- Ngưỡng độ tin cậy `AI_CONFIDENCE_THRESHOLD` **tạm** mặc định 0.6 trong `env.validation.ts` [TD-26] cho tới khi nhóm AI chốt (OQ-06). Không đổi sang số khác khi chưa hỏi Dương. Test dùng giá trị đặt riêng trong test.
- Khoá mới ghi vào `backend/.env.example`. Khoá bí mật (S3, Google, JWT) để trống hoặc giá trị mẫu vô hại. **Không đọc và không sửa `.env`.**

## 4. Xác thực và phân quyền

- JWT access + refresh token [FL AUTH-02]. Mật khẩu băm bằng bcrypt [ERD 4.1]. Không xác minh email khi đăng ký [OQ-02].
- Access token gửi qua header `Authorization: Bearer`. Refresh token đặt trong cookie **httpOnly, SameSite=Lax, path `/api/v1/auth`**, `Secure` khi chạy HTTPS [TD-12].
- Refresh token: chỉ lưu **bản băm** trong Redis kèm thời hạn. Mỗi lần refresh thì cấp token mới và huỷ token cũ (xoay vòng). Đăng xuất thì xoá khỏi Redis và xoá cookie [TD-03][FL AUTH-03].
- Guard JWT áp mặc định cho mọi route. Chỉ mở công khai: đăng ký, đăng nhập, refresh, các route Google OAuth [C4 UC01].
- Role guard: route của người dùng mở cho **cả `USER` và `ADMIN`** (ADMIN kế thừa chức năng USER [OQ-22]). Route quản trị (`catalog` ghi, `dashboard`) chỉ dành cho `ADMIN`.
- **Kiểm tra quyền sở hữu** ở service: mọi người, kể cả ADMIN, chỉ đọc và sửa bản ghi có `user_id` của chính mình ở các chức năng người dùng [ERD 6.5][OQ-22]. Truy cập bản ghi của người khác thì trả về như không tồn tại (404).
- Đổi mật khẩu phải kiểm tra mật khẩu cũ; mật khẩu mới theo quy tắc đăng ký. Tài khoản không có `password_hash` thì từ chối đổi mật khẩu [FL AUTH-04][OQ-27].
- Gắn lượt chẩn đoán vào cây: cây phải thuộc cùng người dùng [ERD 6.5].

## 5. API, validation và upload

- **Định dạng API [TD-05]:**
  - Tiền tố `/api/v1` (`setGlobalPrefix`).
  - Thành công: trả thẳng dữ liệu, không bọc. Danh sách phân trang: `{ items, page, pageSize, total }`.
  - Lỗi: `{ statusCode, code, message, errors? }`. `code` là mã máy tiếng Anh dạng `UPPER_SNAKE` (ví dụ `AUTH_INVALID_CREDENTIALS`). `message` là câu tiếng Việt **chép đúng từ specs**. `errors[]` gồm `{ field, message }` cho lỗi theo từng trường. Dùng một exception filter chung để mọi lỗi (kể cả lỗi validation) ra đúng dạng này.
  - Swagger (`@nestjs/swagger`) chỉ bật khi không phải production, tại `/api/docs`. `docs/<feature>/api_<feature>.md` vẫn là nguồn sự thật.
- Mọi body và query đều có DTO dùng `class-validator`. Bật `ValidationPipe` với `whitelist` và `transform`.
- Upload ảnh: client gửi multipart lên backend, backend kiểm tra rồi lưu qua `StorageService` [TD-01]. Ảnh chẩn đoán chỉ nhận JPG, PNG, tối đa 10 MB [C4 UC02]. Kiểm tra định dạng thật (magic bytes) lẫn kích thước ở backend, không tin vào MIME hay kiểm tra phía client.
- **Dùng chung có sẵn** (`src/common/`): `@Public()`, `@Roles()`, `@CurrentUser()`, `AppException(status, code, message, errors?)`. Lỗi nghiệp vụ luôn ném `AppException` với câu đúng specs; câu dự phòng trong `default-errors.ts` chỉ cho lỗi chung.
- **Lưu ảnh [TD-01]:** chỉ gọi `StorageService.saveImage(buffer, folder)`. Hàm này kiểm tra JPG/PNG bằng magic bytes và giới hạn `STORAGE_MAX_BYTES`, sai thì ném `AppException` 400 với câu "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB". Không ghi đĩa hay gọi SDK trực tiếp từ service nghiệp vụ. Dev dùng `LocalDiskStorage` (ảnh phục vụ tĩnh ở `/uploads`, không kiểm quyền, chỉ dựa vào tên UUID). Khi deploy thêm bản S3: bucket riêng tư, presigned URL ngắn hạn, không để bucket public. Test thì mock `StorageService`. Cột `*_url` lưu **khoá đối tượng**; ảnh ngoài (ảnh Google ở `users.avatar_url`) lưu URL `https://…`. Đổi giá trị cột ra URL chỉ qua `StorageService.resolveUrl` [TD-14].
- Không để lộ stack trace, câu SQL hay việc email có tồn tại hay không ở luồng đăng nhập.

## 6. Giao dịch và quy tắc nhiều bảng

Các thao tác sau phải nằm trong **một transaction** [ERD 6.5, 7.4]:
- Chuyển lượt chẩn đoán sang `COMPLETED`, đồng thời ghi đủ `top_k` dòng `diagnosis_predictions`.
- Cập nhật `TREATING` hoặc `RECOVERED` cho cây, đồng thời ghi một `plant_logs` loại `STATUS_CHANGE`.
- Tạo bệnh, đồng thời tạo hoặc cập nhật `model_labels` tương ứng [ERD 4.3]. Tương tự với loại cây và nhãn `HEALTHY` khi lưu "Mã lớp khoẻ mạnh" [OQ-17].

Quy tắc dùng chung cho nhiều mô-đun:
- Danh sách lịch sử tra cứu và mọi chỉ số dashboard chỉ tính lượt `status = COMPLETED` [OQ-23].
- Xoá mềm hoặc hoàn tác lượt chẩn đoán **không** làm đổi `plants.health_status` [OQ-24].
- Loại cây của một lượt: `diagnoses.crop_id`, luôn có (NOT NULL), vì chọn loại cây là bắt buộc [OQ-05, chốt 22/11].

Toàn bộ quy tắc ở tầng ứng dụng (Bảng 6.5) được liệt kê ở `docs/_shared/data_model.md` mục 5.

## 7. Gọi AI service

- Chỉ gọi qua **một interface client duy nhất** trong mô-đun `diagnosis`, có hai bản cài chọn theo `AI_MODE` [TD-04]:
  - `http`: gọi AI service thật theo hợp đồng ở `technical_overview.md` mục 5.
  - `mock`: `predict` trả top-3 lấy từ `model_labels` đang dùng; `getLabels` trả danh sách cố định `MOCK_MODEL_LABELS` (11 mã của seed dev và 3 mã chưa gán) [TD-31]. Ép được lỗi và timeout (qua cấu hình hoặc tham số test) để kiểm thử luồng `FAILED`.
- **Luôn** gửi `crop_code` của loại cây người dùng đã chọn. Chọn loại cây là bắt buộc; request thiếu loại cây thì từ chối, không gọi AI [OQ-05, chốt 22/11]. Mô hình chạy trên server [OQ-18].
- Ghi lượt chẩn đoán `PROCESSING` **trước** khi gọi AI. Quá thời gian chờ hoặc lỗi thì chuyển `FAILED` và ghi `completed_at` [ERD 7.4].
- Không resize hay chuẩn hoá ảnh ở backend. Việc đó thuộc AI service [FL].
- Gặp `class_code` không có trong `model_labels` đang dùng: chuyển `FAILED`, ghi log mức ERROR, tạo `notifications` cho mọi ADMIN (`reminder_id = NULL`). Không tạo trùng cho cùng một `class_code` [ERD 6.5][OQ-26].

## 8. Job nhắc việc

- Dùng `@nestjs/schedule` [ERD 4.8]. Job tìm các `reminders` có `is_active = true` và `next_remind_at <= now()`. Với mỗi bản ghi: tạo `notifications`, đặt `last_sent_at`. Nhắc lặp thì cộng thêm `repeat_days`, nhắc một lần thì đặt `is_active = false`.
- **Kênh duy nhất: thông báo trong ứng dụng** (bảng `notifications`). Không email, không đẩy, không khung giờ gửi [OQ-09].
- Nhắc `SYSTEM` chỉ là **gợi ý**: backend trả gợi ý, chỉ tạo `reminders` khi người dùng xác nhận [OQ-15]. `RECHECK` theo `diseases.recheck_days` khi gắn kết quả `DISEASE`; `WATERING`, `FERTILIZING` theo chu kỳ của `crops` khi tạo cây. Không tạo trùng khi cây đã có nhắc cùng loại đang bật.
- Cây chuyển sang `RECOVERED` thì tắt các nhắc `RECHECK` của cây đó [ERD 4.8].
- Job chạy mỗi `REMINDER_JOB_INTERVAL_MINUTES` phút (mặc định 5; `REMINDER_JOB_ENABLED=false` để tắt, ví dụ khi test) bằng `setInterval` qua `SchedulerRegistry`. Mỗi lần tối đa 100 nhắc, khoá `FOR UPDATE SKIP LOCKED`, mỗi nhắc một giao dịch nhỏ. Nhắc lặp trễ nhiều chu kỳ chỉ gửi một thông báo rồi dời `next_remind_at` qua hiện tại [TD-28].

## 9. Dashboard [TD-08]

- Chỉ `ADMIN`. Chỉ đọc. Truy vấn tổng hợp bằng SQL qua `DataSource` (xem ngoại lệ ở mục 2).
- Tính cả lượt đã xoá mềm (`deleted_at` khác NULL) [C4 4.5]. Chỉ tính lượt `COMPLETED` [OQ-23].
- Lọc theo khoảng thời gian trên `diagnoses.created_at` (chỉ mục `ix_diagnoses_created`).

## 10. Log và bảo mật

- Không log mật khẩu, token, nội dung ảnh, presigned URL hay dữ liệu cá nhân ngoài `user_id`.
- Không trả `password_hash`, `google_id`, `failed_login_count`, `locked_until` ra API.
- CORS chỉ cho phép URL frontend trong cấu hình, có `credentials: true` để cookie refresh token đi được [TD-12].

## 11. Kiểm tra trước khi báo xong

```bash
cd backend && npm run lint && npm run build && npm test
npm run test:e2e   # nếu feature có test e2e
```

Ghi lệnh đã chạy và kết quả vào báo cáo cuối lượt.

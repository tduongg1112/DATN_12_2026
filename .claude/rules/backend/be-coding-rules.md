---
paths:
  - "backend/**"
---

# Quy tắc code backend (NestJS)

> Mỗi quy tắc ghi nguồn trong ngoặc: **[Repo]** cấu hình hiện có, **[ERD]** tài liệu Phân tích Class & CSDL, **[C4]** Chương 4, **[FL]** Function List v0.2. Quy tắc gắn nhãn **(đề xuất)** là mặc định do Claude soạn khi dựng workflow và chưa được Dương duyệt. Sau bước `/review-code`, quy tắc nào được duyệt thì bỏ nhãn. Dữ liệu và CSDL: xem `database-rules.md`.

## 1. Nền tảng

- NestJS ^12, ESM (`"type": "module"`, `module: nodenext`). Import tương đối **phải có đuôi `.js`**, ví dụ `import { AppService } from './app.service.js'`. [Repo]
- TypeScript strict. Prettier dùng `singleQuote`, `trailingComma: all`. Lint bằng `npm run lint` (oxlint). [Repo]
- NestJS 12 và TypeORM 1.x mới hơn kiến thức huấn luyện. Trước khi dùng decorator hay API chưa chắc chắn, mở type definition trong `node_modules/@nestjs/*` hoặc `node_modules/typeorm` để kiểm tra. Không viết theo trí nhớ. [Repo]
- Không thêm dependency khi chưa hỏi Dương.

## 2. Cấu trúc mô-đun

- Có 4 mô-đun nghiệp vụ theo [ERD] mục 8: Tài khoản, Danh mục & nhãn mô hình, Chẩn đoán, Cây trồng & nhắc việc. Không tự tạo thêm mô-đun nghiệp vụ. Dashboard chờ TD-08.
- Thư mục **(đề xuất)**:
  ```
  backend/src/
  ├── main.ts, app.module.ts
  ├── config/                 cấu hình đọc từ env (@nestjs/config)
  ├── common/                 guard, decorator, filter, pipe dùng chung
  ├── database/               data source, migrations/, seeds/
  └── modules/
      ├── accounts/           User + xác thực (đăng ký, đăng nhập, Google, JWT)
      ├── catalog/            Crop, Disease, DiseaseImage, ModelLabel
      ├── diagnosis/          Diagnosis, DiagnosisPrediction + client gọi AI service
      └── plants/             Plant, PlantLog, Reminder, Notification + job nhắc việc
  ```
  Trong mỗi mô-đun: `<x>.module.ts`, `<x>.controller.ts`, `<x>.service.ts`, `entities/`, `dto/`. Test đơn vị `*.spec.ts` đặt cạnh file được test.
- Mô-đun này gọi mô-đun khác qua **service mà mô-đun kia export**, không inject repository của mô-đun khác. **(đề xuất)** Lý do: [ERD] mục 8 giữ ranh giới mô-đun để sau này tách service được.

## 3. Cấu hình

- Mọi tham số đều đọc qua `@nestjs/config`, không hard-code. Gồm: URL AI service, thời gian chờ AI (15 giây [C4]), ngưỡng độ tin cậy [FL][ERD], `top_k` = 3 [ERD], số lần đăng nhập sai và thời gian khoá (5 lần, 15 phút [ERD]), JWT secret và thời hạn, `ADMIN_EMAIL`, `ADMIN_PASSWORD` [ERD 7.1].
- Khoá mới ghi vào `backend/.env.example` kèm giá trị mẫu vô hại. **Không đọc và không sửa `.env`.**

## 4. Xác thực và phân quyền

- JWT access + refresh token [FL AUTH-02]. Mật khẩu băm bằng bcrypt [ERD 4.1].
- Guard JWT áp mặc định cho mọi route. Chỉ mở công khai các route đăng ký, đăng nhập, callback Google [C4 UC01].
- Có role guard cho `USER` và `ADMIN`. Route quản trị (`catalog` ghi, `dashboard`) chỉ dành cho `ADMIN`.
- **Kiểm tra quyền sở hữu** ở service: người dùng chỉ đọc và sửa bản ghi có `user_id` của chính mình. Truy cập bản ghi của người khác thì trả về như không tồn tại **(đề xuất: 404)** [ERD 6.5].
- Gắn lượt chẩn đoán vào cây: cây phải thuộc cùng người dùng [ERD 6.5].

## 5. Validation và upload

- Mọi body và query đều có DTO dùng `class-validator`. Bật `ValidationPipe` với `whitelist` và `transform` **(đề xuất)**.
- Upload ảnh chẩn đoán: chỉ JPG, PNG, tối đa 10 MB [C4 UC02]. Kiểm tra cả MIME lẫn kích thước ở backend, không tin vào kiểm tra phía client.
- Thông báo lỗi trả cho người dùng **dùng đúng câu trong specs**, ví dụ "Email hoặc mật khẩu không đúng" [C4]. Không để lộ stack trace, câu SQL hay việc email có tồn tại hay không ở luồng đăng nhập.
- Định dạng response và lỗi chưa chốt (TD-05). Chưa chốt thì hỏi, không tự đặt ra một chuẩn mới.

## 6. Giao dịch và quy tắc nhiều bảng

Các thao tác sau phải nằm trong **một transaction** [ERD 6.5, 7.4]:
- Chuyển lượt chẩn đoán sang `COMPLETED`, đồng thời ghi đủ `top_k` dòng `diagnosis_predictions`.
- Cập nhật `TREATING` hoặc `RECOVERED` cho cây, đồng thời ghi một `plant_logs` loại `STATUS_CHANGE`.
- Tạo bệnh, đồng thời tạo hoặc cập nhật `model_labels` tương ứng [ERD 4.3].

Toàn bộ quy tắc ở tầng ứng dụng (Bảng 6.5) được liệt kê ở `docs/_shared/data_model.md` mục 5.

## 7. Gọi AI service

- Chỉ gọi qua **một lớp client duy nhất** trong mô-đun `diagnosis`. Mọi chỗ khác dùng lớp này, nhờ vậy khi test chỉ cần mock một chỗ.
- Hợp đồng gọi: `technical_overview.md` mục 5. Ghi lượt chẩn đoán `PROCESSING` **trước** khi gọi AI. Quá thời gian chờ hoặc lỗi thì chuyển `FAILED` và ghi `completed_at` [ERD 7.4].
- Không resize hay chuẩn hoá ảnh ở backend. Việc đó thuộc AI service [FL].
- Gặp `class_code` không có trong `model_labels` đang dùng thì chuyển `FAILED` [ERD 6.5]. Cách báo Quản trị viên chưa chốt (OQ-26).

## 8. Job nhắc việc

- Dùng `@nestjs/schedule` [ERD 4.8]. Job tìm các `reminders` có `is_active = true` và `next_remind_at <= now()`. Với mỗi bản ghi: tạo `notifications`, đặt `last_sent_at`. Nhắc lặp thì cộng thêm `repeat_days`, nhắc một lần thì đặt `is_active = false`.
- Cây chuyển sang `RECOVERED` thì tắt các nhắc `RECHECK` của cây đó [ERD 4.8].
- Kênh gửi thông báo và khung giờ gửi chưa chốt (OQ-09). Function List ghi khung 6:00–20:00 và đẩy qua FCM, nhưng đó là bản cũ, chưa có trong Chương 4.

## 9. Log và bảo mật

- Không log mật khẩu, token, nội dung ảnh hay dữ liệu cá nhân ngoài `user_id`.
- Không trả `password_hash`, `google_id`, `failed_login_count`, `locked_until` ra API.

## 10. Kiểm tra trước khi báo xong

```bash
cd backend && npm run lint && npm run build && npm test
npm run test:e2e   # nếu feature có test e2e
```

Ghi lệnh đã chạy và kết quả vào báo cáo cuối lượt.

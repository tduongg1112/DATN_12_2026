---
paths:
  - "frontend/**"
---

# Quy tắc code frontend (Next.js)

> Nguồn: **[Repo]** cấu hình hiện có, **[D]** design system `../design/`, **[C4]** Chương 4, **[FL]** Function List v0.2, **[OQ-xx] / [TD-xx]** quyết định ngày 20/11 (build-first) trong `docs/_shared/open_questions.md`, **[Next]** `node_modules/next/dist/docs/`. Quy tắc gắn **(đề xuất)** là mặc định chưa được duyệt. Quy tắc về giao diện: `ui-design-rules.md`.

## 1. Nền tảng

- **Đọc `frontend/AGENTS.md` trước.** Next.js 16.4.3 có thay đổi phá vỡ tương thích. Khi dùng API về routing, data fetching, caching, metadata, image hay font, đọc hướng dẫn trong `frontend/node_modules/next/dist/docs/` trước [Repo].
- React 19.3, App Router (thư mục `app/`), TypeScript strict, alias `@/*` [Repo].
- shadcn/ui style `base-nova` dựng trên **`@base-ui/react`, không phải Radix**. Props và cách ghép component khác Radix, nên phải mở file trong `components/ui/` để xem trước khi dùng [Repo].
- Prettier: không dấu chấm phẩy, nháy kép, `trailingComma: es5`, có plugin sắp xếp class Tailwind [Repo].
- Không thêm dependency khi chưa hỏi Dương.
- Frontend chạy cổng **3000**. URL backend lấy từ biến môi trường, ví dụ `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`, ghi vào `frontend/.env.example` [TD-05][TD-06].

## 2. Cấu trúc thư mục

| Thư mục | Chứa | Nguồn |
|---|---|---|
| `app/` | Route và layout | [Repo] |
| `components/ui/` | Component shadcn, đã chỉnh theo design system trước khi dùng | [Repo][D 08] |
| `components/ds/` | Component tự xây: dock, card-stack, dial, health-status… | [D 08] |
| `styles/` | Bản chép `tokens.css`, `components.css` từ `../design/code/` | [D 08] |
| `hooks/`, `lib/` | Hook và tiện ích dùng chung | [Repo] |
| `lib/api/` | **Lớp duy nhất gọi backend**, kể cả giữ token và tự refresh | (đề xuất) [TD-02][TD-12] |
| `lib/device/` | Lớp bọc API thiết bị: camera, thông báo, lưu tệp | [D 06] |
| `components/<feature>/` | Component riêng của từng feature | (đề xuất) |

Mô tả màn hình của từng feature ở `../design/screens/<feature>.md` [TD-11].

## 3. Lấy dữ liệu và tương thích đóng gói [TD-02]

Chưa chọn PWA hay Capacitor (hoãn). Code phải **chạy được ở cả hai**, tức là không phụ thuộc vào server Next.js khi chạy, để sau này build được bản tĩnh (`output: "export"`) bọc Capacitor.

- Mọi lời gọi backend đi qua `lib/api/`, chạy **phía client**. Không gọi backend rải rác trong component.
- **Không dùng** các tính năng mà bản tĩnh không hỗ trợ [Next `01-app/02-guides/static-exports.md`, mục Unsupported Features]:
  - Server Actions; Server Components lấy dữ liệu động; Route Handlers đọc `Request`.
  - `cookies()`, `rewrites`, `redirects`, `headers` trong `next.config`, `proxy`.
  - Dynamic route (`[id]`) không có `generateStaticParams()`. Trang chi tiết theo id **(đề xuất)** dùng query string, ví dụ `/cay-trong/chi-tiet?id=12`, đọc bằng `useSearchParams`.
  - `next/image` với loader mặc định. Dùng `unoptimized` hoặc thẻ `img` (ảnh từ presigned URL của S3).
- Bảo vệ route bằng kiểm tra phía client (layout hoặc hook kiểm tra phiên), không dùng `proxy`.
- Kiểu dữ liệu của response viết tay theo `docs/<feature>/api_<feature>.md`, không đoán.

## 4. Xác thực và điều hướng [C4 UC01]

- Mọi trang trừ đăng nhập và đăng ký đều yêu cầu đã đăng nhập. Chưa đăng nhập thì chuyển tới màn đăng nhập và nhớ trang đang định vào.
- Sau khi đăng nhập: `USER` quay về trang đã định vào (mặc định là trang chủ). `ADMIN` vào Dashboard [C4 5a].
- ADMIN dùng được mọi trang của USER [OQ-22]. Giao diện có đường chuyển giữa khu quản trị và khu người dùng. Trang quản trị chặn `USER`.
- **Giữ token [TD-12]:**
  - Access token chỉ giữ **trong bộ nhớ** (biến trong `lib/api/`). Không ghi vào `localStorage`, `sessionStorage` hay cookie do JS đặt.
  - Refresh token do backend đặt trong cookie httpOnly. Gọi các route `/auth/*` với `credentials: "include"`.
  - Mở lại app hoặc tải lại trang: gọi refresh để lấy access token mới. Gặp `401`: refresh một lần rồi gửi lại request; vẫn lỗi thì về màn đăng nhập.
  - Khi đóng gói Capacitor, chỉ đổi cách lưu trong `lib/api/` (sang secure storage), không đổi chỗ khác.
- Google OAuth làm ngay trong feature `auth` [TD-13].
- Mục đổi mật khẩu ẩn với tài khoản không có mật khẩu (chỉ dùng Google) [OQ-27].

## 5. Xử lý lỗi từ API [TD-05]

- Lỗi có dạng `{ statusCode, code, message, errors? }`. Hiển thị `message` (đã là câu tiếng Việt đúng specs). Có `errors[]` thì hiển thị từng `message` ngay dưới trường `field` tương ứng, giữ nguyên dữ liệu đã nhập [C4 UC01 6b2].
- Rẽ nhánh xử lý theo `code`, không theo nội dung `message`.
- Danh sách phân trang có dạng `{ items, page, pageSize, total }`.

## 6. Ảnh và camera

- Chỉ nhận JPG, PNG, tối đa 10 MB. Báo lỗi bằng đúng câu "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" [C4 UC02].
- Cho cắt khung vuông, xoay, chỉnh sáng và tương phản trên app. **Không resize về 224×224 ở client**, việc đó thuộc AI service [FL DIAG-02].
- Nén ảnh ở trình duyệt trước khi tải lên [D 06]. Gửi cả ảnh gốc lẫn ảnh đã chỉnh lên backend (multipart), cả hai đều được lưu, xem `specs_diagnosis.md`.
- Ảnh hiển thị bằng presigned URL do API trả về, có hạn ngắn [TD-01]. Không lưu URL này lâu dài phía client; hết hạn thì gọi lại API.
- Chọn loại cây trước khi chẩn đoán là **tuỳ chọn**, có thể bỏ qua [OQ-05].
- Camera chỉ được gọi qua `lib/device/`. Người dùng từ chối quyền camera thì hướng dẫn cách cấp quyền và gợi ý chuyển sang "Tải ảnh lên" [C4 UC02 ngoại lệ 4.1].

## 7. Nội dung và trạng thái

- `<html lang="vi">`. Toàn bộ chữ trên giao diện bằng tiếng Việt có dấu. Câu thông báo **chép đúng từ specs**, không tự viết lại [C4].
- Mỗi màn có đủ các trạng thái loading, rỗng, lỗi, mất mạng [D 07]. Câu cho trạng thái rỗng và lỗi lấy từ phần ngoại lệ của UC.
- Luôn có nút quay lại trong giao diện, vì app sau khi đóng gói không có nút Back của trình duyệt [D 06].
- Form dùng đúng `type`, `inputmode`, `autocomplete` [D 06].
- Thông báo chỉ hiển thị trong ứng dụng (biểu tượng chuông, danh sách), không dùng thông báo đẩy hay Notification API của trình duyệt [OQ-09][OQ-16].

## 8. Kiểm tra trước khi báo xong

```bash
cd frontend && npm run lint && npm run typecheck && npm run build
```

Feature có giao diện thì chụp màn hình ở 390px và 1440px, so với `../design/preview/style-guide.html` [D README].

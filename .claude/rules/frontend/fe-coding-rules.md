---
paths:
  - "frontend/**"
---

# Quy tắc code frontend (Next.js)

> Nguồn: **[Repo]** cấu hình hiện có, **[D]** design system `../design/`, **[C4]** Chương 4, **[FL]** Function List v0.2. Quy tắc gắn **(đề xuất)** là mặc định chưa được duyệt. Quy tắc về giao diện: `ui-design-rules.md`.

## 1. Nền tảng

- **Đọc `frontend/AGENTS.md` trước.** Next.js 16.4.3 có thay đổi phá vỡ tương thích. Khi dùng API về routing, data fetching, caching, metadata, image hay font, đọc hướng dẫn trong `frontend/node_modules/next/dist/docs/` trước [Repo].
- React 19.3, App Router (thư mục `app/`), TypeScript strict, alias `@/*` [Repo].
- shadcn/ui style `base-nova` dựng trên **`@base-ui/react`, không phải Radix**. Props và cách ghép component khác Radix, nên phải mở file trong `components/ui/` để xem trước khi dùng [Repo].
- Prettier: không dấu chấm phẩy, nháy kép, `trailingComma: es5`, có plugin sắp xếp class Tailwind [Repo].
- Không thêm dependency khi chưa hỏi Dương.

## 2. Cấu trúc thư mục

| Thư mục | Chứa | Nguồn |
|---|---|---|
| `app/` | Route và layout | [Repo] |
| `components/ui/` | Component shadcn, đã chỉnh theo design system trước khi dùng | [Repo][D 08] |
| `components/ds/` | Component tự xây: dock, card-stack, dial, health-status… | [D 08] |
| `styles/` | Bản chép `tokens.css`, `components.css` từ `../design/code/` | [D 08] |
| `hooks/`, `lib/` | Hook và tiện ích dùng chung | [Repo] |
| `lib/api/` | **Lớp duy nhất gọi backend** | (đề xuất) |
| `lib/device/` | Lớp bọc API thiết bị: camera, thông báo, lưu tệp | [D 06] |
| `components/<feature>/` | Component riêng của từng feature | (đề xuất) |

## 3. Lấy dữ liệu

- Cách đóng gói app (PWA hay Capacitor) **chưa chốt** (TD-02). Lựa chọn này quyết định frontend lấy dữ liệu thế nào: bản tĩnh để bọc Capacitor không dùng được Server Components có dữ liệu động, cũng không dùng được Server Actions [D 08].
- Trong lúc chưa chốt: mọi lời gọi backend đi qua `lib/api/`. Không đặt logic nghiệp vụ trong Server Actions. Không gọi backend rải rác trong component **(đề xuất)**. Mục đích là khi chốt hướng đóng gói thì chỉ phải sửa một chỗ.
- Kiểu dữ liệu của response viết tay theo `docs/<feature>/api_<feature>.md`, không đoán.

## 4. Xác thực và điều hướng [C4 UC01]

- Mọi trang trừ đăng nhập và đăng ký đều yêu cầu đã đăng nhập. Chưa đăng nhập thì chuyển tới màn đăng nhập và nhớ trang đang định vào.
- Sau khi đăng nhập: `USER` quay về trang đã định vào (mặc định là trang chủ). `ADMIN` vào Dashboard.
- Nơi lưu token phía trình duyệt phụ thuộc TD-02 và TD-05. Chưa chốt thì hỏi Dương.

## 5. Ảnh và camera

- Chỉ nhận JPG, PNG, tối đa 10 MB. Báo lỗi bằng đúng câu "Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB" [C4 UC02].
- Cho cắt khung vuông, xoay, chỉnh sáng và tương phản trên app. **Không resize về 224×224 ở client**, việc đó thuộc AI service [FL DIAG-02].
- Nén ảnh ở trình duyệt trước khi tải lên [D 06]. Gửi cả ảnh gốc lẫn ảnh đã chỉnh (cả hai đều được lưu, xem `specs_diagnosis.md`).
- Camera chỉ được gọi qua `lib/device/`. Người dùng từ chối quyền camera thì hướng dẫn cách cấp quyền và gợi ý chuyển sang "Tải ảnh lên" [C4 UC02 ngoại lệ 4.1].

## 6. Nội dung và trạng thái

- `<html lang="vi">`. Toàn bộ chữ trên giao diện bằng tiếng Việt có dấu. Câu thông báo **chép đúng từ specs**, không tự viết lại [C4].
- Mỗi màn có đủ các trạng thái loading, rỗng, lỗi, mất mạng [D 07]. Câu cho trạng thái rỗng và lỗi lấy từ phần ngoại lệ của UC.
- Luôn có nút quay lại trong giao diện, vì app sau khi đóng gói không có nút Back của trình duyệt [D 06].
- Form dùng đúng `type`, `inputmode`, `autocomplete` [D 06].

## 7. Kiểm tra trước khi báo xong

```bash
cd frontend && npm run lint && npm run typecheck && npm run build
```

Feature có giao diện thì chụp màn hình ở 390px và 1440px, so với `../design/preview/style-guide.html` [D README].

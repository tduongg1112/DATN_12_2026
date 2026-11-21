---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.css"
---

# Quy tắc giao diện (design system)

> Nội dung giao diện nằm ở `../design/` (ngoài repo). File này chỉ nói **bắt buộc đọc gì** và **kiểm tra gì**. Không chép lại design system vào đây. Khi có mâu thuẫn, `../design/` thắng.
>
> Mô tả màn hình của từng feature nằm ở `../design/screens/<feature>.md` (TD-11, chốt 20/11), ngoài repo nên file này không tự nạp khi mở chúng. `/gen-docs`, `/feature-dev` yêu cầu đọc file này một cách tường minh.

## 1. Bắt buộc trước khi viết UI

1. Đọc `../design/README.md`: 12 luật cứng, quy trình sinh một màn hình, checklist.
2. Đọc `../design/08-nextjs-shadcn.md` trước khi viết code React.
3. Đọc file chi tiết theo việc đang làm: màu (`01`), chữ (`02`), bo góc và khoảng cách (`03`), icon (`04`), thành phần (`05`), bố cục (`06`), trạng thái (`07`).
4. Nếu `frontend/styles/tokens.css` chưa tồn tại thì design system **chưa được cài**. Dừng lại và đề nghị làm 6 bước ở `../design/08-nextjs-shadcn.md` trước.
5. Đọc `../design/screens/<feature>.md` của feature đang làm. Màn hình phải khớp mô tả ở đó; muốn đổi thì sửa file mô tả trước (Dương duyệt).

## 2. Luật ngắn gọn (chi tiết ở `../design/README.md`)

- Chỉ dùng token. Thiếu token thì thêm vào `../design/code/tokens.css` trước, rồi chép sang `frontend/styles/`.
- Font duy nhất là Be Vietnam Pro, khai báo bộ `vietnamese`. Light mode.
- Lấy component từ `../design/05-components.md`. Component shadcn phải chỉnh theo bảng trong `08` trước khi dùng. Component tự xây đặt ở `components/ds/`.
- Dấu hiệu code sai phong cách (theo `08`): `rounded-md` hoặc `rounded-lg` trên nút, `h-9`, `border` trên card, `shadow-sm`, `text-gray-*`, `bg-green-*`, `font-bold`.
- `rounded-*` của dự án **khác mặc định Tailwind**: `rounded-sm` là 12px.
- Trạng thái sức khoẻ cây phải có cả màu lẫn chữ (`../design/01-color.md`, mục "Trạng thái sức khoẻ cây"). Nhãn trạng thái dùng đúng tên trong Bảng 4.8 của Chương 4.
- ADMIN dùng được mọi màn của USER (OQ-22): khu quản trị (khuôn "Quản trị") và khu người dùng phải có đường chuyển qua lại rõ ràng.
- Màu nhãn tình trạng (Dương chốt 21/11, theo cột "Dùng khi" của design/01): Chưa chẩn đoán → `info`; Khoẻ mạnh, Đã khỏi → `healthy`; Đang có bệnh → `severe`; Đang điều trị → `watch`. Dùng `<HealthStatus>` trong `components/ds/health-status.tsx`, không tự gán lại.
- Kiểm tra bố cục ở 360/390/1440 bằng trang `/dev/design-check` và `/dev/shells/*` khi chạy dev.

## 3. Checklist trước khi bàn giao màn hình

Chép từ `../design/README.md`. Phải tick hết mới được báo xong:

- [ ] Không có màu, cỡ chữ hay bán kính nào nằm ngoài token
- [ ] Mọi chữ tiếng Việt hiển thị đúng font, không có ký tự rơi sang font khác
- [ ] Tối đa một vùng oliu lớn trên một màn hình
- [ ] Tối đa một nút chính màu đen trong một khu vực
- [ ] Trạng thái bệnh có cả màu lẫn chữ, không chỉ dùng màu
- [ ] Bố cục không tràn ngang ở 360px
- [ ] Mọi nút chỉ có icon đều có `aria-label`
- [ ] `:focus-visible` nhìn thấy được, có tôn trọng `prefers-reduced-motion`
- [ ] Nút cuối trang không bị dock che

Chụp màn hình ở 390px và 1440px làm evidence (`docs/<feature>/evidence/`).

---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.css"
  - "docs/**/design_*.md"
---

# Quy tắc giao diện (design system)

> Nội dung giao diện nằm ở `../design/` (ngoài repo). File này chỉ nói **bắt buộc đọc gì** và **kiểm tra gì**. Không chép lại design system vào đây. Khi có mâu thuẫn, `../design/` thắng.

## 1. Bắt buộc trước khi viết UI

1. Đọc `../design/README.md`: 12 luật cứng, quy trình sinh một màn hình, checklist.
2. Đọc `../design/08-nextjs-shadcn.md` trước khi viết code React.
3. Đọc file chi tiết theo việc đang làm: màu (`01`), chữ (`02`), bo góc và khoảng cách (`03`), icon (`04`), thành phần (`05`), bố cục (`06`), trạng thái (`07`).
4. Nếu `frontend/styles/tokens.css` chưa tồn tại thì design system **chưa được cài**. Dừng lại và đề nghị làm 6 bước ở `../design/08-nextjs-shadcn.md` trước.

## 2. Luật ngắn gọn (chi tiết ở `../design/README.md`)

- Chỉ dùng token. Thiếu token thì thêm vào `../design/code/tokens.css` trước, rồi chép sang `frontend/styles/`.
- Font duy nhất là Be Vietnam Pro, khai báo bộ `vietnamese`. Light mode.
- Lấy component từ `../design/05-components.md`. Component shadcn phải chỉnh theo bảng trong `08` trước khi dùng. Component tự xây đặt ở `components/ds/`.
- Dấu hiệu code sai phong cách (theo `08`): `rounded-md` hoặc `rounded-lg` trên nút, `h-9`, `border` trên card, `shadow-sm`, `text-gray-*`, `bg-green-*`, `font-bold`.
- `rounded-*` của dự án **khác mặc định Tailwind**: `rounded-sm` là 12px.
- Trạng thái sức khoẻ cây phải có cả màu lẫn chữ (`../design/01-color.md`, mục "Trạng thái sức khoẻ cây"). Nhãn trạng thái dùng đúng tên trong Bảng 4.8 của Chương 4.

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

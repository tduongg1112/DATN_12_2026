# Design overview — Design context

> Bước 1.3 của framework (UI/UX Designer). Design system đầy đủ đã có ở `../design/`. File này **không chép lại** nội dung đó, chỉ ánh xạ các mục framework yêu cầu sang đúng file và ghi trạng thái. Khi có mâu thuẫn, `../design/` thắng.

## 1. Ánh xạ mục framework sang design system

| Mục framework yêu cầu | Đọc ở | Điểm chính |
|---|---|---|
| Design goal | `../design/00-design-dna.md` | Bảng điều khiển sáng, yên tĩnh. Cảm giác cần đạt: người trồng đang lo lắng mở app lên và thấy mọi thứ rõ ràng, có kiểm soát. Thiết kế mobile trước |
| Brand guideline (màu, hình ảnh, tone) | `../design/01-color.md`, `04-iconography.md` | 5 màu gốc lấy theo bộ homai. Oliu `#CBD77E` là màu nhấn. Chữ trên nền oliu hoặc hazel luôn là `#282828`. Chưa có tên sản phẩm và logo |
| Typography | `../design/02-typography.md` | Chỉ dùng font Be Vietnam Pro (Sora thiếu ký tự tiếng Việt). Số dùng weight 300, đơn vị 11px |
| Layout system | `../design/03-shape-space-depth.md`, `06-layout-responsive.md` | Breakpoint 640, 1024, 1440. Kiểm tra ở 360, 390, 768, 1024, 1440. Có 7 khuôn trang |
| Component system | `../design/05-components.md`, `code/components.css` | Card bo 32px, nút viên thuốc, dock đen, `seam` và `notch`, thẻ kết quả, thẻ cây, bảng quản trị |
| UX rules (loading, rỗng, lỗi, giọng văn) | `../design/07-motion-states.md`, `00-design-dna.md` mục "Giọng nội dung" | Mỗi màn đều có trạng thái loading, rỗng, lỗi, mất mạng. Câu thông báo cụ thể lấy theo specs của từng feature |
| Accessibility rules | `../design/01-color.md` mục "Tương phản", checklist ở `../design/README.md` | Trạng thái bệnh thể hiện bằng cả màu lẫn chữ. Nút chỉ có icon phải có `aria-label`. Có `:focus-visible`. Tôn trọng `prefers-reduced-motion`. Vùng chạm tối thiểu 44px |
| Design tool integration | `../design/preview/style-guide.html`, `reference/homai-analysis.md` | Tham chiếu là bộ Behance *Smart home mobile app homai*. Preview HTML chạy thật. Tài liệu design không nhắc tới file Figma nào |
| Cài vào code | `../design/08-nextjs-shadcn.md` | 6 bước nối token vào `frontend/`, bảng chỉnh shadcn, các thành phần tự xây đặt ở `components/ds/` |

**Nguồn sự thật của mọi giá trị:** `../design/code/tokens.css`. Sau khi cài, bản chép nằm ở `frontend/styles/`. Muốn đổi token thì đổi ở `design/` trước rồi mới chép sang.

## 2. Khuôn trang theo feature

Lấy từ `../design/06-layout-responsive.md`. Màn hình cụ thể sẽ mô tả ở bước 6 (`design_<feature>.md`, xem TD-11).

| Khuôn | Nền | Feature dùng |
|---|---|---|
| Trung tâm | sage `#E1E3D7` | Trang chủ (`disease_library`: bệnh cây hay gặp) |
| Chi tiết | xám `#F5F5F5` | Kết quả chẩn đoán, chi tiết cây, chi tiết bệnh, chi tiết lượt tra cứu |
| Danh sách | xám `#F7F7F7` | `history`, `my_plants`, `disease_library` (xem tất cả) |
| Biểu mẫu | trắng | `auth` (đăng nhập, đăng ký), form thêm/sửa cây |
| Chụp ảnh | đen, ảnh tràn màn hình | `diagnosis` (camera, không có dock) |
| Quản trị | xám `#F7F7F7` | `catalog`, `dashboard` (thiết kế cho desktop trước, vẫn xem được trên mobile) |

## 3. Trạng thái

| Việc | Trạng thái (theo `../design/README.md`) |
|---|---|
| Màu, hình khối, ngôn ngữ thành phần | Đã chốt theo bộ tham chiếu |
| Font Be Vietnam Pro | Chờ nhóm xác nhận khi xem preview |
| Light mode cho v1 | Đã chốt |
| Tên sản phẩm, logo | Chưa có. Không dùng lại tên và logo của bộ tham chiếu |
| Cài design system vào `frontend/` | **Chưa làm** (technical_overview H1) |
| Cách đóng gói app | Chưa chốt (TD-02) |
| Danh sách màn hình | Chưa định nghĩa, làm ở bước 6 theo từng feature |

## 4. Quy tắc cho AI

Phần bắt buộc khi viết UI nằm ở `.claude/rules/frontend/ui-design-rules.md`, tự nạp khi sửa `.tsx` hoặc `.css` trong `frontend/`.

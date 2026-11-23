import type { StatusTone } from "@/components/ds/health-status"
import type { ResultType } from "@/lib/types/diagnosis"

/**
 * Chữ giao diện của feature `diagnosis` (design/screens/diagnosis.md). Câu lấy từ specs
 * hoặc C4 được chép nguyên văn; câu đánh dấu ✎ do Claude soạn, Dương duyệt 22/11 (OQ-40).
 */
export const DIAGNOSIS_TEXT = {
  PAGE_TITLE: "Chẩn đoán",

  // S1
  /** ✎ */
  DROP_HINT: "Kéo ảnh vào đây hoặc",
  /** BR-01 */
  UPLOAD: "Tải ảnh lên",
  /** ✎ */
  FILE_RULES: "JPG, PNG, tối đa 10 MB",
  /** BR-01 */
  TAKE_PHOTO: "Chụp ảnh",
  /** ✎ */
  GUIDE_TITLE: "Hướng dẫn chụp",

  // S2
  /** ✎ */
  CLOSE_CAMERA: "Đóng máy ảnh",
  /** ✎ */
  FRAME_HINT: "Đặt một lá vào giữa khung",
  /** ✎ */
  SHUTTER: "Chụp",
  /** ✎ */
  CAMERA_STARTING: "Đang mở máy ảnh…",
  /** ✎ BR-05 */
  CAMERA_DENIED:
    "Cần quyền máy ảnh để chụp lá. Hãy cho phép dùng máy ảnh trong cài đặt trình duyệt, hoặc chọn Tải ảnh lên.",
  /** ✎ BR-05 */
  CAMERA_UNAVAILABLE:
    "Không mở được máy ảnh trên thiết bị này. Hãy chọn Tải ảnh lên.",
  CLOSE: "Đóng",

  // S3
  /** ✎ */
  EDIT_TITLE: "Chỉnh ảnh",
  ROTATE: "Xoay",
  /** ✎ */
  ZOOM: "Phóng to",
  BRIGHTNESS: "Độ sáng",
  CONTRAST: "Độ tương phản",
  /** BR-03 */
  RETAKE: "Chụp lại",
  CROP_TITLE: "Loại cây",
  /** ✎ OQ-05 */
  CROP_REQUIRED: "Vui lòng chọn loại cây",
  /** C4 bước 8 */
  CONTINUE: "Tiếp tục",
  /** ✎ chỉ cho trình đọc màn hình */
  IMAGE_AREA: "Vùng ảnh. Kéo hoặc dùng phím mũi tên để dịch ảnh",

  // S4
  /** C4 bước 8 */
  ANALYZING: "Đang phân tích...",
  /** ✎ */
  ANALYZING_SLOW: "Vẫn đang phân tích, vui lòng chờ thêm một chút.",
  /** ✎ */
  CANCEL: "Huỷ",
  RETRY: "Thử lại",

  // S5
  /** ✎ */
  RESULT_TITLE: "Kết quả chẩn đoán",
  /** ✎ chỉ cho trình đọc màn hình */
  RESULT_IMAGE: "Ảnh lá đã gửi chẩn đoán",
  /** ✎ BR-20 */
  LIKELY: "Có khả năng là",
  /** ✎ */
  CONFIDENCE: "Độ tin cậy",
  /** ✎ */
  SYMPTOMS: "Triệu chứng",
  /** ✎ */
  TREATMENT: "Hướng xử lý",
  /** ✎ */
  OTHER_POSSIBILITIES: "Các khả năng khác",
  HEALTHY_TITLE: "Cây khoẻ mạnh",
  /** ✎ BR-16 */
  CARE_GUIDE: "Gợi ý chăm sóc phòng bệnh",
  /** BR-17 */
  UNCERTAIN_TITLE: "Chưa đủ chắc chắn để kết luận",
  /** ✎ BR-17 */
  REFERENCE_POSSIBILITIES: "Các khả năng để tham khảo",
  /** ✎ BR-17 */
  REFERENCE_ONLY: "Chỉ để tham khảo, chưa phải kết luận.",
  /** C4 12e */
  VIEW_DISEASE: "Xem chi tiết bệnh",
  /** ✎ */
  DIAGNOSE_AGAIN: "Chẩn đoán lại",
  /** ✎ BR-20 */
  DISCLAIMER: "Kết quả chỉ mang tính tham khảo.",
  /** ✎ BR-14 */
  SAVED_TO_HISTORY: "Kết quả đã được lưu vào Lịch sử tra cứu.",
  /** OQ-29 */
  NOT_FOUND: "Không tìm thấy dữ liệu",
  /** ✎ */
  GO_DIAGNOSE: "Chẩn đoán",
} as const

/** Hướng dẫn chụp ở S1 (FL DIAG-01). ✎ */
export const CAPTURE_GUIDE = [
  "Chụp một lá",
  "Ảnh rõ nét",
  "Đủ sáng",
  "Nền đơn giản",
] as const

/** Hướng dẫn chụp lại khi chưa chắc chắn (C4 12d, BR-17). ✎ */
export const RETAKE_TIPS = [
  "Chụp gần lá hơn",
  "Chụp ở nơi đủ sáng",
  "Chỉ chụp một lá",
] as const

/** Dạng kết quả bằng cả màu lẫn chữ. Tông ✎ (OQ-40). */
export const RESULT_STATUS_DISPLAY: Record<
  ResultType,
  { label: string; tone: StatusTone }
> = {
  DISEASE: { label: "Phát hiện bệnh", tone: "severe" },
  HEALTHY: { label: "Cây khoẻ mạnh", tone: "healthy" },
  UNCERTAIN: { label: "Chưa xác định", tone: "watch" },
}

/** Độ tin cậy: xác suất × 100, làm tròn đến số nguyên (design/screens/diagnosis.md S5). */
export function formatPercent(probability: number): string {
  return `${Math.round(probability * 100)}%`
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Thời gian chẩn đoán dạng `HH:mm, dd/MM/yyyy`, giờ máy người dùng. */
export function formatDiagnosisTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Các dòng không rỗng của văn bản nhiều dòng (triệu chứng, hướng xử lý). */
export function textLines(text: string | null): string[] {
  return (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Chữ giao diện của feature `my_plants` (design/screens/my_plants.md). Câu lấy từ C4 hoặc
 * specs được chép nguyên văn; câu đánh dấu ✎ do Claude soạn, Dương duyệt 23/11 (OQ-51).
 */
export const PLANTS_TEXT = {
  /** Dock, C4 UC04 bước 1 */
  PAGE_TITLE: "Cây trồng của tôi",
  /** C4 bước 3 */
  ADD: "Thêm cây",
  /** C4 bước 5 */
  SAVE: "Lưu",
  /** ✎ */
  CANCEL: "Huỷ",
  /** ✎ */
  LOAD_MORE: "Xem thêm",
  /** ✎ */
  LAST_DIAGNOSED: (date: string) => `Chẩn đoán gần nhất: ${date}`,
  /** C4 2.1, BR-12 */
  EMPTY: "Bạn chưa thêm cây nào",
  /** C4 2.1 */
  DIAGNOSE_NOW: "Chẩn đoán ngay",

  // S2, S4
  /** ✎ */
  EDIT_TITLE: "Sửa thông tin cây",
  /** C4 bước 4 */
  NAME: "Tên gọi",
  CROP: "Loại cây",
  PLANTED_DATE: "Ngày trồng",
  AVATAR: "Ảnh đại diện",
  NOTE: "Vị trí hoặc ghi chú",
  /** C4 6.1, BR-02 */
  REQUIRED: "Vui lòng nhập tên gọi và chọn loại cây",
  /** ✎ */
  PLANTED_FUTURE: "Ngày trồng không được sau hôm nay",
  /** C4 bước 6 */
  ADDED: "Đã thêm cây",
  /** C4 10d */
  UPDATED: "Đã cập nhật",

  // S3
  /** C4 bước 8, 9a */
  DIAGNOSE_AGAIN: "Chẩn đoán lại",
  /** C4 9b */
  UPDATE_STATUS: "Cập nhật tình trạng",
  /** C4 9c */
  ADD_NOTE: "Thêm ghi chú",
  /** C4 9d */
  EDIT: "Chỉnh sửa",
  /** C4 9e */
  DELETE: "Xoá cây",
  /** C4 11e */
  DELETED: "Đã xoá cây",
  /** ✎ */
  LAST_DIAGNOSED_LABEL: "Chẩn đoán gần nhất",
  /** ✎ */
  CURRENT_DISEASE: "Bệnh đang mắc",
  /** ✎ */
  TREATMENT: "Hướng xử lý",
  /** C4 12e */
  VIEW_DISEASE: "Xem chi tiết bệnh",
  /** ✎ */
  REMINDERS: "Lịch nhắc",
  /** ✎ */
  TIMELINE: "Dòng thời gian",
  /** ✎ */
  CARE_NOTE: "Ghi chú chăm sóc",
  /** ✎ */
  STATUS_CHANGED: (label: string) => `Cập nhật tình trạng: ${label}`,
  /** ✎ */
  TIMELINE_EMPTY: "Chưa có hoạt động nào.",
  /** ✎ */
  BACK_TO_PLANTS: "Về cây trồng của tôi",

  // H1 → H3, H6
  /** ✎ */
  DELETE_TITLE: (name: string) => `Xoá cây ${name}?`,
  /** ✎ BR-11 */
  DELETE_BODY:
    "Các lần chẩn đoán của cây vẫn được giữ trong lịch sử tra cứu. Nhật ký chăm sóc và lịch nhắc của cây sẽ bị xoá.",
  /** ✎ */
  STATUS_SAVED: "Đã cập nhật tình trạng",
  /** ✎ */
  NOTE_CONTENT: "Nội dung",
  /** C4 9c (ví dụ) */
  NOTE_PLACEHOLDER: "Phun thuốc lần 1",
  /** ✎ */
  NOTE_DATE: "Ngày thực hiện",
  /** ✎ */
  NOTE_IMAGE: "Ảnh (tuỳ chọn)",
  /** ✎ */
  NOTE_REQUIRED: "Vui lòng nhập nội dung ghi chú",
  /** ✎ */
  NOTE_DATE_FUTURE: "Ngày thực hiện không được sau hôm nay",
  /** ✎ */
  NOTE_ADDED: "Đã thêm ghi chú",
  /** ✎ */
  RECOVERED_TITLE: "Cây đã khỏi bệnh?",
  /** ✎ */
  RECOVERED_BODY: (name: string) =>
    `Lần chẩn đoán này cho kết quả khoẻ mạnh. Chuyển ${name} sang "Đã khỏi"?`,
  /** Bảng 4.8 */
  RECOVERED: "Đã khỏi",
  /** ✎ */
  LATER: "Để sau",

  // S5 và màn chẩn đoán
  /** C4 UC02 bước 14 */
  SAVE_TO_PLANT: "Lưu vào cây trồng của tôi",
  /** C4 UC02 bước 15 */
  SAVED_TO_PLANT: "Đã lưu vào hồ sơ cây",
  /** ✎ */
  SAVED_TO_PLANT_NAMED: (name: string) => `Đã lưu vào hồ sơ cây ${name}`,
  /** ✎ */
  CREATE_PLANT: "Tạo cây mới",
  /** ✎ */
  NO_PLANTS: "Bạn chưa có cây nào.",
  /** ✎ OQ-50 */
  CROP_MISMATCH: (plantCrop: string, diagnosisCrop: string) =>
    `Cây này là ${plantCrop}, khác loại cây của lần chẩn đoán (${diagnosisCrop}).`,
  /** ✎ */
  DIAGNOSE_FOR: (name: string) => `Chẩn đoán cho cây ${name}`,

  // Nhắc việc (đợt 2)
  /** C4 9f */
  REMIND_ME: "Nhắc tôi kiểm tra lại",
  /** ✎ */
  RECHECK_AFTER: (days: number) => `Sau ${days} ngày`,
  /** ✎ */
  SET_REMINDER: "Đặt nhắc",
  /** ✎ */
  RECHECK_SET: "Đã đặt nhắc kiểm tra lại",
  /** ✎ */
  NEXT_AT: (time: string) => `Lần tới: ${time}`,
  /** ✎ */
  EVERY: (days: number) => `mỗi ${days} ngày`,
  /** ✎ */
  SUGGEST_TITLE: "Gợi ý lịch nhắc",
  /** ✎ */
  SUGGEST: {
    WATERING: (days: number) => `Tưới nước mỗi ${days} ngày`,
    FERTILIZING: (days: number) => `Bón phân mỗi ${days} ngày`,
    RECHECK: (days: number) => `Kiểm tra lại sau ${days} ngày`,
  },
  /** ✎ */
  CREATE_REMINDERS: "Tạo lịch nhắc",
  /** ✎ */
  SKIP: "Bỏ qua",
  /** ✎ */
  REMINDERS_CREATED: "Đã tạo lịch nhắc",

  /** ✎ chỉ cho trình đọc màn hình */
  REMOVE_IMAGE: "Bỏ ảnh",
  /** ✎ chỉ cho trình đọc màn hình */
  PLANT_PHOTO: (name: string) => `Ảnh của ${name}`,
} as const

/** Nhãn lựa chọn "Cập nhật tình trạng" (Bảng 4.8). */
export const MANUAL_STATUS_LABEL = {
  TREATING: "Đang điều trị",
  RECOVERED: "Đã khỏi",
} as const

/** OQ-45: 10 cây mỗi lần. */
export const PLANTS_PAGE_SIZE = 10

const pad = (n: number) => String(n).padStart(2, "0")

/** `dd/MM/yyyy` theo giờ máy, từ ISO hoặc `yyyy-MM-dd`. */
export function formatDate(value: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Hôm nay theo giờ máy, dạng `yyyy-MM-dd` (giá trị `max` của ô ngày). */
export function todayInput(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

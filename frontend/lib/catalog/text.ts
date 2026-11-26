import type { StatusTone } from "@/components/ds/health-status"
import type { CropStatus, PublishStatus } from "@/lib/types/catalog"
import type { Severity } from "@/lib/types/domain"

/**
 * Chữ giao diện của feature `catalog` (design/screens/catalog.md). Câu lấy từ C4 (Bảng 4.10)
 * được chép nguyên văn; câu đánh dấu ✎ do Claude soạn, Dương duyệt 25/11 (OQ-60).
 */
export const CATALOG_TEXT = {
  // Điều hướng
  /** C4 bước 1 */
  DISEASES: "Danh mục bệnh",
  /** C4 1d */
  CROPS: "Danh mục loại cây",
  /** ✎ */
  LABELS: "Nhãn mô hình",
  /** ✎ chỉ cho trình đọc màn hình */
  NAV_LABEL: "Phần của danh mục",

  // Chung
  /** C4 bước 5 */
  SAVE: "Lưu",
  /** ✎ */
  CANCEL: "Huỷ",
  /** C4 3a */
  EDIT: "Chỉnh sửa",
  /** C4 6.1 */
  REQUIRED: "Vui lòng nhập đầy đủ thông tin bắt buộc",
  /** C4 5a */
  UPDATED: "Cập nhật thành công",
  /** ✎ */
  UNASSIGNED: "Chưa gán",
  /** ✎ */
  PREV_PAGE: "Trang trước",
  /** ✎ */
  NEXT_PAGE: "Trang sau",
  /** ✎ chỉ cho trình đọc màn hình */
  PAGINATION: "Phân trang",
  /** ✎ */
  RETRY: "Thử lại",
  /** OQ-29 */
  NOT_FOUND: "Không tìm thấy dữ liệu",
  ALL: "Tất cả",
  /** C4 3c */
  HIDE: "Ẩn",
  SHOW: "Hiện",

  // S1
  /** C4 bước 3 */
  ADD_DISEASE: "Thêm bệnh",
  /** OQ-38 */
  SEARCH: "Tìm theo tên bệnh",
  /** OQ-38 */
  CLEAR_SEARCH: "Xoá nội dung tìm kiếm",
  /** ✎ chỉ cho trình đọc màn hình */
  CROP_FILTER: "Lọc theo loại cây",
  /** ✎ chỉ cho trình đọc màn hình */
  STATUS_FILTER: "Lọc theo trạng thái",
  COL_NAME: "Tên bệnh",
  COL_CROP: "Loại cây",
  COL_CLASS: "Mã lớp",
  COL_STATUS: "Trạng thái",
  COL_FEATURED: "Nổi bật",
  COL_UPDATED: "Ngày cập nhật",
  /** ✎ chỉ cho trình đọc màn hình */
  COL_ACTIONS: "Thao tác",
  /** ✎ */
  FEATURED: "Nổi bật",
  /** ✎ */
  EDIT_NAMED: (name: string) => `Chỉnh sửa ${name}`,
  /** ✎ */
  HIDE_NAMED: (name: string) => `Ẩn ${name}`,
  /** ✎ */
  SHOW_NAMED: (name: string) => `Hiện ${name}`,
  /** ✎ */
  DISEASE_HIDDEN: "Đã ẩn bệnh",
  /** ✎ */
  DISEASE_SHOWN: "Đã hiện bệnh",
  /** ✎ */
  NO_DISEASES: "Chưa có bệnh nào trong danh mục.",
  /** C4 UC05 4.1 */
  NO_MATCH: "Không tìm thấy bệnh phù hợp",

  // S2
  /** ✎ */
  EDIT_DISEASE: "Sửa bệnh",
  /** ✎ */
  GROUP_GENERAL: "Thông tin chung",
  /** ✎ */
  GROUP_CONTENT: "Nội dung hiển thị",
  /** C4 bước 4 */
  GROUP_IMAGES: "Ảnh minh hoạ",
  /** ✎ */
  GROUP_PUBLISH: "Xuất bản",
  /** C4 bước 4 */
  CROP: "Loại cây",
  NAME: "Tên bệnh",
  PATHOGEN: "Tác nhân gây bệnh",
  PATHOGEN_GROUP: "Nhóm tác nhân",
  CLASS_CODE: "Mã lớp mô hình",
  SEVERITY: "Mức độ nguy hại",
  /** BR-02 */
  SUMMARY: "Mô tả ngắn",
  SYMPTOMS: "Triệu chứng",
  CAUSES: "Nguyên nhân và điều kiện phát sinh",
  PREVENTION: "Biện pháp phòng ngừa",
  TREATMENT: "Biện pháp xử lý",
  /** BR-02 */
  RECHECK_DAYS: "Số ngày gợi ý kiểm tra lại",
  /** C4 bước 4 */
  FEATURED_FIELD: "Đánh dấu nổi bật",
  STATUS: "Trạng thái",
  /** ✎ */
  CROP_HIDDEN_SUFFIX: "(đang ẩn)",
  /** ✎ */
  CROP_LOCKED: "Không đổi được loại cây của bệnh đã gán mã lớp.",
  /** ✎ */
  PATHOGEN_HINT: "Ví dụ: nấm Phytophthora infestans",
  /** ✎ */
  ASSIGNED_TO_DISEASE: (name: string) => ` · đã gán cho ${name}`,
  /** ✎ */
  ASSIGNED_HEALTHY: (crop: string) => ` · khoẻ mạnh – ${crop}`,
  /** ✎ (ý C4 bước 4) */
  CLASS_CODE_HINT: "Chọn từ danh sách nhãn của mô hình đang dùng.",
  /** ✎ */
  COUNTER: (n: number, max: number) => `${n}/${max}`,
  /** ✎ */
  CONTENT_HINT:
    "Mỗi ý một dòng. Ba mục Mô tả ngắn, Triệu chứng, Biện pháp xử lý bắt buộc khi công khai.",
  /** ✎ */
  COVER: "Ảnh bìa",
  /** ✎ */
  CAPTION: "Chú thích",
  /** ✎ */
  MOVE_EARLIER: "Đưa lên trước",
  /** ✎ */
  MOVE_LATER: "Đưa ra sau",
  /** OQ-51 */
  REMOVE_IMAGE: "Bỏ ảnh",
  /** ✎ */
  MAX_IMAGES: "Tối đa 10 ảnh",
  /** ✎ */
  FEATURED_HINT: "Bệnh nổi bật được xếp trước trên trang chủ khi công khai.",
  /** ✎ */
  RECHECK_HINT:
    "Dùng để gợi ý nhắc kiểm tra lại khi người dùng lưu kết quả bệnh này vào cây.",
  /** C4 5b */
  PREVIEW: "Xem trước",
  /** C4 bước 7 */
  DISEASE_ADDED: "Thêm bệnh thành công",
  /** ✎ */
  DELETE_DISEASE: "Xoá bệnh",
  /** ✎ */
  DELETE_TITLE: (name: string) => `Xoá bệnh ${name}?`,
  /** ✎ */
  DELETE_BODY:
    "Bệnh, ảnh minh hoạ và mã lớp đã gán sẽ bị xoá. Không thể hoàn tác.",
  /** ✎ */
  DISEASE_DELETED: "Đã xoá bệnh",
  /** ✎ */
  BACK_TO_DISEASES: "Về danh mục bệnh",
  /** ✎ */
  CAPTION_TOO_LONG: "Chú thích tối đa 255 ký tự",
  /** ✎ */
  DAYS_RANGE: "Số ngày từ 1 đến 365",

  // S3
  /** ✎ */
  CLOSE_PREVIEW: "Đóng xem trước",
  /** ✎ */
  PREVIEW_NOTE:
    "Bản xem trước. Người dùng chỉ thấy trang này khi bệnh ở trạng thái Công khai.",

  // S4, S5
  /** ✎ */
  ADD_CROP: "Thêm loại cây",
  /** ✎ */
  EDIT_CROP: "Sửa loại cây",
  COL_IMAGE: "Ảnh",
  COL_CROP_NAME: "Tên",
  /** ✎ */
  COL_CODE: "Mã",
  COL_DISEASE_COUNT: "Số bệnh",
  COL_HEALTHY: "Mã lớp khoẻ mạnh",
  /** ✎ */
  HIDE_CROP_TITLE: (name: string) => `Ẩn loại cây ${name}?`,
  /** ✎ */
  HIDE_CROP_BODY: (n: number) =>
    `${n} bệnh đang công khai của loại cây này cũng sẽ bị ẩn. Người dùng sẽ không chọn được loại cây này khi chẩn đoán hoặc thêm cây.`,
  /** ✎ */
  HIDE_CROP: "Ẩn loại cây",
  /** ✎ */
  CROP_HIDDEN: "Đã ẩn loại cây",
  /** ✎ */
  CROP_SHOWN: "Đã hiện loại cây",
  /** ✎ */
  CROP_CODE: "Mã loại cây",
  /** ✎ */
  CROP_CODE_HINT:
    "Mã gửi cho mô hình AI, ví dụ TOMATO. Chỉ gồm chữ in hoa, số và dấu gạch dưới.",
  /** ✎ */
  CROP_CODE_FORMAT: "Mã loại cây chỉ gồm chữ in hoa, số và dấu gạch dưới",
  /** ✎ */
  CROP_NAME: "Tên loại cây",
  /** ✎ */
  CROP_IMAGE: "Ảnh loại cây",
  /** C4 3d */
  DESCRIPTION: "Mô tả",
  /** ERD-doc 4.2 */
  CARE_GUIDE: "Hướng dẫn chăm sóc",
  /** ✎ */
  CARE_GUIDE_HINT: 'Hiện ở kết quả chẩn đoán "Cây khoẻ mạnh".',
  /** ✎ */
  WATERING: "Chu kỳ tưới (ngày)",
  /** ✎ */
  FERTILIZING: "Chu kỳ bón phân (ngày)",
  /** ✎ */
  INTERVAL_HINT: "Dùng để gợi ý nhắc tưới, bón khi người dùng thêm cây.",
  /** OQ-17 */
  HEALTHY_CLASS_CODE: "Mã lớp khoẻ mạnh",
  /** ✎ */
  CROP_ADDED: "Thêm loại cây thành công",
  /** ✎ */
  BACK_TO_CROPS: "Về danh mục loại cây",

  // S6
  /** ✎ */
  MODEL_CODES: "Mã lớp của mô hình",
  /** ✎ (ý C4 sau Bảng 4.10) */
  MUST_ASSIGN:
    "Mọi mã lớp của mô hình, kể cả mã khoẻ mạnh của từng loại cây, phải được gán trước khi đưa mô hình vào dùng.",
  /** ✎ chỉ cho trình đọc màn hình */
  LABEL_FILTER: "Lọc mã lớp",
  /** ✎ */
  ASSIGNED_TO: "Gán cho",
  /** ✎ */
  HEALTHY_OF: (crop: string) => `Khoẻ mạnh – ${crop}`,
  /** ✎ */
  ASSIGNED: "Đã gán",
  /** ✎ */
  ADD_WITH_CODE: "Thêm bệnh với mã này",
  /** ✎ */
  HEALTHY_IN_CROP_FORM: "Mã khoẻ mạnh gán trong form loại cây.",
  /** ✎ */
  STALE_TITLE: "Không còn trong mô hình",
  /** ✎ */
  SYNC: "Cập nhật theo mô hình",
  /** ✎ */
  SYNC_TITLE: (n: number) => `Ngừng dùng ${n} nhãn không còn trong mô hình?`,
  /** ✎ */
  SYNC_BODY: "Lịch sử chẩn đoán cũ vẫn giữ nguyên.",
  /** ✎ */
  SYNCED: (n: number) => `Đã ngừng dùng ${n} nhãn không còn trong mô hình`,
  /** ✎ */
  AI_UNAVAILABLE:
    "Không lấy được danh sách nhãn của mô hình. Vui lòng thử lại sau.",
} as const

/** Chữ và tông của trạng thái bệnh (✎ tông, OQ-60). */
export const PUBLISH_STATUS_DISPLAY: Record<
  PublishStatus,
  { label: string; tone: StatusTone }
> = {
  DRAFT: { label: "Nháp", tone: "info" },
  PUBLISHED: { label: "Công khai", tone: "healthy" },
  HIDDEN: { label: "Ẩn", tone: "watch" },
}

/** Trạng thái loại cây: "Hiển thị" (ERD-doc 4.2) ✎, "Ẩn". */
export const CROP_STATUS_DISPLAY: Record<
  CropStatus,
  { label: string; tone: StatusTone }
> = {
  ACTIVE: { label: "Hiển thị", tone: "healthy" },
  HIDDEN: { label: "Ẩn", tone: "watch" },
}

/** Chip mức độ nguy hại trong form (C4: Thấp, Trung bình, Cao). */
export const SEVERITY_CHOICE: Record<Severity, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
}

/** OQ-60. */
export const CATALOG_PAGE_SIZE = 20
export const MAX_DISEASE_IMAGES = 10
export const LIMITS = {
  diseaseName: 150,
  pathogen: 150,
  summary: 500,
  content: 5000,
  caption: 255,
  classCode: 100,
  cropCode: 30,
  cropName: 100,
  description: 2000,
} as const
export const CROP_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,29}$/

/** Số ngày hợp lệ 1–365 hoặc để trống (OQ-60). */
export function isValidDays(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (!/^\d{1,3}$/.test(v)) return false
  const n = Number(v)
  return n >= 1 && n <= 365
}

const pad = (n: number) => String(n).padStart(2, "0")

/** `dd/MM/yyyy` theo giờ máy. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

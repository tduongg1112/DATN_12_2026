import type { PathogenGroup, Severity } from "@/lib/types/domain"

/**
 * Chữ giao diện của feature `disease_library` (design/screens/disease_library.md).
 * Câu lấy từ specs được chép nguyên văn; câu đánh dấu ✎ do Claude soạn, Dương duyệt
 * 22/11 (OQ-38).
 */
export const LIBRARY_TEXT = {
  SECTION_TITLE: "Bệnh cây hay gặp",
  SEE_ALL: "Xem tất cả",
  TRENDING: "Đang phổ biến",
  ALL_CROPS: "Tất cả",
  /** BR-11 */
  NO_MATCH: "Không tìm thấy bệnh phù hợp",
  /** BR-11 (gợi ý) */
  DIAGNOSE_BY_IMAGE: "Chẩn đoán bằng hình ảnh",
  /** BR-09 */
  DIAGNOSE_YOUR_PLANT: "Chẩn đoán cây của bạn",
  /** BR-06 */
  DISCLAIMER: "Nội dung chỉ mang tính tham khảo.",
  /** OQ-29 (câu dự phòng của backend) */
  NOT_FOUND: "Không tìm thấy dữ liệu",
  /** ✎ */
  HOME_EMPTY: "Thư viện bệnh đang được cập nhật.",
  /** ✎ */
  DETAIL_TITLE: "Thông tin bệnh",
  /** ✎ */
  SEARCH_LABEL: "Tìm theo tên bệnh",
  /** ✎ */
  CLEAR_SEARCH: "Xoá nội dung tìm kiếm",
  /** ✎ */
  LOAD_MORE: "Xem thêm",
  CROP_FILTER_LABEL: "Lọc theo loại cây",
} as const

/** Tiêu đề các mục của trang chi tiết (BR-06). */
export const DETAIL_SECTIONS = {
  PATHOGEN: "Tác nhân gây bệnh",
  CROP: "Loại cây",
  PATHOGEN_GROUP: "Nhóm tác nhân",
  SEVERITY: "Mức độ nguy hại",
  SYMPTOMS: "Triệu chứng nhận biết",
  CAUSES: "Nguyên nhân và điều kiện phát sinh",
  PREVENTION: "Biện pháp phòng ngừa",
  TREATMENT: "Biện pháp xử lý",
  RELATED: "Các bệnh liên quan",
} as const

/** Nhóm tác nhân (data_model mục 1). */
export const PATHOGEN_GROUP_LABEL: Record<PathogenGroup, string> = {
  FUNGUS: "Nấm",
  BACTERIA: "Vi khuẩn",
  VIRUS: "Virus",
  PEST: "Côn trùng, nhện hại",
  PHYSIOLOGICAL: "Sinh lý",
}

/** Mức độ nguy hại bằng cả màu lẫn chữ (specs mục 5). Chữ và tông ✎ (OQ-38). */
export const SEVERITY_DISPLAY: Record<
  Severity,
  { label: string; tone: "info" | "watch" | "severe" }
> = {
  LOW: { label: "Nguy hại thấp", tone: "info" },
  MEDIUM: { label: "Nguy hại trung bình", tone: "watch" },
  HIGH: { label: "Nguy hại cao", tone: "severe" },
}

/** OQ-37: trang chủ 6 thẻ; "Xem tất cả" 20 thẻ mỗi trang. */
export const HOME_CARD_COUNT = 6
export const LIBRARY_PAGE_SIZE = 20

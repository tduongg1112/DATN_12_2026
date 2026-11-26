import type { HistoryGroup } from "./dates"

/**
 * Chữ giao diện của feature `history` (design/screens/history.md). Câu lấy từ C4 UC03 hoặc
 * specs được chép nguyên văn; câu đánh dấu ✎ do Claude soạn, Dương duyệt 23/11 (OQ-44).
 */
export const HISTORY_TEXT = {
  /** Dock, C4 bước 1 */
  PAGE_TITLE: "Lịch sử tra cứu",
  /** ✎ */
  DETAIL_TITLE: "Chi tiết tra cứu",

  // S1
  /** ✎ */
  SELECT: "Chọn",
  /** ✎ */
  DONE: "Xong",
  /** ✎ nhãn ẩn của ô tìm */
  SEARCH_LABEL: "Tìm theo tên bệnh",
  /** ✎ (dùng lại câu của thư viện) */
  CLEAR_SEARCH: "Xoá nội dung tìm kiếm",
  ALL: "Tất cả",
  /** ✎ tên nhóm chip cho trình đọc màn hình */
  CROP_FILTER_LABEL: "Lọc theo loại cây",
  /** ✎ tên nhóm chip cho trình đọc màn hình */
  RESULT_FILTER_LABEL: "Lọc theo dạng kết quả",
  /** ✎ */
  FROM_DATE: "Từ ngày",
  /** ✎ */
  TO_DATE: "Đến ngày",
  /** ✎ */
  DATE_RANGE_INVALID: "Ngày bắt đầu phải trước ngày kết thúc",
  /** ✎ */
  LOAD_MORE: "Xem thêm",
  /** ✎ nhãn nút icon */
  DELETE_ONE: "Xoá lần tra cứu",
  /** ✎ */
  SELECTED: (n: number) => `Đã chọn ${n}`,
  /** ✎ */
  SELECT_ALL: "Chọn tất cả",
  /** C4 5d */
  DELETE: "Xoá",
  /** ✎ */
  SELECT_LIMIT: "Mỗi lần xoá được tối đa 100 lần tra cứu.",
  /** ✎ */
  DELETED: (n: number) => `Đã xoá ${n} lần tra cứu`,
  /** C4 8d */
  UNDO: "Hoàn tác",
  /** ✎ */
  RESTORED: (n: number) => `Đã khôi phục ${n} lần tra cứu`,
  /** C4 2.1, BR-10 */
  EMPTY: "Bạn chưa thực hiện chẩn đoán nào",
  /** C4 2.1, BR-10 */
  DIAGNOSE_NOW: "Chẩn đoán ngay",
  /** C4 4.1, BR-11 */
  NO_MATCH: "Không tìm thấy lần tra cứu phù hợp",
  /** C4 4.1, BR-11 */
  CLEAR_FILTERS: "Xoá bộ lọc",

  // S2
  /** ✎ */
  PROCESSED_IMAGE: "Ảnh đã chỉnh",
  /** ✎ */
  ORIGINAL_IMAGE: "Ảnh gốc",
  /** ✎ */
  CROP: "Loại cây",
  /** ✎ */
  PLANT: "Tên cây",
  /** ✎ */
  TIME: "Thời gian tra cứu",
  /** ✎ */
  PATHOGEN_GROUP: "Nhóm tác nhân",
  /** ✎ */
  BACK_TO_HISTORY: "Về lịch sử tra cứu",

  // S3
  /** ✎ */
  CONFIRM_TITLE: (n: number) =>
    n === 1 ? "Xoá lần tra cứu này?" : `Xoá ${n} lần tra cứu?`,
  /** ✎ */
  CONFIRM_BODY:
    "Lần tra cứu sẽ bị xoá khỏi lịch sử. Bạn có thể hoàn tác ngay sau khi xoá.",
  /** ✎ C4 8d */
  CONFIRM_PLANT_NOTE:
    "Lần tra cứu đã gắn cây cũng được gỡ khỏi dòng thời gian của cây.",
  /** ✎ */
  CANCEL: "Huỷ",
} as const

/** C4 UC03 bước 2. */
export const HISTORY_GROUP_LABEL: Record<HistoryGroup, string> = {
  today: "Hôm nay",
  week: "7 ngày qua",
  earlier: "Trước đó",
}

/** Nút "Hoàn tác" hiện 5 giây (BR-08). */
export const UNDO_TIMEOUT_MS = 5000
/** TD-27: tối đa 100 lượt mỗi lần xoá. */
export const HISTORY_SELECT_MAX = 100
/** Cùng quy ước "Xem thêm" của thư viện (OQ-37). */
export const HISTORY_PAGE_SIZE = 20

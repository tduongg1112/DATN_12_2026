import type { ResultType } from "./diagnosis"
import type { Severity } from "./domain"

/** Một lượt ở danh sách lịch sử, H1 GET /diagnoses (docs/history/api_history.md). */
export interface HistoryItem {
  id: number
  resultType: ResultType
  /** ISO 8601. */
  createdAt: string
  /** Ảnh đã chỉnh. */
  thumbnailUrl: string | null
  crop: { id: number; code: string; name: string }
  /** Cây đã gắn; null khi chưa gắn. */
  plant: { id: number; name: string } | null
  /** Xác suất hạng 1, 0–1. */
  probability: number
  /** Bệnh hạng 1; null khi nhãn hạng 1 là HEALTHY. */
  disease: { id: number; name: string; severity: Severity } | null
}

/** Bộ lọc của danh sách (BR-03). Ngày dạng `yyyy-MM-dd` theo giờ máy (OQ-42). */
export interface HistoryFilter {
  q: string
  cropId: number | null
  resultType: ResultType | null
  fromDate: string | null
  toDate: string | null
}

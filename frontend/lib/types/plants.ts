import type { ResultType } from "./diagnosis"
import type { HealthStatus, Severity } from "./domain"

/** Tình trạng người dùng tự cập nhật (C4 UC04 9b). */
export type ManualStatus = "TREATING" | "RECOVERED"

export interface CropRef {
  id: number
  code: string
  name: string
}

/** P1 GET /plants (docs/my_plants/api_my_plants.md). */
export interface PlantCard {
  id: number
  name: string
  crop: CropRef
  avatarUrl: string | null
  healthStatus: HealthStatus
  /** ISO 8601, null khi chưa có lượt nào. */
  lastDiagnosedAt: string | null
}

export interface PlantDiagnosisItem {
  id: number
  createdAt: string
  resultType: ResultType
  thumbnailUrl: string | null
  probability: number
  disease: { id: number; name: string; severity: Severity } | null
}

export interface PlantLogView {
  id: number
  logType: "CARE_NOTE" | "STATUS_CHANGE"
  content: string | null
  statusAfter: ManualStatus | null
  imageUrl: string | null
  /** `yyyy-MM-dd`. */
  actionDate: string
  createdAt: string
}

export interface ReminderView {
  id: number
  type: "RECHECK" | "WATERING" | "FERTILIZING" | "OTHER"
  title: string
  nextRemindAt: string
  repeatDays: number | null
  source: "USER" | "SYSTEM"
}

/** "Bệnh đang mắc" (BR-06, OQ-46). */
export interface CurrentDisease {
  diagnosisId: number
  id: number
  name: string
  severity: Severity
  treatment: string | null
  detailAvailable: boolean
}

/** P3 GET /plants/:id (và P2, P4, P6). */
export interface PlantDetail {
  id: number
  name: string
  crop: CropRef
  plantedDate: string | null
  note: string | null
  avatarUrl: string | null
  healthStatus: HealthStatus
  /** Lựa chọn của "Cập nhật tình trạng" (OQ-47); rỗng thì ẩn nút. */
  allowedStatusChanges: ManualStatus[]
  createdAt: string
  lastDiagnosedAt: string | null
  currentDisease: CurrentDisease | null
  diagnoses: PlantDiagnosisItem[]
  logs: PlantLogView[]
  reminders: ReminderView[]
}

/** Gợi ý nhắc (đợt 2). */
export interface ReminderSuggestion {
  type: "WATERING" | "FERTILIZING" | "RECHECK"
  days: number
}

/** A1, A2, D1: kết quả gắn lượt vào cây. */
export interface PlantLink {
  plant: { id: number; name: string; healthStatus: HealthStatus }
  /** Bảng 4.8: hỏi "Đã khỏi" (OQ-48). */
  suggestRecovered: boolean
  suggestions: ReminderSuggestion[]
}

/** Giá trị form thêm, sửa cây (S2, S4). */
export interface PlantFormValues {
  name: string
  cropId: number | null
  /** `yyyy-MM-dd` hoặc rỗng. */
  plantedDate: string
  note: string
  /** Ảnh mới đã nén; null là giữ ảnh cũ (sửa) hoặc không có ảnh (thêm). */
  avatar: Blob | null
}

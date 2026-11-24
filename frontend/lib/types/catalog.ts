import type { PathogenGroup, Severity } from "./domain"

/** Kiểu của docs/catalog/api_catalog.md (C1 → C5, B1 → B7, M1, M2). */

export type CropStatus = "ACTIVE" | "HIDDEN"
export type PublishStatus = "DRAFT" | "PUBLISHED" | "HIDDEN"
export type LabelType = "HEALTHY" | "DISEASE"

export interface AdminCropRef {
  id: number
  code: string
  name: string
  status: CropStatus
}

/** C1. */
export interface AdminCropItem {
  id: number
  code: string
  name: string
  imageUrl: string | null
  status: CropStatus
  diseaseCount: number
  publishedDiseaseCount: number
  healthyClassCode: string | null
}

/** C2 → C5. */
export interface AdminCrop extends AdminCropItem {
  description: string | null
  careGuide: string | null
  wateringIntervalDays: number | null
  fertilizingIntervalDays: number | null
  createdAt: string
  updatedAt: string
}

/** B1. */
export interface AdminDiseaseItem {
  id: number
  name: string
  crop: AdminCropRef
  classCode: string | null
  status: PublishStatus
  isFeatured: boolean
  updatedAt: string
}

export interface AdminDiseaseImage {
  id: number
  url: string
  caption: string | null
}

/** B2 → B5. */
export interface AdminDisease {
  id: number
  crop: AdminCropRef
  name: string
  pathogen: string | null
  pathogenGroup: PathogenGroup
  severity: Severity
  classCode: string | null
  /** Đã có nhãn (kể cả đã tắt): không đổi loại cây được (OQ-55). */
  cropLocked: boolean
  summary: string | null
  symptoms: string | null
  causes: string | null
  prevention: string | null
  treatment: string | null
  recheckDays: number | null
  isFeatured: boolean
  status: PublishStatus
  publishedAt: string | null
  images: AdminDiseaseImage[]
  createdAt: string
  updatedAt: string
}

export interface AdminDiseaseQuery {
  q?: string
  cropId?: number | null
  status?: PublishStatus | null
  page: number
  pageSize: number
}

/** M1: một mã lớp của mô hình đang dùng. */
export interface ModelLabelItem {
  classCode: string
  assigned: boolean
  labelType: LabelType | null
  crop: { id: number; name: string } | null
  disease: { id: number; name: string; status: PublishStatus } | null
}

/** M1: nhãn đang gán nhưng không còn trong mô hình (BR-19). */
export interface StaleLabelItem {
  classCode: string
  labelType: LabelType
  crop: { id: number; name: string }
  disease: { id: number; name: string; status: PublishStatus } | null
}

export interface ModelLabels {
  items: ModelLabelItem[]
  stale: StaleLabelItem[]
}

/** Một ảnh trong form bệnh: ảnh đã có (`id`) hoặc ảnh mới chọn (`blob`). */
export type GalleryImage =
  | { key: string; kind: "existing"; id: number; url: string; caption: string }
  /** `url`: URL tạm của trình duyệt (`URL.createObjectURL`), thu hồi khi bỏ ảnh hoặc rời form. */
  | { key: string; kind: "new"; blob: Blob; url: string; caption: string }

/** Giá trị form bệnh (S2). Ô chữ là chuỗi, để trống là không có giá trị. */
export interface DiseaseFormValues {
  cropId: number | null
  name: string
  pathogen: string
  pathogenGroup: PathogenGroup | null
  severity: Severity | null
  classCode: string
  summary: string
  symptoms: string
  causes: string
  prevention: string
  treatment: string
  recheckDays: string
  isFeatured: boolean
  status: "DRAFT" | "PUBLISHED"
  images: GalleryImage[]
}

/** Giá trị form loại cây (S5). */
export interface CropFormValues {
  code: string
  name: string
  description: string
  careGuide: string
  wateringIntervalDays: string
  fertilizingIntervalDays: string
  healthyClassCode: string
  image: Blob | null
  removeImage: boolean
}

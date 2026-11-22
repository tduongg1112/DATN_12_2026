import type { PathogenGroup, Severity } from "./domain"

/** L1 GET /crops và trường `crop` của bệnh (docs/disease_library/api_disease_library.md). */
export interface CropSummary {
  id: number
  code: string
  name: string
}

/** Thẻ tin bệnh: L2 GET /diseases và `related` của L3. */
export interface DiseaseCard {
  id: number
  name: string
  crop: CropSummary
  severity: Severity
  summary: string | null
  /** null: chưa có ảnh, giao diện dùng ảnh thay thế. */
  coverImageUrl: string | null
  /** Thuộc nhóm "Đang phổ biến" (BR-04). */
  trending: boolean
}

export interface DiseaseImage {
  url: string
  caption: string | null
}

/** L3 GET /diseases/:id. Nội dung là văn bản thuần, giữ xuống dòng. */
export interface DiseaseDetail {
  id: number
  name: string
  pathogen: string | null
  pathogenGroup: PathogenGroup
  crop: CropSummary
  severity: Severity
  summary: string | null
  symptoms: string | null
  causes: string | null
  prevention: string | null
  treatment: string | null
  images: DiseaseImage[]
  related: DiseaseCard[]
}

export interface DiseaseListQuery {
  cropId?: number | null
  q?: string
  page?: number
  pageSize?: number
}

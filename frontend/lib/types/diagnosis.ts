import type { PathogenGroup, Severity } from "./domain"

/** Dạng kết quả (Bảng 4.4, BR-12). */
export type ResultType = "DISEASE" | "HEALTHY" | "UNCERTAIN"

/** Loại nhãn mô hình (`model_labels.label_type`). */
export type LabelType = "HEALTHY" | "DISEASE"

/** Bệnh của một dự đoán (docs/diagnosis/api_diagnosis.md, `DiagnosisResult`). */
export interface DiagnosisDisease {
  id: number
  name: string
  severity: Severity
  pathogenGroup: PathogenGroup
  summary: string | null
  symptoms: string | null
  treatment: string | null
  /** true: trang chi tiết bệnh mở được (bệnh công khai, loại cây đang hiện). */
  detailAvailable: boolean
}

export interface DiagnosisPrediction {
  /** 1 là kết luận (BR-19). */
  rank: number
  /** 0–1, 4 chữ số thập phân. */
  probability: number
  labelType: LabelType
  /** null với nhãn HEALTHY. */
  disease: DiagnosisDisease | null
}

/** D1 POST /diagnoses (201), D2 GET /diagnoses/:id (200). */
export interface DiagnosisResult {
  id: number
  resultType: ResultType
  /** ISO 8601. */
  createdAt: string
  crop: { id: number; code: string; name: string; careGuide: string | null }
  originalImageUrl: string | null
  processedImageUrl: string | null
  /** Sắp theo `rank`. */
  predictions: DiagnosisPrediction[]
}

/** Dữ liệu gửi D1 (BR-06, BR-07). */
export interface CreateDiagnosisInput {
  /** Ảnh đã chọn hoặc chụp, đã nén (TD-17). */
  original: Blob
  /** Ảnh vuông đã chỉnh; đây là ảnh gửi AI. */
  processed: Blob
  cropId: number
}

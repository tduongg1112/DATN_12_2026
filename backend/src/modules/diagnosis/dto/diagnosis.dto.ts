import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { VALIDATION_ERROR } from '../../../common/exceptions/default-errors.js';
import type { LabelType } from '../../catalog/entities/model-label.entity.js';
import type {
  PathogenGroup,
  Severity,
} from '../../catalog/entities/disease.entity.js';
import { DIAGNOSIS_MESSAGES } from '../diagnosis-errors.js';
import type { ResultType } from '../entities/diagnosis.entity.js';

/* DTO của docs/diagnosis/api_diagnosis.md (D1, D2). */

const CROP_REQUIRED = { message: DIAGNOSIS_MESSAGES.CROP_REQUIRED };
const INVALID = { message: VALIDATION_ERROR.message };

/**
 * D1. Trường chữ của multipart POST /diagnoses. Hai ảnh `original`, `processed` nhận
 * qua DiagnosisUploadInterceptor. Thiếu hoặc sai `cropId` đều báo "Vui lòng chọn loại
 * cây" (OQ-05).
 */
export class CreateDiagnosisDto {
  @Max(Number.MAX_SAFE_INTEGER, CROP_REQUIRED)
  @Min(1, CROP_REQUIRED)
  @IsInt(CROP_REQUIRED)
  @Type(() => Number)
  cropId: number;
}

/** D2. GET /diagnoses/:id */
export class DiagnosisIdParam {
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  id: number;
}

export interface DiagnosisDisease {
  id: number;
  name: string;
  severity: Severity;
  pathogenGroup: PathogenGroup;
  summary: string | null;
  symptoms: string | null;
  treatment: string | null;
  /** Bệnh công khai và loại cây của bệnh đang hiện: trang chi tiết bệnh mở được. */
  detailAvailable: boolean;
}

export interface DiagnosisPredictionView {
  rank: number;
  probability: number;
  labelType: LabelType;
  /** `null` với nhãn HEALTHY. */
  disease: DiagnosisDisease | null;
}

/** Kết quả một lượt `COMPLETED` (D1 201, D2 200). */
export interface DiagnosisResult {
  id: number;
  resultType: ResultType;
  createdAt: Date;
  crop: { id: number; code: string; name: string; careGuide: string | null };
  /** Cây đã gắn (history "Tên cây"); `null` khi chưa gắn. */
  plant: { id: number; name: string } | null;
  originalImageUrl: string | null;
  processedImageUrl: string | null;
  /** Sắp theo `rank`; hạng 1 là kết luận (BR-19). */
  predictions: DiagnosisPredictionView[];
}

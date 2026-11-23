import type { ImageContentType } from '../../../common/storage/image-validation.js';

/** Hợp đồng AI service: technical_overview.md mục 5. */
export interface AiPredictInput {
  /** Ảnh đã cắt vuông (ảnh đã chỉnh). AI service tự resize, chuẩn hoá. */
  image: Buffer;
  contentType: ImageContentType;
  /** Mã loại cây người dùng chọn. Luôn gửi, vì chọn loại cây là bắt buộc (OQ-05, chốt 22/11). */
  cropCode: string;
  /** Mặc định AI_TOP_K (3). */
  topK?: number;
}

export interface AiPrediction {
  classCode: string;
  probability: number;
}

export interface AiPredictResult {
  modelVersion: string;
  inferenceMs: number;
  /** Đã sắp giảm dần theo xác suất. */
  predictions: AiPrediction[];
  heatmapUrl?: string;
}

/**
 * - `timeout`: quá AI_TIMEOUT_MS.
 * - `unavailable`: 503, lỗi mạng hoặc lỗi máy chủ AI.
 * - `bad_request`: 400/422, ảnh hỏng, sai định dạng, loại cây không hỗ trợ.
 * - `invalid_response`: AI trả dữ liệu sai hợp đồng.
 * Mọi loại đều làm lượt chẩn đoán chuyển FAILED (ERD 7.4).
 */
export type AiErrorKind =
  'timeout' | 'unavailable' | 'bad_request' | 'invalid_response';

export class AiServiceError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiServiceError';
  }
}

/**
 * Lớp duy nhất gọi AI service (be-coding-rules.md mục 7). Chọn bản cài theo AI_MODE:
 * `http` (HttpAiClient) hoặc `mock` (MockAiClient).
 */
export abstract class AiClient {
  abstract predict(input: AiPredictInput): Promise<AiPredictResult>;

  /** Danh sách class_code của phiên bản mô hình đang dùng. */
  abstract getLabels(): Promise<string[]>;
}

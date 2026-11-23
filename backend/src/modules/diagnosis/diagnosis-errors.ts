import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { DEFAULT_ERRORS } from '../../common/exceptions/default-errors.js';
import { INVALID_IMAGE_MESSAGE } from '../../common/storage/image-validation.js';
import { AiServiceError } from './ai/ai-client.js';

/**
 * Câu thông báo của docs/diagnosis/api_diagnosis.md. Câu có ✎ trong tài liệu là câu
 * Claude soạn, Dương duyệt 22/11 (OQ-40).
 */
export const DIAGNOSIS_MESSAGES = {
  /** ✎ OQ-05 */
  CROP_REQUIRED: 'Vui lòng chọn loại cây',
  /** C4 UC02, BR-10 */
  AI_UNAVAILABLE: 'Hệ thống đang bận, vui lòng thử lại sau',
  /** ✎ */
  AI_IMAGE_REJECTED:
    'Ảnh chưa phân tích được. Hãy chụp lại một lá rõ nét, đủ sáng.',
  /** OQ-29 */
  NOT_FOUND: DEFAULT_ERRORS[HttpStatus.NOT_FOUND].message,
} as const;

/** 400 CROP_NOT_FOUND: loại cây không có hoặc đang ẩn (BR-07). */
export function cropNotFound(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'CROP_NOT_FOUND',
    DIAGNOSIS_MESSAGES.CROP_REQUIRED,
    [{ field: 'cropId', message: DIAGNOSIS_MESSAGES.CROP_REQUIRED }],
  );
}

/** 400 INVALID_IMAGE_TYPE: thiếu ảnh gốc hoặc ảnh đã chỉnh (BR-04, BR-06). */
export function missingImage(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'INVALID_IMAGE_TYPE',
    INVALID_IMAGE_MESSAGE,
  );
}

/** 503 AI_UNAVAILABLE (BR-10, BR-11). */
export function aiUnavailable(): AppException {
  return new AppException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'AI_UNAVAILABLE',
    DIAGNOSIS_MESSAGES.AI_UNAVAILABLE,
  );
}

/** 404 DIAGNOSIS_NOT_FOUND: không có, của người khác, chưa COMPLETED hoặc đã xoá mềm. */
export function diagnosisNotFound(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'DIAGNOSIS_NOT_FOUND',
    DIAGNOSIS_MESSAGES.NOT_FOUND,
  );
}

/**
 * Lỗi khi gọi AI → lỗi API: AI từ chối ảnh (`bad_request`) thành 422
 * AI_IMAGE_REJECTED; mọi lỗi khác (quá giờ, AI lỗi, sai hợp đồng, lỗi lạ) thành 503.
 */
export function aiErrorToException(error: unknown): AppException {
  if (error instanceof AiServiceError && error.kind === 'bad_request') {
    return new AppException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'AI_IMAGE_REJECTED',
      DIAGNOSIS_MESSAGES.AI_IMAGE_REJECTED,
    );
  }
  return aiUnavailable();
}

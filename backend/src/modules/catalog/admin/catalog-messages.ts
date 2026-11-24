import { HttpStatus } from '@nestjs/common';
import {
  AppException,
  type FieldError,
} from '../../../common/exceptions/app.exception.js';
import {
  DEFAULT_ERRORS,
  VALIDATION_ERROR,
} from '../../../common/exceptions/default-errors.js';

/**
 * Câu thông báo của docs/catalog/api_catalog.md. Câu C4 chép nguyên văn; câu ✎ do Claude
 * soạn, Dương duyệt 25/11 (OQ-60).
 */
export const CATALOG_MESSAGES = {
  /** C4 UC06 6.1 */
  REQUIRED: 'Vui lòng nhập đầy đủ thông tin bắt buộc',
  /** C4 UC06 6.2 */
  LABEL_ASSIGNED_TO_DISEASE: (diseaseName: string) =>
    `Mã lớp này đã được gán cho bệnh ${diseaseName}`,
  /** ✎ */
  LABEL_ASSIGNED_TO_CROP: (cropName: string) =>
    `Mã lớp này đã được gán cho nhãn khoẻ mạnh của ${cropName}`,
  /** ✎ */
  LABEL_OTHER_CROP: (cropName: string) =>
    `Mã lớp này thuộc loại cây ${cropName}`,
  /** ✎ */
  CROP_LOCKED: 'Không thể đổi loại cây của bệnh đã gán mã lớp',
  /** ✎ */
  STATUS_NOT_ALLOWED: 'Không thể chuyển sang trạng thái này',
  /** ✎ (C4 3c1) */
  HAS_DIAGNOSES:
    'Bệnh đã có dữ liệu chẩn đoán nên không thể xoá. Bạn có thể ẩn bệnh.',
  /** ✎ BR-05 */
  DISEASE_NAME_TAKEN: 'Tên bệnh đã có trong loại cây này',
  /** ✎ */
  CROP_NAME_TAKEN: 'Tên loại cây đã tồn tại',
  /** ✎ */
  CROP_CODE_TAKEN: 'Mã loại cây đã tồn tại',
  /** ✎ */
  DISEASE_NAME_TOO_LONG: 'Tên bệnh tối đa 150 ký tự',
  /** ✎ */
  PATHOGEN_TOO_LONG: 'Tác nhân gây bệnh tối đa 150 ký tự',
  /** ✎ */
  SUMMARY_TOO_LONG: 'Mô tả ngắn tối đa 500 ký tự',
  /** ✎ */
  CONTENT_TOO_LONG: 'Nội dung tối đa 5000 ký tự',
  /** ✎ */
  CAPTION_TOO_LONG: 'Chú thích tối đa 255 ký tự',
  /** ✎ */
  DAYS_RANGE: 'Số ngày từ 1 đến 365',
  /** ✎ */
  TOO_MANY_IMAGES: 'Tối đa 10 ảnh',
  /** ✎ */
  CROP_CODE_FORMAT: 'Mã loại cây chỉ gồm chữ in hoa, số và dấu gạch dưới',
  /** ✎ */
  CROP_NAME_TOO_LONG: 'Tên loại cây tối đa 100 ký tự',
  /** ✎ */
  DESCRIPTION_TOO_LONG: 'Mô tả tối đa 2000 ký tự',
  /** ✎ */
  AI_LABELS_UNAVAILABLE:
    'Không lấy được danh sách nhãn của mô hình. Vui lòng thử lại sau.',
  /** OQ-29 */
  NOT_FOUND: DEFAULT_ERRORS[HttpStatus.NOT_FOUND].message,
} as const;

const M = CATALOG_MESSAGES;

/** 400 VALIDATION_ERROR với lỗi từng trường (cùng dạng ValidationPipe). */
export function fieldErrors(errors: FieldError[]): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    VALIDATION_ERROR.code,
    VALIDATION_ERROR.message,
    errors,
  );
}

/** 409 có lỗi gắn với một trường. */
export function conflict(
  code: string,
  message: string,
  field: string,
): AppException {
  return new AppException(HttpStatus.CONFLICT, code, message, [
    { field, message },
  ]);
}

export function cropNotFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, 'CROP_NOT_FOUND', M.NOT_FOUND);
}

export function diseaseNotFound(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'DISEASE_NOT_FOUND',
    M.NOT_FOUND,
  );
}

/** B3, B4: `cropId` không tồn tại. */
export function diseaseCropMissing(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'CROP_NOT_FOUND',
    M.REQUIRED,
    [{ field: 'cropId', message: M.REQUIRED }],
  );
}

/** OQ-54 ✎ */
export function statusNotAllowed(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'DISEASE_STATUS_NOT_ALLOWED',
    M.STATUS_NOT_ALLOWED,
  );
}

/** B5: hiện bệnh thiếu nội dung (BR-06, C4 6.1). */
export function contentRequired(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'DISEASE_CONTENT_REQUIRED',
    M.REQUIRED,
  );
}

/** 503 khi không lấy được `GET /labels` của AI service (M1, M2). */
export function aiLabelsUnavailable(): AppException {
  return new AppException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'AI_LABELS_UNAVAILABLE',
    M.AI_LABELS_UNAVAILABLE,
  );
}

/** Mã lỗi PostgreSQL. */
export const PG_UNIQUE_VIOLATION = '23505';
/** Khoá ngoại chặn xoá: `23001` khi khai báo ON DELETE RESTRICT, `23503` khi NO ACTION. */
export const PG_DELETE_BLOCKED_CODES: readonly string[] = ['23001', '23503'];

/** Lấy mã lỗi và tên ràng buộc của lỗi PostgreSQL (QueryFailedError của TypeORM). */
export function pgError(
  error: unknown,
): { code?: string; constraint?: string } | null {
  if (!error || typeof error !== 'object') return null;
  const driver = (error as { driverError?: unknown }).driverError ?? error;
  if (!driver || typeof driver !== 'object') return null;
  const { code, constraint } = driver as {
    code?: unknown;
    constraint?: unknown;
  };
  return {
    code: typeof code === 'string' ? code : undefined,
    constraint: typeof constraint === 'string' ? constraint : undefined,
  };
}

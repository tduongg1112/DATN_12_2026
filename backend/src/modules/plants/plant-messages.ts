import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { DEFAULT_ERRORS } from '../../common/exceptions/default-errors.js';

/**
 * Câu thông báo của docs/my_plants/api_my_plants.md. Câu C4 chép nguyên văn; câu ✎ do
 * Claude soạn, Dương duyệt 23/11 (OQ-51).
 */
export const PLANT_MESSAGES = {
  /** C4 UC04 6.1, BR-02 */
  NAME_AND_CROP_REQUIRED: 'Vui lòng nhập tên gọi và chọn loại cây',
  /** ✎ */
  NAME_TOO_LONG: 'Tên gọi tối đa 100 ký tự',
  /** ✎ */
  NOTE_TOO_LONG: 'Vị trí hoặc ghi chú tối đa 255 ký tự',
  /** ✎ */
  PLANTED_DATE_FUTURE: 'Ngày trồng không được sau hôm nay',
  /** ✎ */
  CONTENT_REQUIRED: 'Vui lòng nhập nội dung ghi chú',
  /** ✎ */
  CONTENT_TOO_LONG: 'Nội dung tối đa 1000 ký tự',
  /** ✎ */
  ACTION_DATE_FUTURE: 'Ngày thực hiện không được sau hôm nay',
  /** ✎ */
  STATUS_NOT_ALLOWED: 'Không thể chuyển sang tình trạng này',
  /** ✎ */
  DIAGNOSIS_ALREADY_LINKED: 'Lần tra cứu này đã được lưu vào hồ sơ cây',
  /** OQ-29 */
  NOT_FOUND: DEFAULT_ERRORS[HttpStatus.NOT_FOUND].message,
} as const;

/** 404 PLANT_NOT_FOUND: không có hoặc của người khác (BR-13). */
export function plantNotFound(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'PLANT_NOT_FOUND',
    PLANT_MESSAGES.NOT_FOUND,
  );
}

/** 400 CROP_NOT_FOUND: loại cây không có hoặc đang ẩn (BR-02). */
export function plantCropNotFound(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'CROP_NOT_FOUND',
    PLANT_MESSAGES.NAME_AND_CROP_REQUIRED,
    [{ field: 'cropId', message: PLANT_MESSAGES.NAME_AND_CROP_REQUIRED }],
  );
}

/** 400 PLANT_STATUS_NOT_ALLOWED (OQ-47). */
export function statusNotAllowed(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'PLANT_STATUS_NOT_ALLOWED',
    PLANT_MESSAGES.STATUS_NOT_ALLOWED,
  );
}

/** 409 DIAGNOSIS_ALREADY_LINKED: lượt đã gắn cây (C4 UC03 7a: chỉ lượt chưa gắn). */
export function diagnosisAlreadyLinked(): AppException {
  return new AppException(
    HttpStatus.CONFLICT,
    'DIAGNOSIS_ALREADY_LINKED',
    PLANT_MESSAGES.DIAGNOSIS_ALREADY_LINKED,
  );
}

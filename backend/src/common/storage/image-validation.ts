import { HttpStatus } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';

export type ImageContentType = 'image/jpeg' | 'image/png';

/** Câu thông báo đúng C4 UC02 4a, 5a1 (specs_diagnosis BR-04). */
export const INVALID_IMAGE_MESSAGE =
  'Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Nhận dạng JPG/PNG theo magic bytes, không tin MIME hay đuôi file client gửi. */
export function detectImageType(buffer: Buffer): ImageContentType | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && PNG_SIGNATURE.every((b, i) => buffer[i] === b)) {
    return 'image/png';
  }
  return null;
}

/** Ném AppException 400 nếu không phải JPG/PNG hoặc vượt `maxBytes`. */
export function assertValidImage(
  buffer: Buffer,
  maxBytes: number,
): ImageContentType {
  if (buffer.length > maxBytes) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      'IMAGE_TOO_LARGE',
      INVALID_IMAGE_MESSAGE,
    );
  }
  const type = detectImageType(buffer);
  if (!type) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      'INVALID_IMAGE_TYPE',
      INVALID_IMAGE_MESSAGE,
    );
  }
  return type;
}

import {
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { AppException } from '../../common/exceptions/app.exception.js';
import { INVALID_IMAGE_MESSAGE } from '../../common/storage/image-validation.js';

/** Một ảnh nhận trong bộ nhớ (multer memory storage). */
export interface UploadedImageFile {
  buffer: Buffer;
  size: number;
}

/** Hai trường ảnh của D1 (BR-06). Thiếu trường nào thì trường đó không có. */
export interface DiagnosisUploadFiles {
  original?: UploadedImageFile[];
  processed?: UploadedImageFile[];
}

/**
 * Chặn cứng tệp quá lớn ngay khi nhận, để không giữ tệp khổng lồ trong bộ nhớ. Giới
 * hạn nghiệp vụ (10 MB, STORAGE_MAX_BYTES) do service kiểm tra.
 */
const UPLOAD_HARD_LIMIT_BYTES = 20 * 1024 * 1024;

const MulterDiagnosis = FileFieldsInterceptor(
  [
    { name: 'original', maxCount: 1 },
    { name: 'processed', maxCount: 1 },
  ],
  { limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 2 } },
);

/** Nhận `original`, `processed` (D1). Tệp vượt giới hạn cứng báo đúng câu của ảnh (BR-04). */
@Injectable()
export class DiagnosisUploadInterceptor extends MulterDiagnosis {
  override async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    try {
      return (await super.intercept(context, next)) as Observable<unknown>;
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          'IMAGE_TOO_LARGE',
          INVALID_IMAGE_MESSAGE,
        );
      }
      throw error;
    }
  }
}

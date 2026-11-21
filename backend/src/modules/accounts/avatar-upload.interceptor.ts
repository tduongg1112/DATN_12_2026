import {
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { AppException } from '../../common/exceptions/app.exception.js';
import { INVALID_IMAGE_MESSAGE } from '../../common/storage/image-validation.js';

/** Ảnh đại diện nhận trong bộ nhớ (multer memory storage). */
export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

/**
 * Chặn cứng tệp quá lớn ngay khi nhận, để không giữ tệp khổng lồ trong bộ nhớ. Giới
 * hạn nghiệp vụ (10 MB, STORAGE_MAX_BYTES) vẫn do StorageService kiểm tra.
 */
const UPLOAD_HARD_LIMIT_BYTES = 20 * 1024 * 1024;

const MulterAvatar = FileInterceptor('avatar', {
  limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 1 },
});

/** Nhận trường `avatar` (U2). Tệp vượt giới hạn cứng báo đúng câu của ảnh (OQ-33). */
@Injectable()
export class AvatarUploadInterceptor extends MulterAvatar {
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

import {
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  type Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { AppException } from '../../common/exceptions/app.exception.js';
import { INVALID_IMAGE_MESSAGE } from '../../common/storage/image-validation.js';

/** Một ảnh nhận trong bộ nhớ (multer memory storage). */
export interface UploadedImageFile {
  buffer: Buffer;
  size: number;
}

/**
 * Chặn cứng tệp quá lớn ngay khi nhận. Giới hạn nghiệp vụ (10 MB, STORAGE_MAX_BYTES) do
 * StorageService kiểm tra.
 */
const UPLOAD_HARD_LIMIT_BYTES = 20 * 1024 * 1024;

/** Nhận một ảnh ở trường `field`; tệp vượt giới hạn cứng báo đúng câu của ảnh (BR-04). */
function singleImageInterceptor(field: string): Type<NestInterceptor> {
  const Multer = FileInterceptor(field, {
    limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 1 },
  });

  @Injectable()
  class SingleImageInterceptor extends Multer {
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
  return SingleImageInterceptor;
}

/** P2, P4, A2: ảnh đại diện cây. */
export const PlantAvatarInterceptor = singleImageInterceptor('avatar');
/** P7: ảnh kèm ghi chú. */
export const PlantLogImageInterceptor = singleImageInterceptor('image');

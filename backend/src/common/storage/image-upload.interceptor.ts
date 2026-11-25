import {
  HttpStatus,
  Injectable,
  mixin,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  type Type,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { AppException } from '../exceptions/app.exception.js';
import { INVALID_IMAGE_MESSAGE } from './image-validation.js';

/** Một ảnh nhận trong bộ nhớ (multer memory storage). */
export interface UploadedImageFile {
  buffer: Buffer;
  size: number;
}

/**
 * Chặn cứng tệp quá lớn ngay khi multer nhận, để không giữ tệp khổng lồ trong bộ nhớ. Giới
 * hạn nghiệp vụ (10 MB, `STORAGE_MAX_BYTES`) vẫn do `StorageService` / `assertValidImage`
 * kiểm tra.
 */
export const UPLOAD_HARD_LIMIT_BYTES = 20 * 1024 * 1024;

/**
 * Bọc interceptor multer (`FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor`, đặt
 * `limits.fileSize = UPLOAD_HARD_LIMIT_BYTES`): tệp vượt giới hạn cứng báo đúng câu của ảnh
 * (diagnosis BR-04). `mapError` đổi thêm lỗi riêng của feature (ví dụ quá nhiều ảnh); trả
 * `undefined` thì ném nguyên lỗi.
 */
export function imageUploadInterceptor(
  Multer: Type<NestInterceptor>,
  mapError?: (error: unknown) => Error | undefined,
): Type<NestInterceptor> {
  @Injectable()
  class ImageUploadInterceptor extends Multer {
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
        throw mapError?.(error) ?? error;
      }
    }
  }
  return mixin(ImageUploadInterceptor);
}

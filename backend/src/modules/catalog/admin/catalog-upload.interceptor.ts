import {
  BadRequestException,
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  type Type,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { INVALID_IMAGE_MESSAGE } from '../../../common/storage/image-validation.js';
import { CATALOG_MESSAGES as M, fieldErrors } from './catalog-messages.js';
import { MAX_DISEASE_IMAGES } from './image-layout.js';

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

/** Đổi lỗi của multer sang câu của feature: tệp quá lớn, quá nhiều ảnh. */
function withCatalogErrors(
  Multer: Type<NestInterceptor>,
  tooMany: () => AppException,
): Type<NestInterceptor> {
  @Injectable()
  class CatalogUploadInterceptor extends Multer {
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
        if (
          error instanceof BadRequestException &&
          /^(Too many files|Unexpected file field)/.test(error.message)
        ) {
          throw tooMany();
        }
        throw error;
      }
    }
  }
  return CatalogUploadInterceptor;
}

/** B3, B4: tối đa 10 ảnh minh hoạ ở trường `images` (OQ-60). */
export const DiseaseImagesInterceptor = withCatalogErrors(
  FilesInterceptor('images', MAX_DISEASE_IMAGES, {
    limits: {
      fileSize: UPLOAD_HARD_LIMIT_BYTES,
      files: MAX_DISEASE_IMAGES,
    },
  }),
  () => fieldErrors([{ field: 'images', message: M.TOO_MANY_IMAGES }]),
);

/** C3, C4: một ảnh loại cây ở trường `image`. */
export const CropImageInterceptor = withCatalogErrors(
  FileInterceptor('image', {
    limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 1 },
  }),
  () =>
    new AppException(
      HttpStatus.BAD_REQUEST,
      'INVALID_IMAGE_TYPE',
      INVALID_IMAGE_MESSAGE,
    ),
);

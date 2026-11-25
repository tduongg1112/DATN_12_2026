import { BadRequestException, HttpStatus } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AppException } from '../../../common/exceptions/app.exception.js';
import {
  imageUploadInterceptor,
  UPLOAD_HARD_LIMIT_BYTES,
} from '../../../common/storage/image-upload.interceptor.js';
import { INVALID_IMAGE_MESSAGE } from '../../../common/storage/image-validation.js';
import { CATALOG_MESSAGES as M, fieldErrors } from './catalog-messages.js';
import { MAX_DISEASE_IMAGES } from './image-layout.js';

/** Multer báo quá số tệp hoặc trường tệp lạ (ngoài lỗi tệp quá lớn đã đổi ở bản chung). */
function isTooManyFiles(error: unknown): boolean {
  return (
    error instanceof BadRequestException &&
    /^(Too many files|Unexpected file field)/.test(error.message)
  );
}

/** B3, B4: tối đa 10 ảnh minh hoạ ở trường `images` (OQ-60). */
export const DiseaseImagesInterceptor = imageUploadInterceptor(
  FilesInterceptor('images', MAX_DISEASE_IMAGES, {
    limits: {
      fileSize: UPLOAD_HARD_LIMIT_BYTES,
      files: MAX_DISEASE_IMAGES,
    },
  }),
  (error) =>
    isTooManyFiles(error)
      ? fieldErrors([{ field: 'images', message: M.TOO_MANY_IMAGES }])
      : undefined,
);

/** C3, C4: một ảnh loại cây ở trường `image`. */
export const CropImageInterceptor = imageUploadInterceptor(
  FileInterceptor('image', {
    limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 1 },
  }),
  (error) =>
    isTooManyFiles(error)
      ? new AppException(
          HttpStatus.BAD_REQUEST,
          'INVALID_IMAGE_TYPE',
          INVALID_IMAGE_MESSAGE,
        )
      : undefined,
);

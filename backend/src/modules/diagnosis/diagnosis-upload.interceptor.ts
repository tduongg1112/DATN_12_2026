import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  imageUploadInterceptor,
  UPLOAD_HARD_LIMIT_BYTES,
  type UploadedImageFile,
} from '../../common/storage/image-upload.interceptor.js';

/** Hai trường ảnh của D1 (BR-06). Thiếu trường nào thì trường đó không có. */
export interface DiagnosisUploadFiles {
  original?: UploadedImageFile[];
  processed?: UploadedImageFile[];
}

/** Nhận `original`, `processed` (D1). Tệp vượt giới hạn cứng báo đúng câu của ảnh (BR-04). */
export const DiagnosisUploadInterceptor = imageUploadInterceptor(
  FileFieldsInterceptor(
    [
      { name: 'original', maxCount: 1 },
      { name: 'processed', maxCount: 1 },
    ],
    { limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 2 } },
  ),
);

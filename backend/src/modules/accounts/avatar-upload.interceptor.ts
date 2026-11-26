import { FileInterceptor } from '@nestjs/platform-express';
import {
  imageUploadInterceptor,
  UPLOAD_HARD_LIMIT_BYTES,
} from '../../common/storage/image-upload.interceptor.js';

/** Nhận trường `avatar` (U2). Tệp vượt giới hạn cứng báo đúng câu của ảnh (OQ-33). */
export const AvatarUploadInterceptor = imageUploadInterceptor(
  FileInterceptor('avatar', {
    limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 1 },
  }),
);

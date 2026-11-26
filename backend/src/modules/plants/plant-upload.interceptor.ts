import { FileInterceptor } from '@nestjs/platform-express';
import {
  imageUploadInterceptor,
  UPLOAD_HARD_LIMIT_BYTES,
} from '../../common/storage/image-upload.interceptor.js';

/** Nhận một ảnh ở trường `field`; tệp vượt giới hạn cứng báo đúng câu của ảnh (BR-04). */
function singleImageInterceptor(field: string) {
  return imageUploadInterceptor(
    FileInterceptor(field, {
      limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES, files: 1 },
    }),
  );
}

/** P2, P4, A2: ảnh đại diện cây. */
export const PlantAvatarInterceptor = singleImageInterceptor('avatar');
/** P7: ảnh kèm ghi chú. */
export const PlantLogImageInterceptor = singleImageInterceptor('image');

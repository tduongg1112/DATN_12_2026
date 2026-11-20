import type { ImageContentType } from './image-validation.js';

/** Nhóm thư mục lưu ảnh theo nghiệp vụ. */
export const STORAGE_FOLDERS = [
  'diagnoses',
  'diseases',
  'crops',
  'plants',
  'plant-logs',
  'avatars',
] as const;
export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

export interface StoredFile {
  /** Khoá đối tượng, vd `diagnoses/2026/11/<uuid>.jpg`. */
  key: string;
  /** URL đọc được ảnh. */
  url: string;
  contentType: ImageContentType;
  size: number;
}

/**
 * Lưu ảnh (TD-01). Service nghiệp vụ chỉ dùng lớp này, không gọi thẳng đĩa hay SDK.
 * Dev: LocalDiskStorage. Khi deploy: thêm bản S3 và chọn bằng STORAGE_DRIVER.
 * Cột `*_url` lưu `key` hay `url`: chưa chốt (TD-14).
 */
export abstract class StorageService {
  /** Kiểm tra JPG/PNG ≤ STORAGE_MAX_BYTES rồi lưu. Sai thì ném AppException 400. */
  abstract saveImage(
    buffer: Buffer,
    folder: StorageFolder,
  ): Promise<StoredFile>;

  abstract delete(key: string): Promise<void>;

  abstract urlFor(key: string): string;
}

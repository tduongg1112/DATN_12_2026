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

/** Giá trị cột ảnh là URL ngoài (vd ảnh Google), không phải khoá trong kho (TD-14). */
export function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Lưu ảnh (TD-01). Service nghiệp vụ chỉ dùng lớp này, không gọi thẳng đĩa hay SDK.
 * Dev: LocalDiskStorage. Khi deploy: thêm bản S3 hoặc Cloudinary, chọn bằng STORAGE_DRIVER.
 *
 * TD-14 (chốt 21/11): cột `*_url` lưu **khoá** (`StoredFile.key`; với Cloudinary là
 * `public_id`) cho ảnh hệ thống giữ, và URL `https://…` cho ảnh ngoài. API luôn đổi
 * giá trị cột ra URL bằng `resolveUrl`, nên đổi nhà cung cấp không phải sửa dữ liệu.
 */
export abstract class StorageService {
  /** Kiểm tra JPG/PNG ≤ STORAGE_MAX_BYTES rồi lưu. Sai thì ném AppException 400. */
  abstract saveImage(
    buffer: Buffer,
    folder: StorageFolder,
  ): Promise<StoredFile>;

  abstract delete(key: string): Promise<void>;

  abstract urlFor(key: string): string;

  /**
   * Đổi giá trị lưu ở cột ảnh thành URL trả cho client. Bất đồng bộ để bản S3 trả
   * presigned URL được mà không phải sửa nơi gọi.
   */
  async resolveUrl(stored: string | null | undefined): Promise<string | null> {
    if (!stored) return null;
    return isExternalUrl(stored) ? stored : this.urlFor(stored);
  }

  /** Xoá ảnh do hệ thống giữ; bỏ qua URL ngoài. */
  async deleteStored(stored: string | null | undefined): Promise<void> {
    if (stored && !isExternalUrl(stored)) await this.delete(stored);
  }
}

import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertValidImage } from './image-validation.js';
import {
  StorageService,
  type StorageFolder,
  type StoredFile,
} from './storage.service.js';

export interface LocalDiskStorageOptions {
  /** Thư mục gốc, tuyệt đối. */
  rootDir: string;
  /** URL tương ứng với rootDir, vd http://localhost:4000/uploads */
  publicBaseUrl: string;
  maxBytes: number;
}

/**
 * Lưu ảnh trên đĩa của server, chỉ dùng khi dev (TD-01). Backend phục vụ tĩnh
 * thư mục này; tên file là UUID nên khó đoán, nhưng KHÔNG có kiểm tra quyền.
 */
export class LocalDiskStorage extends StorageService {
  constructor(private readonly options: LocalDiskStorageOptions) {
    super();
  }

  async saveImage(buffer: Buffer, folder: StorageFolder): Promise<StoredFile> {
    const contentType = assertValidImage(buffer, this.options.maxBytes);
    const ext = contentType === 'image/png' ? 'png' : 'jpg';
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const key = `${folder}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
    const filePath = this.resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer, { flag: 'wx' });
    return { key, url: this.urlFor(key), contentType, size: buffer.length };
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  urlFor(key: string): string {
    return `${this.options.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
  }

  /** Chặn key thoát ra ngoài rootDir (vd `../../etc/passwd`). */
  private resolveKey(key: string): string {
    const root = path.resolve(this.options.rootDir);
    const filePath = path.resolve(root, key);
    if (!filePath.startsWith(root + path.sep)) {
      throw new Error(`Khoá lưu trữ không hợp lệ: ${key}`);
    }
    return filePath;
  }
}

import path from 'node:path';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { LocalDiskStorage } from './local-disk.storage.js';
import { StorageService } from './storage.service.js';

/** Thư mục lưu ảnh local, tuyệt đối theo thư mục chạy backend. */
export function localStorageRoot(dir: string): string {
  return path.resolve(process.cwd(), dir);
}

@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        // STORAGE_DRIVER hiện chỉ có 'local'. Bản S3 thêm khi deploy (TD-01).
        return new LocalDiskStorage({
          rootDir: localStorageRoot(
            config.get('STORAGE_LOCAL_DIR', { infer: true }),
          ),
          publicBaseUrl: config.get('STORAGE_PUBLIC_BASE_URL', { infer: true }),
          maxBytes: config.get('STORAGE_MAX_BYTES', { infer: true }),
        });
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}

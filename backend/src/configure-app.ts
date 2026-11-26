import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { localStorageRoot } from './common/storage/storage.module.js';
import type { EnvironmentVariables } from './config/env.validation.js';

/** TD-05: mọi route nằm dưới tiền tố này. */
export const API_PREFIX = 'api/v1';

/** Cấu hình dùng chung cho main.ts và test e2e, để test chạy đúng như app thật. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  app.setGlobalPrefix(API_PREFIX);
  // TD-12: đọc cookie refresh token (httpOnly) ở các route /auth/*.
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });

  if (config.get('STORAGE_DRIVER', { infer: true }) === 'local') {
    // Ảnh lưu local khi dev (TD-01): phục vụ tĩnh ở đường dẫn của STORAGE_PUBLIC_BASE_URL.
    const prefix = new URL(
      config.get('STORAGE_PUBLIC_BASE_URL', { infer: true }),
    ).pathname;
    app.useStaticAssets(
      localStorageRoot(config.get('STORAGE_LOCAL_DIR', { infer: true })),
      { prefix, index: false, dotfiles: 'deny' },
    );
  }
}

import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { EnvironmentVariables } from '../../../config/env.validation.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Client Redis cho phiên đăng nhập (TD-03). Lỗi nhanh khi Redis không chạy thay vì
 * treo request: mỗi lệnh chỉ thử lại 1 lần.
 */
export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
    const logger = new Logger('Redis');
    const client = new Redis({
      host: config.get('REDIS_HOST', { infer: true }),
      port: config.get('REDIS_PORT', { infer: true }),
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });
    client.on('error', (err: Error) => logger.error(err.message));
    return client;
  },
};

/** Đóng kết nối Redis khi app tắt (kể cả trong test e2e). */
@Injectable()
export class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}

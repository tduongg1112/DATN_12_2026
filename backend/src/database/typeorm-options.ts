import type { DataSourceOptions } from 'typeorm';
import type { DatabaseEnvironment } from '../config/env.validation.js';
import { ENTITIES } from './entities.js';
import { MIGRATIONS } from './migrations/index.js';

/**
 * Cấu hình TypeORM dùng chung cho Nest (TypeOrmModule) và CLI (data-source.ts).
 * synchronize luôn tắt: schema chỉ đổi qua migration (database-rules.md mục 6).
 */
export function buildDataSourceOptions(
  env: DatabaseEnvironment,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    // BIGINT -> number cho mọi truy vấn, kể cả id sinh ra và COUNT(*).
    parseInt8: true,
  };
}

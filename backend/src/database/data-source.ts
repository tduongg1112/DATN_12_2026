import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateDatabaseEnv } from '../config/env.validation.js';
import { buildDataSourceOptions } from './typeorm-options.js';

/**
 * Chỉ dùng cho CLI TypeORM (migration:run, migration:revert, schema:log).
 * Biến môi trường được nạp bằng `node --env-file-if-exists=.env`.
 */
export default new DataSource(
  buildDataSourceOptions(validateDatabaseEnv(process.env)),
);

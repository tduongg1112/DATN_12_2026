import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export const AI_MODES = ['mock', 'http'] as const;
export const AI_MOCK_SCENARIOS = [
  'ok',
  'error',
  'timeout',
  'invalid_image',
  'unknown_label',
] as const;
export const STORAGE_DRIVERS = ['local'] as const;

export type AiMode = (typeof AI_MODES)[number];
export type AiMockScenario = (typeof AI_MOCK_SCENARIOS)[number];

/** Biến CSDL: đủ cho CLI migration và seed, không đòi khoá khác. */
export class DatabaseEnvironment {
  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;
}

/**
 * Biến môi trường của backend. Thiếu khoá bắt buộc hoặc sai kiểu thì app dừng
 * ngay khi khởi động (ConfigModule.validate). Giá trị mặc định chỉ dùng cho
 * tham số kỹ thuật đã có trong tài liệu; khoá bí mật không có mặc định.
 */
export class EnvironmentVariables extends DatabaseEnvironment {
  @IsIn(NODE_ENVS)
  NODE_ENV: (typeof NODE_ENVS)[number] = 'development';

  /** TD-06: backend 4000. */
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  /** URL frontend, dùng cho CORS (cookie refresh token cần credentials, TD-12). */
  @IsUrl({ require_tld: false })
  FRONTEND_URL: string = 'http://localhost:3000';

  // --- Redis (TD-03; client thêm ở feature auth) ---
  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  // --- JWT (TD-12) ---
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string = '30m';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // --- Tài khoản (OQ-02, ERD 4.1) ---
  @IsInt()
  @Min(1)
  AUTH_MAX_FAILED_LOGINS: number = 5;

  @IsInt()
  @Min(1)
  AUTH_LOCK_MINUTES: number = 15;

  /** Chỉ script seed bắt buộc hai khoá này. */
  @IsOptional()
  @IsEmail()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  ADMIN_PASSWORD?: string;

  // --- Google OAuth (TD-13; dùng ở feature auth) ---
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  GOOGLE_CALLBACK_URL?: string;

  // --- AI service (technical_overview mục 5, TD-04) ---
  @IsIn(AI_MODES)
  AI_MODE: AiMode = 'mock';

  @ValidateIf((env: EnvironmentVariables) => env.AI_MODE === 'http')
  @IsUrl({ require_tld: false })
  AI_SERVICE_URL: string = 'http://localhost:8000';

  @IsInt()
  @Min(1)
  AI_TIMEOUT_MS: number = 15000;

  @IsInt()
  @Min(1)
  AI_TOP_K: number = 3;

  /** OQ-06: một ngưỡng chung. Giá trị chờ nhóm AI nên được phép để trống. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  AI_CONFIDENCE_THRESHOLD?: number;

  @IsIn(AI_MOCK_SCENARIOS)
  AI_MOCK_SCENARIO: AiMockScenario = 'ok';

  // --- Lưu ảnh (TD-01: dev lưu đĩa local, S3 khi deploy) ---
  @IsIn(STORAGE_DRIVERS)
  STORAGE_DRIVER: (typeof STORAGE_DRIVERS)[number] = 'local';

  @IsString()
  @IsNotEmpty()
  STORAGE_LOCAL_DIR: string = 'uploads';

  @IsUrl({ require_tld: false })
  STORAGE_PUBLIC_BASE_URL: string = 'http://localhost:4000/uploads';

  /** C4 UC02: tối đa 10 MB. */
  @IsInt()
  @Min(1)
  STORAGE_MAX_BYTES: number = 10 * 1024 * 1024;
}

/** Chuỗi rỗng trong .env được coi như không khai báo. */
function dropEmpty(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(([, v]) => v !== '' && v !== undefined),
  );
}

/** Ép kiểu, áp giá trị mặc định rồi kiểm tra; lỗi thì liệt kê từng khoá. */
export function validateWith<T extends object>(
  cls: new () => T,
  config: Record<string, unknown>,
): T {
  const validated = plainToInstance(cls, dropEmpty(config), {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
      )
      .join('\n');
    throw new Error(`Biến môi trường không hợp lệ:\n${detail}`);
  }
  return validated;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  return validateWith(EnvironmentVariables, config);
}

export function validateDatabaseEnv(
  config: Record<string, unknown>,
): DatabaseEnvironment {
  return validateWith(DatabaseEnvironment, config);
}

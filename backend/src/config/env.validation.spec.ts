import { validateEnv } from './env.validation.js';

const base = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'u',
  DB_PASSWORD: 'p',
  DB_NAME: 'db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('áp giá trị mặc định đã có trong tài liệu và ép kiểu số', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.DB_PORT).toBe(5432);
    expect(env.AI_MODE).toBe('mock');
    expect(env.AI_TIMEOUT_MS).toBe(15000);
    expect(env.AI_TOP_K).toBe(3);
    expect(env.AUTH_MAX_FAILED_LOGINS).toBe(5);
    expect(env.AUTH_LOCK_MINUTES).toBe(15);
    expect(env.STORAGE_MAX_BYTES).toBe(10 * 1024 * 1024);
  });

  it('ép kiểu số cho khoá có giá trị mặc định khi env truyền chuỗi', () => {
    const env = validateEnv({
      ...base,
      PORT: '4100',
      REDIS_PORT: '6380',
      AI_TOP_K: '5',
    });
    expect(env).toMatchObject({ PORT: 4100, REDIS_PORT: 6380, AI_TOP_K: 5 });
  });

  it('ngưỡng độ tin cậy để trống thì lấy mặc định tạm 0.6 (OQ-06, TD-26)', () => {
    expect(
      validateEnv({ ...base, AI_CONFIDENCE_THRESHOLD: '' })
        .AI_CONFIDENCE_THRESHOLD,
    ).toBe(0.6);
    expect(validateEnv(base).AI_CONFIDENCE_THRESHOLD).toBe(0.6);
  });

  it('nhận ngưỡng trong [0,1] và từ chối giá trị ngoài khoảng', () => {
    expect(
      validateEnv({ ...base, AI_CONFIDENCE_THRESHOLD: '0.5' })
        .AI_CONFIDENCE_THRESHOLD,
    ).toBe(0.5);
    expect(() =>
      validateEnv({ ...base, AI_CONFIDENCE_THRESHOLD: '1.5' }),
    ).toThrow(/AI_CONFIDENCE_THRESHOLD/);
  });

  it('báo rõ tên khoá bắt buộc bị thiếu', () => {
    const { JWT_ACCESS_SECRET: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('từ chối JWT secret ngắn hơn 32 ký tự', () => {
    expect(() => validateEnv({ ...base, JWT_REFRESH_SECRET: 'short' })).toThrow(
      /JWT_REFRESH_SECRET/,
    );
  });

  it('từ chối AI_MODE không hợp lệ', () => {
    expect(() => validateEnv({ ...base, AI_MODE: 'grpc' })).toThrow(/AI_MODE/);
  });
});

import { ConfigService } from '@nestjs/config';
import { QueryFailedError, type Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AUTH_MESSAGES } from './account-messages.js';
import { AuthService, GoogleLoginError } from './auth.service.js';
import type { User } from './entities/user.entity.js';
import { hashPassword } from './password.js';
import type { SessionService } from './session/session.service.js';

const NOW = new Date('2026-11-21T10:00:00Z');
const MAX = 5;
const LOCK_MINUTES = 15;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    fullName: 'Nguyễn Văn An',
    email: 'an@example.com',
    passwordHash: null,
    googleId: null,
    avatarUrl: null,
    role: 'USER',
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('INSERT', [], { code: '23505' } as never);
}

async function expectAppError(
  promise: Promise<unknown>,
  status: number,
  code: string,
  message?: string,
): Promise<void> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppException);
  const body = (error as AppException).getResponse() as {
    code: string;
    message: string;
  };
  expect((error as AppException).getStatus()).toBe(status);
  expect(body.code).toBe(code);
  if (message) expect(body.message).toBe(message);
}

describe('AuthService', () => {
  let repo: {
    findOneBy: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    existsBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
  let session: { issue: ReturnType<typeof vi.fn> };
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword('matkhau1');
  });

  beforeEach(() => {
    repo = {
      findOneBy: vi.fn(),
      findOne: vi.fn(),
      existsBy: vi.fn().mockResolvedValue(false),
      create: vi.fn((v: Partial<User>) => ({ ...v })),
      insert: vi.fn(async (u: Partial<User>) => {
        u.id = 99;
      }),
      update: vi.fn(),
      query: vi.fn(),
    };
    session = { issue: vi.fn().mockResolvedValue({ accessToken: 'a' }) };
    const config = new ConfigService({
      AUTH_MAX_FAILED_LOGINS: MAX,
      AUTH_LOCK_MINUTES: LOCK_MINUTES,
    });
    service = new AuthService(
      repo as unknown as Repository<User>,
      session as unknown as SessionService,
      config as never,
    );
  });

  describe('login (BR-07, BR-08)', () => {
    const dto = { email: 'an@example.com', password: 'matkhau1' };

    it('email không tồn tại: 401 câu chung, không chỉ ra trường', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expectAppError(
        service.login(dto, NOW),
        401,
        'AUTH_INVALID_CREDENTIALS',
        AUTH_MESSAGES.INVALID_CREDENTIALS,
      );
    });

    it('tài khoản chỉ dùng Google (không có mật khẩu): 401', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ googleId: 'g1' }));
      await expectAppError(
        service.login(dto, NOW),
        401,
        'AUTH_INVALID_CREDENTIALS',
      );
    });

    it('đang bị khoá: 423, báo số phút còn lại, không đếm thêm', async () => {
      repo.findOneBy.mockResolvedValue(
        makeUser({
          passwordHash,
          lockedUntil: new Date(NOW.getTime() + 14 * 60_000 + 1),
        }),
      );
      await expectAppError(
        service.login(dto, NOW),
        423,
        'AUTH_ACCOUNT_LOCKED',
        'Bạn đã nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau 15 phút.',
      );
      expect(repo.query).not.toHaveBeenCalled();
    });

    it('sai lần thứ 4: 401, tăng bộ đếm bằng một câu UPDATE', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ passwordHash }));
      repo.query.mockResolvedValue([[{ locked_until: null }], 1]);
      await expectAppError(
        service.login({ ...dto, password: 'sai12345' }, NOW),
        401,
        'AUTH_INVALID_CREDENTIALS',
      );
      const [sql, params] = repo.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toMatch(/failed_login_count \+ 1 >= \$2/);
      expect(params).toEqual([
        7,
        MAX,
        new Date(NOW.getTime() + LOCK_MINUTES * 60_000),
        NOW,
      ]);
    });

    it('sai lần thứ 5: 423 ngay ở lần này (OQ-31)', async () => {
      repo.findOneBy.mockResolvedValue(
        makeUser({ passwordHash, failedLoginCount: 4 }),
      );
      const lockedUntil = new Date(NOW.getTime() + LOCK_MINUTES * 60_000);
      repo.query.mockResolvedValue([[{ locked_until: lockedUntil }], 1]);
      await expectAppError(
        service.login({ ...dto, password: 'sai12345' }, NOW),
        423,
        'AUTH_ACCOUNT_LOCKED',
        'Bạn đã nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau 15 phút.',
      );
    });

    it('khoá đã hết hạn và sai tiếp: chỉ 401 (locked_until cũ ở quá khứ)', async () => {
      const past = new Date(NOW.getTime() - 60_000);
      repo.findOneBy.mockResolvedValue(
        makeUser({ passwordHash, lockedUntil: past }),
      );
      repo.query.mockResolvedValue([[{ locked_until: past }], 1]);
      await expectAppError(
        service.login({ ...dto, password: 'sai12345' }, NOW),
        401,
        'AUTH_INVALID_CREDENTIALS',
      );
    });

    it('yêu cầu khác vừa khoá tài khoản (UPDATE không trúng dòng): đọc lại và báo khoá', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ passwordHash }));
      repo.query.mockResolvedValue([[], 0]);
      repo.findOne.mockResolvedValue({
        id: 7,
        lockedUntil: new Date(NOW.getTime() + 5 * 60_000),
      });
      await expectAppError(
        service.login({ ...dto, password: 'sai12345' }, NOW),
        423,
        'AUTH_ACCOUNT_LOCKED',
      );
    });

    it('đúng mật khẩu: đếm lại từ 0, bỏ khoá cũ, tạo phiên', async () => {
      const user = makeUser({
        passwordHash,
        failedLoginCount: 3,
        lockedUntil: new Date(NOW.getTime() - 1),
      });
      repo.findOneBy.mockResolvedValue(user);
      await service.login(dto, NOW);
      expect(repo.update).toHaveBeenCalledWith(7, {
        failedLoginCount: 0,
        lockedUntil: null,
      });
      expect(session.issue).toHaveBeenCalledWith(user);
    });

    it('đúng mật khẩu, bộ đếm đang 0: không ghi CSDL thừa', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ passwordHash }));
      await service.login(dto, NOW);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('register (BR-05, BR-06, BR-10)', () => {
    const dto = {
      fullName: 'An',
      email: 'an@example.com',
      password: 'matkhau1',
      confirmPassword: 'matkhau1',
    };

    it('tạo USER, băm mật khẩu, không có google_id, rồi tạo phiên', async () => {
      await service.register(dto);
      const inserted = repo.insert.mock.calls[0][0] as User;
      expect(inserted).toMatchObject({
        fullName: 'An',
        email: 'an@example.com',
        role: 'USER',
        googleId: null,
      });
      expect(inserted.passwordHash).toMatch(/^\$2[aby]\$10\$/);
      expect(session.issue).toHaveBeenCalledWith(
        expect.objectContaining({ id: 99 }),
      );
    });

    it('email đã có: 409 đúng câu BR-10', async () => {
      repo.existsBy.mockResolvedValue(true);
      await expectAppError(
        service.register(dto),
        409,
        'AUTH_EMAIL_TAKEN',
        AUTH_MESSAGES.EMAIL_TAKEN,
      );
    });

    it('trùng email do chạy song song (23505): vẫn 409', async () => {
      repo.insert.mockRejectedValue(uniqueViolation());
      await expectAppError(service.register(dto), 409, 'AUTH_EMAIL_TAKEN');
    });
  });

  describe('loginWithGoogle (BR-04)', () => {
    const profile = {
      sub: 'g-123',
      email: 'An@Example.com',
      emailVerified: true,
      name: 'An Google',
      picture: 'https://lh3.googleusercontent.com/a/x',
    };

    it('email Google chưa xác minh: từ chối (TD-22)', async () => {
      await expect(
        service.loginWithGoogle({ ...profile, emailVerified: false }),
      ).rejects.toBeInstanceOf(GoogleLoginError);
    });

    it('đã gắn google_id: đăng nhập luôn', async () => {
      const user = makeUser({ googleId: 'g-123' });
      repo.findOneBy.mockResolvedValueOnce(user);
      await service.loginWithGoogle(profile);
      expect(session.issue).toHaveBeenCalledWith(user);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('email đã có: gắn google_id, giữ họ tên, ảnh, mật khẩu', async () => {
      const user = makeUser({ passwordHash: 'h' });
      repo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
      await service.loginWithGoogle(profile);
      expect(repo.findOneBy).toHaveBeenLastCalledWith({
        email: 'an@example.com',
      });
      expect(repo.update).toHaveBeenCalledWith(7, { googleId: 'g-123' });
      expect(session.issue).toHaveBeenCalledWith(
        expect.objectContaining({ googleId: 'g-123', passwordHash: 'h' }),
      );
    });

    it('email mới: tạo USER không mật khẩu, lấy tên và ảnh Google', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await service.loginWithGoogle(profile);
      expect(repo.insert.mock.calls[0][0]).toMatchObject({
        fullName: 'An Google',
        email: 'an@example.com',
        passwordHash: null,
        googleId: 'g-123',
        avatarUrl: profile.picture,
        role: 'USER',
      });
    });

    it('Google không trả tên: lấy phần trước @; ảnh quá 500 ký tự thì bỏ', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await service.loginWithGoogle({
        ...profile,
        name: undefined,
        picture: `https://x/${'a'.repeat(500)}`,
      });
      expect(repo.insert.mock.calls[0][0]).toMatchObject({
        fullName: 'an',
        avatarUrl: null,
      });
    });

    it('tạo trùng do chạy song song: đọc lại tài khoản vừa tạo', async () => {
      const created = makeUser({ googleId: 'g-123' });
      repo.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      repo.insert.mockRejectedValueOnce(uniqueViolation());
      await service.loginWithGoogle(profile);
      expect(session.issue).toHaveBeenCalledWith(created);
    });
  });
});

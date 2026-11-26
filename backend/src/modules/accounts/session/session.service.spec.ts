import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Redis } from 'ioredis';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { SessionService } from './session.service.js';

/** Redis giả trong bộ nhớ, đủ các lệnh SessionService dùng. */
function fakeRedis() {
  const store = new Map<string, { value: string; ttl: number }>();
  return {
    store,
    get: vi.fn(async (k: string) => store.get(k)?.value ?? null),
    set: vi.fn(async (k: string, value: string, _ex: 'EX', ttl: number) => {
      store.set(k, { value, ttl });
      return 'OK';
    }),
    del: vi.fn(async (k: string) => (store.delete(k) ? 1 : 0)),
  };
}

const ACCESS_SECRET = 'a'.repeat(32);
const REFRESH_SECRET = 'r'.repeat(32);

describe('SessionService (TD-03, TD-23)', () => {
  let redis: ReturnType<typeof fakeRedis>;
  let jwt: JwtService;
  let sessions: SessionService;
  const user = { id: 12, role: 'USER' as const };

  beforeEach(() => {
    redis = fakeRedis();
    jwt = new JwtService({ secret: ACCESS_SECRET });
    const config = new ConfigService({
      JWT_ACCESS_EXPIRES_IN: '30m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      JWT_REFRESH_SECRET: REFRESH_SECRET,
    });
    sessions = new SessionService(
      jwt,
      redis as unknown as Redis,
      config as never,
    );
  });

  async function expectRefreshInvalid(p: Promise<unknown>) {
    const e = await p.then(
      () => null,
      (err: unknown) => err,
    );
    expect(e).toBeInstanceOf(AppException);
    expect((e as AppException).getResponse()).toMatchObject({
      statusCode: 401,
      code: 'AUTH_REFRESH_INVALID',
    });
  }

  it('access token { sub, role } hạn 30 phút, ký bằng access secret (TD-16)', async () => {
    const { accessToken } = await sessions.issue(user);
    const payload = await jwt.verifyAsync<{
      sub: number;
      role: string;
      iat: number;
      exp: number;
    }>(accessToken);
    expect(payload).toMatchObject({ sub: 12, role: 'USER' });
    expect(payload.exp - payload.iat).toBe(30 * 60);
  });

  it('Redis chỉ giữ bản băm của refresh token, TTL ≈ 7 ngày', async () => {
    const { refreshToken, refreshExpiresAt } = await sessions.issue(user);
    const [[key, entry]] = [...redis.store.entries()];
    expect(key).toMatch(/^auth:rt:[0-9a-f-]{36}$/);
    expect(entry.value).not.toContain(refreshToken);
    expect(JSON.parse(entry.value)).toMatchObject({ userId: 12 });
    expect(entry.ttl).toBeGreaterThan(7 * 24 * 3600 - 5);
    expect(refreshExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('xoay vòng: token mới dùng được, token cũ bị từ chối, phiên không bị huỷ', async () => {
    const first = await sessions.issue(user);
    const { sid } = await sessions.verifyRefresh(first.refreshToken);
    const second = await sessions.issue(user, sid);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expectRefreshInvalid(sessions.verifyRefresh(first.refreshToken));
    await expect(sessions.verifyRefresh(second.refreshToken)).resolves.toEqual({
      userId: 12,
      sid,
    });
  });

  it('đăng xuất: xoá phiên, token không làm mới được nữa', async () => {
    const { refreshToken } = await sessions.issue(user);
    await sessions.revoke(refreshToken);
    expect(redis.store.size).toBe(0);
    await expectRefreshInvalid(sessions.verifyRefresh(refreshToken));
  });

  it('đăng xuất bằng token cũ (đã xoay) không xoá phiên đang dùng', async () => {
    const first = await sessions.issue(user);
    const { sid } = await sessions.verifyRefresh(first.refreshToken);
    await sessions.issue(user, sid);
    await sessions.revoke(first.refreshToken);
    expect(redis.store.size).toBe(1);
  });

  it('mỗi lần đăng nhập là một phiên riêng (theo thiết bị, FL AUTH-03)', async () => {
    const a = await sessions.issue(user);
    const b = await sessions.issue(user);
    await sessions.revoke(a.refreshToken);
    await expect(sessions.verifyRefresh(b.refreshToken)).resolves.toBeDefined();
  });

  it('từ chối: không có token, token rác, access token dùng làm refresh token', async () => {
    const { accessToken } = await sessions.issue(user);
    await expectRefreshInvalid(sessions.verifyRefresh(undefined));
    await expectRefreshInvalid(sessions.verifyRefresh('rac'));
    await expectRefreshInvalid(sessions.verifyRefresh(accessToken));
  });

  it('token hợp lệ nhưng phiên đã hết trong Redis: từ chối', async () => {
    const { refreshToken } = await sessions.issue(user);
    redis.store.clear();
    await expectRefreshInvalid(sessions.verifyRefresh(refreshToken));
  });
});

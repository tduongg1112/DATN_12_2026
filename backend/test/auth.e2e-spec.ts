import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { DataSource } from 'typeorm';
import { LocalDiskStorage } from '../src/common/storage/local-disk.storage.js';
import { StorageService } from '../src/common/storage/storage.service.js';
import {
  validateEnv,
  type EnvironmentVariables,
} from '../src/config/env.validation.js';
import { configureApp } from '../src/configure-app.js';
import {
  GoogleOAuthClient,
  type GoogleProfile,
} from '../src/modules/accounts/google/google-oauth.client.js';
import { hashPassword } from '../src/modules/accounts/password.js';

/**
 * E2E feature auth (UC01, docs/auth/api_auth.md A1 → A6, U1 → U3).
 * Chạy trên PostgreSQL và Redis thật (`docker compose up -d`, đã chạy migration).
 * Google thay bằng client giả; ảnh lưu vào thư mục tạm (testing-rules mục 3).
 */

const MSG = {
  EMAIL_TAKEN:
    'Email này đã có tài khoản. Bạn có thể đăng nhập hoặc tiếp tục với Google',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  INVALID_IMAGE: 'Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB',
  WRONG_PASSWORD: 'Mật khẩu hiện tại không đúng',
  PASSWORD_NOT_SET: 'Tài khoản đăng nhập bằng Google không có mật khẩu để đổi',
};

const EMAIL_PREFIX = `e2e-auth-${Date.now()}`;
let emailSeq = 0;
const newEmail = () => `${EMAIL_PREFIX}-${++emailSeq}@example.test`;

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49]);
const GIF = Buffer.from('GIF89a-khong-phai-anh-hop-le');

/** Google giả: mỗi `code` ứng với một hồ sơ Google. */
class FakeGoogleClient extends GoogleOAuthClient {
  configured = true;
  readonly profiles = new Map<string, GoogleProfile>();

  isConfigured(): boolean {
    return this.configured;
  }

  authUrl(state: string): string {
    return `https://accounts.google.test/o/oauth2/auth?state=${state}`;
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    const profile = this.profiles.get(code);
    if (!profile) throw new Error('code không hợp lệ');
    return profile;
  }
}

function cookieValue(res: Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const line = raw?.find((c) => c.startsWith(`${name}=`));
  const value = line?.split(';')[0].slice(name.length + 1);
  return value ? value : undefined;
}

function cookieLine(res: Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${name}=`));
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let db: DataSource;
  let jwt: JwtService;
  let config: ConfigService<EnvironmentVariables, true>;
  let google: FakeGoogleClient;
  let uploadDir: string;
  let frontendUrl: string;

  const api = (p: string) => `/api/v1${p}`;

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const env = validateEnv(process.env);
    const { AppModule } = await import('../src/app.module.js');

    uploadDir = await mkdtemp(path.join(os.tmpdir(), 'e2e-auth-uploads-'));
    google = new FakeGoogleClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GoogleOAuthClient)
      .useValue(google)
      .overrideProvider(StorageService)
      .useValue(
        new LocalDiskStorage({
          rootDir: uploadDir,
          publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
          maxBytes: env.STORAGE_MAX_BYTES,
        }),
      )
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
    db = app.get(DataSource);
    jwt = app.get(JwtService);
    config = app.get(ConfigService);
    frontendUrl = config
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/+$/, '');
  });

  afterAll(async () => {
    await db
      ?.query(`DELETE FROM users WHERE email LIKE $1`, [`${EMAIL_PREFIX}-%`])
      .catch(() => undefined);
    await app?.close();
    if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
  });

  async function register(email = newEmail(), password = 'matkhau1') {
    const res = await request(http)
      .post(api('/auth/register'))
      .send({
        fullName: 'Người Dùng E2E',
        email,
        password,
        confirmPassword: password,
      })
      .expect(201);
    return {
      email,
      password,
      accessToken: res.body.accessToken as string,
      refresh: cookieValue(res, 'refresh_token')!,
    };
  }

  function login(email: string, password: string) {
    return request(http).post(api('/auth/login')).send({ email, password });
  }

  function refresh(token?: string) {
    const req = request(http).post(api('/auth/refresh'));
    return token ? req.set('Cookie', `refresh_token=${token}`) : req;
  }

  function payloadOf(accessToken: string): { sub: number; role: string } {
    return jwt.decode(accessToken);
  }

  // --- A1 Đăng ký -----------------------------------------------------------

  describe('A1 POST /auth/register (US-01)', () => {
    it('tạo USER, tự đăng nhập, đặt cookie refresh đúng thuộc tính (BR-06, TD-12)', async () => {
      const email = newEmail();
      const res = await request(http)
        .post(api('/auth/register'))
        .send({
          fullName: '  Trần Thị Bình ',
          email: email.toUpperCase(),
          password: 'matkhau1',
          confirmPassword: 'matkhau1',
        })
        .expect(201);
      expect(Object.keys(res.body)).toEqual(['accessToken']);
      expect(payloadOf(res.body.accessToken).role).toBe('USER');
      const line = cookieLine(res, 'refresh_token')!;
      expect(line).toMatch(/HttpOnly/);
      expect(line).toMatch(/SameSite=Lax/);
      expect(line).toMatch(/Path=\/api\/v1\/auth/);

      const [row] = (await db.query(
        `SELECT full_name, email, password_hash, google_id, role, failed_login_count
         FROM users WHERE email = $1`,
        [email],
      )) as Record<string, unknown>[];
      expect(row).toMatchObject({
        full_name: 'Trần Thị Bình',
        email,
        google_id: null,
        role: 'USER',
        failed_login_count: 0,
      });
      expect(row.password_hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('email đã có (khác hoa thường): 409 đúng câu BR-10, dưới trường email', async () => {
      const { email } = await register();
      const res = await request(http)
        .post(api('/auth/register'))
        .send({
          fullName: 'Ai Đó',
          email: email.toUpperCase(),
          password: 'matkhau2',
          confirmPassword: 'matkhau2',
        })
        .expect(409);
      expect(res.body).toEqual({
        statusCode: 409,
        code: 'AUTH_EMAIL_TAKEN',
        message: MSG.EMAIL_TAKEN,
        errors: [{ field: 'email', message: MSG.EMAIL_TAKEN }],
      });
    });

    it('mật khẩu 7 ký tự và xác nhận không khớp: lỗi dưới từng trường (BR-11)', async () => {
      const res = await request(http)
        .post(api('/auth/register'))
        .send({
          fullName: 'Ai Đó',
          email: newEmail(),
          password: 'abcdef1',
          confirmPassword: 'abcdef2',
        })
        .expect(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
      });
      expect(res.body.errors).toEqual([
        {
          field: 'password',
          message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số',
        },
        { field: 'confirmPassword', message: 'Mật khẩu xác nhận không khớp' },
      ]);
    });
  });

  // --- A2 Đăng nhập ---------------------------------------------------------

  describe('A2 POST /auth/login (US-03)', () => {
    it('đúng email (không phân biệt hoa thường) và mật khẩu: 200 + cookie', async () => {
      const { email, password } = await register();
      const res = await login(email.toUpperCase(), password).expect(200);
      expect(payloadOf(res.body.accessToken).role).toBe('USER');
      expect(cookieValue(res, 'refresh_token')).toBeDefined();
    });

    it('sai mật khẩu hoặc email không tồn tại: cùng một câu, không chỉ trường (BR-07)', async () => {
      const { email } = await register();
      const wrong = await login(email, 'saimatkhau1').expect(401);
      const unknown = await login(newEmail(), 'saimatkhau1').expect(401);
      const expected = {
        statusCode: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: MSG.INVALID_CREDENTIALS,
      };
      expect(wrong.body).toEqual(expected);
      expect(unknown.body).toEqual(expected);
    });

    it('sai liên tiếp tới lần thứ 5 thì khoá; đúng mật khẩu vẫn bị chặn; hết khoá thì vào được (BR-08)', async () => {
      const max = config.get('AUTH_MAX_FAILED_LOGINS', { infer: true });
      const minutes = config.get('AUTH_LOCK_MINUTES', { infer: true });
      const { email, password } = await register();

      for (let i = 1; i < max; i++) {
        await login(email, `sai${i}abcde`).expect(401);
      }
      const locked = await login(email, 'sai-lan-cuoi1').expect(423);
      const lockedBody = {
        statusCode: 423,
        code: 'AUTH_ACCOUNT_LOCKED',
        message: `Bạn đã nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      };
      expect(locked.body).toEqual(lockedBody);
      await login(email, password).expect(423);

      const [row] = (await db.query(
        `SELECT failed_login_count, locked_until FROM users WHERE email = $1`,
        [email],
      )) as { failed_login_count: number; locked_until: Date }[];
      expect(row.failed_login_count).toBe(0);
      const lockMs = row.locked_until.getTime() - Date.now();
      expect(lockMs).toBeGreaterThan((minutes - 1) * 60_000);
      expect(lockMs).toBeLessThanOrEqual(minutes * 60_000);

      // Giả lập hết thời gian khoá.
      await db.query(
        `UPDATE users SET locked_until = now() - interval '1 second' WHERE email = $1`,
        [email],
      );
      await login(email, password).expect(200);
      const [after] = (await db.query(
        `SELECT failed_login_count, locked_until FROM users WHERE email = $1`,
        [email],
      )) as { failed_login_count: number; locked_until: Date | null }[];
      expect(after).toEqual({ failed_login_count: 0, locked_until: null });
    });

    it('đăng nhập đúng thì bộ đếm sai về 0 (BR-08)', async () => {
      const { email, password } = await register();
      await login(email, 'saimatkhau1').expect(401);
      await login(email, 'saimatkhau2').expect(401);
      await login(email, password).expect(200);
      const [row] = (await db.query(
        `SELECT failed_login_count FROM users WHERE email = $1`,
        [email],
      )) as { failed_login_count: number }[];
      expect(row.failed_login_count).toBe(0);
    });

    it('ADMIN đăng nhập: token mang role ADMIN, dùng được route của USER (BR-15)', async () => {
      const email = newEmail();
      await db.query(
        `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, 'ADMIN')`,
        ['Quản trị E2E', email, await hashPassword('quantri1')],
      );
      const res = await login(email, 'quantri1').expect(200);
      expect(payloadOf(res.body.accessToken).role).toBe('ADMIN');
      const me = await request(http)
        .get(api('/users/me'))
        .auth(res.body.accessToken, { type: 'bearer' })
        .expect(200);
      expect(me.body.role).toBe('ADMIN');
    });

    it('thiếu trường: 400 với câu theo trường', async () => {
      const res = await login('', '').expect(400);
      expect(res.body.errors).toEqual([
        { field: 'email', message: 'Vui lòng nhập email' },
        { field: 'password', message: 'Vui lòng nhập mật khẩu' },
      ]);
    });
  });

  // --- A3, A4 Làm mới phiên, đăng xuất ---------------------------------------

  describe('A3 /auth/refresh, A4 /auth/logout (TD-03, BR-12)', () => {
    it('xoay vòng: token mới dùng được, token cũ bị từ chối và cookie hỏng bị xoá', async () => {
      const { refresh: first } = await register();
      const ok = await refresh(first).expect(200);
      expect(Object.keys(ok.body)).toEqual(['accessToken']);
      const second = cookieValue(ok, 'refresh_token')!;
      expect(second).not.toBe(first);

      const reused = await refresh(first).expect(401);
      expect(reused.body).toEqual({
        statusCode: 401,
        code: 'AUTH_REFRESH_INVALID',
        message: 'Vui lòng đăng nhập',
      });
      expect(cookieLine(reused, 'refresh_token')).toMatch(
        /Expires=Thu, 01 Jan 1970/,
      );
      await refresh(second).expect(200);
    });

    it('không có cookie: 401', async () => {
      await refresh().expect(401);
    });

    it('đăng xuất: 204, xoá cookie, phiên không làm mới được nữa; gọi lại vẫn 204', async () => {
      const { refresh: token } = await register();
      const res = await request(http)
        .post(api('/auth/logout'))
        .set('Cookie', `refresh_token=${token}`)
        .expect(204);
      expect(cookieLine(res, 'refresh_token')).toMatch(
        /Expires=Thu, 01 Jan 1970/,
      );
      await refresh(token).expect(401);
      await request(http)
        .post(api('/auth/logout'))
        .set('Cookie', `refresh_token=${token}`)
        .expect(204);
    });

    it('đăng xuất một thiết bị không ảnh hưởng thiết bị khác (FL AUTH-03)', async () => {
      const { email, password, refresh: deviceA } = await register();
      const loginB = await login(email, password).expect(200);
      const deviceB = cookieValue(loginB, 'refresh_token')!;
      await request(http)
        .post(api('/auth/logout'))
        .set('Cookie', `refresh_token=${deviceA}`)
        .expect(204);
      await refresh(deviceB).expect(200);
    });
  });

  // --- U1 → U3 Hồ sơ ---------------------------------------------------------

  describe('U1 → U3 /users/me (US-05)', () => {
    it('chưa đăng nhập: 401 (BR-01)', async () => {
      const res = await request(http).get(api('/users/me')).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('U1: hồ sơ không chứa dữ liệu nhạy cảm', async () => {
      const { email, accessToken } = await register();
      const res = await request(http)
        .get(api('/users/me'))
        .auth(accessToken, { type: 'bearer' })
        .expect(200);
      expect(res.body).toEqual({
        id: payloadOf(accessToken).sub,
        fullName: 'Người Dùng E2E',
        email,
        avatarUrl: null,
        role: 'USER',
        hasPassword: true,
      });
    });

    it('U2: đổi họ tên bằng JSON; không gửi gì hoặc tên trống thì báo dưới trường (BR-16)', async () => {
      const { accessToken } = await register();
      const ok = await request(http)
        .patch(api('/users/me'))
        .auth(accessToken, { type: 'bearer' })
        .send({ fullName: '  Lê Văn Cường ' })
        .expect(200);
      expect(ok.body.fullName).toBe('Lê Văn Cường');

      for (const body of [{}, { fullName: '   ' }]) {
        const bad = await request(http)
          .patch(api('/users/me'))
          .auth(accessToken, { type: 'bearer' })
          .send(body)
          .expect(400);
        expect(bad.body.errors).toEqual([
          { field: 'fullName', message: 'Vui lòng nhập họ tên' },
        ]);
      }
    });

    it('U2: tải ảnh đại diện; đổi ảnh thì xoá ảnh cũ; ảnh sai định dạng bị từ chối (TD-14)', async () => {
      const { accessToken } = await register();
      const up = () =>
        request(http)
          .patch(api('/users/me'))
          .auth(accessToken, { type: 'bearer' });

      const first = await up()
        .attach('avatar', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(200);
      const base = config
        .get('STORAGE_PUBLIC_BASE_URL', { infer: true })
        .replace(/\/+$/, '');
      expect(first.body.avatarUrl).toMatch(
        new RegExp(`^${base}/avatars/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.jpg$`),
      );
      const [row] = (await db.query(
        `SELECT avatar_url FROM users WHERE id = $1`,
        [payloadOf(accessToken).sub],
      )) as { avatar_url: string }[];
      expect(row.avatar_url).toMatch(/^avatars\//);
      const firstKey = row.avatar_url;

      const second = await up()
        .field('fullName', 'Có Ảnh Mới')
        .attach('avatar', JPG, { filename: 'b.jpg', contentType: 'image/jpeg' })
        .expect(200);
      expect(second.body.fullName).toBe('Có Ảnh Mới');
      expect(second.body.avatarUrl).not.toBe(first.body.avatarUrl);
      expect(existsSync(path.join(uploadDir, firstKey))).toBe(false);

      const bad = await up()
        .attach('avatar', GIF, { filename: 'c.jpg', contentType: 'image/jpeg' })
        .expect(400);
      expect(bad.body).toEqual({
        statusCode: 400,
        code: 'INVALID_IMAGE_TYPE',
        message: MSG.INVALID_IMAGE,
      });
      const files = await readdir(path.dirname(path.join(uploadDir, firstKey)));
      expect(files).toHaveLength(1);
    });

    it('U3: đổi mật khẩu — sai mật khẩu hiện tại, mật khẩu mới yếu, thành công (BR-17)', async () => {
      const { email, password, accessToken } = await register();
      const change = (body: object) =>
        request(http)
          .put(api('/users/me/password'))
          .auth(accessToken, { type: 'bearer' })
          .send(body);

      const wrong = await change({
        currentPassword: 'khongphai1',
        newPassword: 'matkhaumoi1',
        confirmNewPassword: 'matkhaumoi1',
      }).expect(400);
      expect(wrong.body).toEqual({
        statusCode: 400,
        code: 'AUTH_WRONG_PASSWORD',
        message: MSG.WRONG_PASSWORD,
        errors: [{ field: 'currentPassword', message: MSG.WRONG_PASSWORD }],
      });

      const weak = await change({
        currentPassword: password,
        newPassword: 'chiconchu',
        confirmNewPassword: 'chiconchu',
      }).expect(400);
      expect(weak.body.errors).toEqual([
        {
          field: 'newPassword',
          message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số',
        },
      ]);

      await change({
        currentPassword: password,
        newPassword: 'matkhaumoi1',
        confirmNewPassword: 'matkhaumoi1',
      }).expect(204);
      await login(email, password).expect(401);
      await login(email, 'matkhaumoi1').expect(200);
    });
  });

  // --- A5, A6 Google --------------------------------------------------------

  describe('A5, A6 Google (US-02, BR-04, BR-09)', () => {
    async function start(next?: string) {
      const res = await request(http)
        .get(api('/auth/google'))
        .query(next ? { next } : {})
        .expect(302);
      const state = new URL(res.headers.location).searchParams.get('state')!;
      return { res, state, cookie: cookieValue(res, 'google_oauth')! };
    }

    function callback(query: Record<string, string>, stateCookie?: string) {
      const req = request(http).get(api('/auth/google/callback')).query(query);
      return stateCookie
        ? req.set('Cookie', `google_oauth=${stateCookie}`)
        : req;
    }

    it('A5: chuyển sang Google kèm state; cookie state chỉ đi kèm /auth/google', async () => {
      const { res, state } = await start('/history');
      expect(res.headers.location).toMatch(
        /^https:\/\/accounts\.google\.test\//,
      );
      expect(state.length).toBeGreaterThanOrEqual(32);
      const line = cookieLine(res, 'google_oauth')!;
      expect(line).toMatch(/HttpOnly/);
      expect(line).toMatch(/Path=\/api\/v1\/auth\/google/);
    });

    it('email mới: tạo USER không mật khẩu, lấy tên + ảnh Google, quay về /login?next=…', async () => {
      const email = newEmail();
      const picture = 'https://lh3.googleusercontent.com/a/e2e';
      google.profiles.set('code-new', {
        sub: `g-${email}`,
        email,
        emailVerified: true,
        name: 'Phạm Google',
        picture,
      });
      const { state, cookie } = await start('/history');
      const res = await callback({ code: 'code-new', state }, cookie).expect(
        302,
      );
      expect(res.headers.location).toBe(`${frontendUrl}/login?next=%2Fhistory`);
      expect(cookieLine(res, 'google_oauth')).toMatch(
        /Expires=Thu, 01 Jan 1970/,
      );

      // Frontend khôi phục phiên bằng cookie vừa đặt.
      const session = await refresh(cookieValue(res, 'refresh_token')).expect(
        200,
      );
      const me = await request(http)
        .get(api('/users/me'))
        .auth(session.body.accessToken, { type: 'bearer' })
        .expect(200);
      expect(me.body).toMatchObject({
        email,
        fullName: 'Phạm Google',
        avatarUrl: picture,
        role: 'USER',
        hasPassword: false,
      });

      // BR-17, OQ-27: tài khoản chỉ dùng Google không đổi mật khẩu được.
      const change = await request(http)
        .put(api('/users/me/password'))
        .auth(session.body.accessToken, { type: 'bearer' })
        .send({
          currentPassword: 'x',
          newPassword: 'matkhaumoi1',
          confirmNewPassword: 'matkhaumoi1',
        })
        .expect(400);
      expect(change.body).toEqual({
        statusCode: 400,
        code: 'AUTH_PASSWORD_NOT_SET',
        message: MSG.PASSWORD_NOT_SET,
      });

      // Đăng nhập Google lần sau: không tạo tài khoản mới.
      const again = await start();
      await callback(
        { code: 'code-new', state: again.state },
        again.cookie,
      ).expect(302);
      const [{ count }] = (await db.query(
        `SELECT count(*)::int AS count FROM users WHERE email = $1`,
        [email],
      )) as { count: number }[];
      expect(count).toBe(1);
    });

    it('email đã đăng ký bằng mật khẩu: gắn google_id, mật khẩu cũ vẫn dùng được', async () => {
      const { email, password } = await register();
      google.profiles.set('code-link', {
        sub: `g-link-${email}`,
        email: email.toUpperCase(),
        emailVerified: true,
        name: 'Tên Khác',
      });
      const { state, cookie } = await start();
      const res = await callback({ code: 'code-link', state }, cookie).expect(
        302,
      );
      expect(res.headers.location).toBe(`${frontendUrl}/login`);
      const [row] = (await db.query(
        `SELECT google_id, full_name FROM users WHERE email = $1`,
        [email],
      )) as { google_id: string; full_name: string }[];
      expect(row).toEqual({
        google_id: `g-link-${email}`,
        full_name: 'Người Dùng E2E',
      });
      await login(email, password).expect(200);
    });

    it('người dùng huỷ: về /login không thông báo, không tạo phiên (BR-09)', async () => {
      const { state, cookie } = await start('/plants');
      const res = await callback(
        { error: 'access_denied', state },
        cookie,
      ).expect(302);
      expect(res.headers.location).toBe(`${frontendUrl}/login?next=%2Fplants`);
      expect(cookieValue(res, 'refresh_token')).toBeUndefined();
    });

    it('state sai, thiếu cookie state, email chưa xác minh: về /login?error=google (OQ-34)', async () => {
      const email = newEmail();
      google.profiles.set('code-unverified', {
        sub: `g-${email}`,
        email,
        emailVerified: false,
      });
      google.profiles.set('code-ok', {
        sub: `g-ok-${email}`,
        email,
        emailVerified: true,
      });

      const a = await start();
      const badState = await callback(
        { code: 'code-ok', state: 'gia-mao' },
        a.cookie,
      ).expect(302);
      const b = await start();
      const noCookie = await callback({
        code: 'code-ok',
        state: b.state,
      }).expect(302);
      const c = await start();
      const unverified = await callback(
        { code: 'code-unverified', state: c.state },
        c.cookie,
      ).expect(302);

      for (const res of [badState, noCookie, unverified]) {
        expect(res.headers.location).toBe(`${frontendUrl}/login?error=google`);
        expect(cookieValue(res, 'refresh_token')).toBeUndefined();
      }
      const [{ count }] = (await db.query(
        `SELECT count(*)::int AS count FROM users WHERE email = $1`,
        [email],
      )) as { count: number }[];
      expect(count).toBe(0);
    });

    it('chưa cấu hình Google: về /login?error=google', async () => {
      google.configured = false;
      try {
        const res = await request(http)
          .get(api('/auth/google'))
          .query({ next: '/history' })
          .expect(302);
        expect(res.headers.location).toBe(
          `${frontendUrl}/login?error=google&next=%2Fhistory`,
        );
      } finally {
        google.configured = true;
      }
    });
  });
});

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { Redis } from 'ioredis';
import type { AccessTokenPayload } from '../../../common/auth/auth-user.js';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { DEFAULT_ERRORS } from '../../../common/exceptions/default-errors.js';
import type { EnvironmentVariables } from '../../../config/env.validation.js';
import type { Role } from '../entities/user.entity.js';
import { REDIS_CLIENT } from './redis.provider.js';

/** Payload refresh token (TD-23): `sid` là mã phiên của một thiết bị. */
interface RefreshTokenPayload {
  sub: number;
  sid: string;
  jti: string;
  exp: number;
}

/** Bản ghi phiên trong Redis: chỉ lưu bản băm của refresh token (TD-03). */
interface StoredSession {
  userId: number;
  hash: string;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface VerifiedRefresh {
  userId: number;
  sid: string;
}

const KEY_PREFIX = 'auth:rt:';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** 401 cho mọi lỗi làm mới phiên (api_auth.md A3). Câu dự phòng OQ-29. */
export function refreshInvalid(): AppException {
  return new AppException(
    HttpStatus.UNAUTHORIZED,
    'AUTH_REFRESH_INVALID',
    DEFAULT_ERRORS[HttpStatus.UNAUTHORIZED].message,
  );
}

/**
 * Cấp, xoay vòng và thu hồi phiên đăng nhập (TD-03, TD-12, TD-23).
 * Access token: JWT `{ sub, role }`, ký bằng JWT_ACCESS_SECRET.
 * Refresh token: JWT `{ sub, sid, jti }`, ký bằng JWT_REFRESH_SECRET; Redis giữ
 * SHA-256 của token hiện hành của phiên `sid`, TTL bằng hạn token.
 */
@Injectable()
export class SessionService {
  private readonly accessExpiresIn: JwtSignOptions['expiresIn'];
  private readonly refreshExpiresIn: JwtSignOptions['expiresIn'];
  private readonly refreshSecret: string;

  constructor(
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.accessExpiresIn = config.get('JWT_ACCESS_EXPIRES_IN', {
      infer: true,
    }) as JwtSignOptions['expiresIn'];
    this.refreshExpiresIn = config.get('JWT_REFRESH_EXPIRES_IN', {
      infer: true,
    }) as JwtSignOptions['expiresIn'];
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  /** Tạo phiên mới (đăng ký, đăng nhập, Google) hoặc xoay vòng phiên `sid` có sẵn. */
  async issue(
    user: { id: number; role: Role },
    sid: string = randomUUID(),
  ): Promise<IssuedSession> {
    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      expiresIn: this.accessExpiresIn,
    });
    // jti ngẫu nhiên: hai lần xoay vòng trong cùng một giây vẫn ra token khác nhau.
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid, jti: randomUUID() },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn },
    );
    const { exp } = this.jwt.decode<RefreshTokenPayload>(refreshToken);
    const refreshExpiresAt = new Date(exp * 1000);
    const ttlSeconds = Math.max(1, exp - Math.floor(Date.now() / 1000));
    const stored: StoredSession = {
      userId: user.id,
      hash: sha256(refreshToken),
    };
    await this.redis.set(
      KEY_PREFIX + sid,
      JSON.stringify(stored),
      'EX',
      ttlSeconds,
    );
    return { accessToken, refreshToken, refreshExpiresAt };
  }

  /**
   * Kiểm tra refresh token: chữ ký, hạn, phiên còn trong Redis và đúng là token hiện
   * hành (token cũ đã bị xoay thì trả 401, không huỷ cả phiên — TD-23).
   */
  async verifyRefresh(token: string | undefined): Promise<VerifiedRefresh> {
    const payload = await this.decodeRefresh(token);
    if (!payload) throw refreshInvalid();
    const raw = await this.redis.get(KEY_PREFIX + payload.sid);
    if (!raw) throw refreshInvalid();
    const stored = JSON.parse(raw) as StoredSession;
    if (
      stored.userId !== payload.sub ||
      !sameHash(stored.hash, sha256(token!))
    ) {
      throw refreshInvalid();
    }
    return { userId: payload.sub, sid: payload.sid };
  }

  /** Đăng xuất thiết bị hiện tại (BR-12). Token sai hoặc đã hết hạn thì bỏ qua. */
  async revoke(token: string | undefined): Promise<void> {
    const payload = await this.decodeRefresh(token);
    if (!payload) return;
    const key = KEY_PREFIX + payload.sid;
    const raw = await this.redis.get(key);
    if (!raw) return;
    const stored = JSON.parse(raw) as StoredSession;
    if (sameHash(stored.hash, sha256(token!))) await this.redis.del(key);
  }

  private async decodeRefresh(
    token: string | undefined,
  ): Promise<RefreshTokenPayload | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
      });
      const sub = Number(payload.sub);
      if (
        !Number.isSafeInteger(sub) ||
        sub <= 0 ||
        typeof payload.sid !== 'string'
      ) {
        return null;
      }
      return { ...payload, sub };
    } catch {
      return null;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { authErrors } from './account-messages.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { User } from './entities/user.entity.js';
import type { GoogleProfile } from './google/google-oauth.client.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from './password.js';
import {
  SessionService,
  refreshInvalid,
  type IssuedSession,
} from './session/session.service.js';

/** Lỗi PostgreSQL 23505: trùng UNIQUE (uq_users_email, uq_users_google_id). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}

/** Lỗi trong luồng Google: controller chuyển thành `/login?error=google` (OQ-34). */
export class GoogleLoginError extends Error {}

const AVATAR_URL_MAX_LENGTH = 500;
const FULL_NAME_MAX_LENGTH = 100;

/**
 * Đăng ký, đăng nhập (email, Google), làm mới phiên, đăng xuất (UC01).
 * Chỉ ghi bảng `users`, mỗi thao tác một câu lệnh (database_design_auth.md mục 3).
 */
@Injectable()
export class AuthService {
  private readonly maxFailedLogins: number;
  private readonly lockMinutes: number;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly session: SessionService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maxFailedLogins = config.get('AUTH_MAX_FAILED_LOGINS', {
      infer: true,
    });
    this.lockMinutes = config.get('AUTH_LOCK_MINUTES', { infer: true });
  }

  /** A1 (BR-05, BR-06, BR-10). Tạo tài khoản USER rồi tự đăng nhập. */
  async register(dto: RegisterDto): Promise<IssuedSession> {
    if (await this.users.existsBy({ email: dto.email })) {
      throw authErrors.emailTaken();
    }
    const user = this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      googleId: null,
      avatarUrl: null,
      role: 'USER',
    });
    try {
      await this.users.insert(user);
    } catch (error) {
      if (isUniqueViolation(error)) throw authErrors.emailTaken();
      throw error;
    }
    return this.session.issue(user);
  }

  /** A2 (BR-07, BR-08; data_model mục 5). */
  async login(dto: LoginDto, now: Date = new Date()): Promise<IssuedSession> {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user?.passwordHash) {
      await burnPasswordCheck(dto.password);
      throw authErrors.invalidCredentials();
    }
    if (user.lockedUntil && user.lockedUntil > now) {
      throw authErrors.locked(user.lockedUntil, now);
    }
    if (!(await verifyPassword(dto.password, user.passwordHash))) {
      const lockedUntil = await this.recordFailedLogin(user.id, now);
      if (lockedUntil && lockedUntil > now) {
        throw authErrors.locked(lockedUntil, now);
      }
      throw authErrors.invalidCredentials();
    }
    if (user.failedLoginCount !== 0 || user.lockedUntil !== null) {
      await this.users.update(user.id, {
        failedLoginCount: 0,
        lockedUntil: null,
      });
    }
    return this.session.issue(user);
  }

  /** A3: xoay vòng refresh token, đọc lại `role` hiện tại. */
  async refresh(token: string | undefined): Promise<IssuedSession> {
    const { userId, sid } = await this.session.verifyRefresh(token);
    const user = await this.users.findOneBy({ id: userId });
    if (!user) {
      await this.session.revoke(token);
      throw refreshInvalid();
    }
    return this.session.issue(user, sid);
  }

  /** A4 (BR-12). */
  logout(token: string | undefined): Promise<void> {
    return this.session.revoke(token);
  }

  /** A6 (BR-04): tìm theo google_id → theo email (gắn google_id) → tạo USER mới. */
  async loginWithGoogle(profile: GoogleProfile): Promise<IssuedSession> {
    // TD-22: chỉ tin email Google đã xác minh, tránh chiếm tài khoản email có sẵn.
    if (!profile.emailVerified) {
      throw new GoogleLoginError('Email Google chưa được xác minh');
    }
    const user = await this.findOrCreateGoogleUser(profile);
    return this.session.issue(user);
  }

  private async findOrCreateGoogleUser(
    profile: GoogleProfile,
    retried = false,
  ): Promise<User> {
    try {
      const byGoogle = await this.users.findOneBy({ googleId: profile.sub });
      if (byGoogle) return byGoogle;

      const email = profile.email.trim().toLowerCase();
      const byEmail = await this.users.findOneBy({ email });
      if (byEmail) {
        // Gắn Google vào tài khoản sẵn có; không đổi họ tên, ảnh, mật khẩu.
        await this.users.update(byEmail.id, { googleId: profile.sub });
        return { ...byEmail, googleId: profile.sub };
      }

      const user = this.users.create({
        fullName: (profile.name?.trim() || email.split('@')[0]).slice(
          0,
          FULL_NAME_MAX_LENGTH,
        ),
        email,
        passwordHash: null,
        googleId: profile.sub,
        avatarUrl:
          profile.picture && profile.picture.length <= AVATAR_URL_MAX_LENGTH
            ? profile.picture
            : null,
        role: 'USER',
      });
      await this.users.insert(user);
      return user;
    } catch (error) {
      // Hai lần đăng nhập Google đầu tiên chạy song song: đọc lại bản vừa tạo.
      if (!retried && isUniqueViolation(error)) {
        return this.findOrCreateGoogleUser(profile, true);
      }
      throw error;
    }
  }

  /**
   * Tăng bộ đếm sai mật khẩu trong một câu lệnh (an toàn khi gửi đồng thời). Đủ
   * AUTH_MAX_FAILED_LOGINS thì khoá AUTH_LOCK_MINUTES phút và đếm lại từ 0 (OQ-31).
   * Trả `locked_until` sau cập nhật; tài khoản vừa bị khoá bởi yêu cầu khác thì đọc lại.
   */
  private async recordFailedLogin(
    userId: number,
    now: Date,
  ): Promise<Date | null> {
    const lockUntil = new Date(now.getTime() + this.lockMinutes * 60_000);
    const [rows] = (await this.users.query(
      `UPDATE users SET
         failed_login_count = CASE WHEN failed_login_count + 1 >= $2 THEN 0 ELSE failed_login_count + 1 END,
         locked_until = CASE WHEN failed_login_count + 1 >= $2 THEN $3::timestamptz ELSE locked_until END,
         updated_at = now()
       WHERE id = $1 AND (locked_until IS NULL OR locked_until <= $4::timestamptz)
       RETURNING locked_until`,
      [userId, this.maxFailedLogins, lockUntil, now],
    )) as [{ locked_until: Date | null }[], number];
    if (rows.length > 0) return rows[0].locked_until;
    const current = await this.users.findOne({
      where: { id: userId },
      select: { id: true, lockedUntil: true },
    });
    return current?.lockedUntil ?? null;
  }
}

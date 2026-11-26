import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import {
  DEFAULT_ERRORS,
  VALIDATION_ERROR,
} from '../../common/exceptions/default-errors.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { authErrors, FIELD_MESSAGES } from './account-messages.js';
import type {
  ChangePasswordDto,
  UpdateProfileDto,
  UserProfile,
} from './dto/profile.dto.js';
import { User } from './entities/user.entity.js';
import { hashPassword, verifyPassword } from './password.js';

/**
 * Hồ sơ và đổi mật khẩu (AUTH-04, BR-16, BR-17). Luôn thao tác trên id lấy từ access
 * token, nên người dùng chỉ chạm được tài khoản của chính mình (BR-G03).
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly storage: StorageService,
  ) {}

  /** U1. */
  async getProfile(userId: number): Promise<UserProfile> {
    return this.toProfile(await this.requireUser(userId));
  }

  /** U2. Ảnh lưu qua StorageService; cột lưu khoá đối tượng (TD-14). */
  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
    avatar?: Buffer,
  ): Promise<UserProfile> {
    if (dto.fullName === undefined && !avatar) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        VALIDATION_ERROR.code,
        VALIDATION_ERROR.message,
        [{ field: 'fullName', message: FIELD_MESSAGES.FULL_NAME_REQUIRED }],
      );
    }
    const user = await this.requireUser(userId);
    const saved = avatar
      ? await this.storage.saveImage(avatar, 'avatars')
      : undefined;
    const changes: Partial<User> = {};
    if (dto.fullName !== undefined) changes.fullName = dto.fullName;
    if (saved) changes.avatarUrl = saved.key;
    try {
      await this.users.update(user.id, changes);
    } catch (error) {
      if (saved) await this.storage.delete(saved.key).catch(() => undefined);
      throw error;
    }
    if (saved && user.avatarUrl) {
      // Ảnh cũ do hệ thống giữ thì xoá; ảnh Google (URL ngoài) thì bỏ qua.
      await this.storage
        .deleteStored(user.avatarUrl)
        .catch((e: unknown) =>
          this.logger.warn(
            `Không xoá được ảnh đại diện cũ của user ${user.id}: ${String(e)}`,
          ),
        );
    }
    return this.toProfile({ ...user, ...changes });
  }

  /** U3 (BR-17, OQ-27). */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.requireUser(userId);
    if (!user.passwordHash) throw authErrors.passwordNotSet();
    if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw authErrors.wrongPassword();
    }
    await this.users.update(user.id, {
      passwordHash: await hashPassword(dto.newPassword),
    });
  }

  /** Id mọi tài khoản ADMIN, để mô-đun khác gửi thông báo (diagnosis BR-11, TD-25). */
  async findAdminIds(): Promise<number[]> {
    const admins = await this.users.find({
      select: { id: true },
      where: { role: 'ADMIN' },
      order: { id: 'ASC' },
    });
    return admins.map((u) => u.id);
  }

  private async requireUser(userId: number): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) {
      const e = DEFAULT_ERRORS[HttpStatus.UNAUTHORIZED];
      throw new AppException(HttpStatus.UNAUTHORIZED, e.code, e.message);
    }
    return user;
  }

  private async toProfile(user: User): Promise<UserProfile> {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: await this.storage.resolveUrl(user.avatarUrl),
      role: user.role,
      hasPassword: user.passwordHash !== null,
    };
  }
}

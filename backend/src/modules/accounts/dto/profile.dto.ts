import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { FIELD_MESSAGES as M } from '../account-messages.js';
import { PASSWORD_MAX_LENGTH } from '../password.js';
import { IsStrongPassword, MatchesProperty, Trim } from './validators.js';

/** U2. PATCH /users/me: multipart (có ảnh `avatar`) hoặc JSON (BR-16). */
export class UpdateProfileDto {
  @IsOptional()
  @MaxLength(100, { message: M.FULL_NAME_TOO_LONG })
  @IsNotEmpty({ message: M.FULL_NAME_REQUIRED })
  @IsString({ message: M.FULL_NAME_REQUIRED })
  @Trim()
  fullName?: string;
}

/** U3. PUT /users/me/password (BR-17; mật khẩu mới theo BR-05). */
export class ChangePasswordDto {
  @IsNotEmpty({ message: M.PASSWORD_REQUIRED })
  @IsString({ message: M.PASSWORD_REQUIRED })
  currentPassword: string;

  @MaxLength(PASSWORD_MAX_LENGTH, { message: M.PASSWORD_TOO_LONG })
  @IsStrongPassword({ message: M.PASSWORD_WEAK })
  @IsNotEmpty({ message: M.PASSWORD_REQUIRED })
  @IsString({ message: M.PASSWORD_REQUIRED })
  newPassword: string;

  @MatchesProperty('newPassword', { message: M.PASSWORD_MISMATCH })
  confirmNewPassword: string;
}

/** U1. Hồ sơ trả về (không có password_hash, google_id, bộ đếm, khoá). */
export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  /** false: tài khoản chỉ dùng Google, ẩn đổi mật khẩu (BR-17, OQ-27). */
  hasPassword: boolean;
}

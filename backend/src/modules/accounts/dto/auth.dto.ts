import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FIELD_MESSAGES as M } from '../account-messages.js';
import { PASSWORD_MAX_LENGTH } from '../password.js';
import {
  IsStrongPassword,
  MatchesProperty,
  NormalizeEmail,
  Trim,
} from './validators.js';

/*
 * Mỗi trường chỉ báo MỘT câu lỗi (câu đầu tiên trong `constraints`). class-validator
 * chạy decorator từ dưới lên, nên kiểm tra "trống" đặt sát tên trường nhất để
 * được báo trước (OQ-32).
 */

/** A1. POST /auth/register (BR-05). */
export class RegisterDto {
  @MaxLength(100, { message: M.FULL_NAME_TOO_LONG })
  @IsNotEmpty({ message: M.FULL_NAME_REQUIRED })
  @IsString({ message: M.FULL_NAME_REQUIRED })
  @Trim()
  fullName: string;

  @MaxLength(255, { message: M.EMAIL_INVALID })
  @IsEmail({}, { message: M.EMAIL_INVALID })
  @IsNotEmpty({ message: M.EMAIL_REQUIRED })
  @IsString({ message: M.EMAIL_REQUIRED })
  @NormalizeEmail()
  email: string;

  @MaxLength(PASSWORD_MAX_LENGTH, { message: M.PASSWORD_TOO_LONG })
  @IsStrongPassword({ message: M.PASSWORD_WEAK })
  @IsNotEmpty({ message: M.PASSWORD_REQUIRED })
  @IsString({ message: M.PASSWORD_REQUIRED })
  password: string;

  @MatchesProperty('password', { message: M.PASSWORD_MISMATCH })
  confirmPassword: string;
}

/** A2. POST /auth/login. Không kiểm tra quy tắc mật khẩu ở đây (BR-07). */
export class LoginDto {
  @IsEmail({}, { message: M.EMAIL_INVALID })
  @IsNotEmpty({ message: M.EMAIL_REQUIRED })
  @IsString({ message: M.EMAIL_REQUIRED })
  @NormalizeEmail()
  email: string;

  @IsNotEmpty({ message: M.PASSWORD_REQUIRED })
  @IsString({ message: M.PASSWORD_REQUIRED })
  password: string;
}

/** A6. Query Google gửi về callback. Các tham số khác của Google bị bỏ qua. */
export class GoogleCallbackQuery {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  error?: string;
}

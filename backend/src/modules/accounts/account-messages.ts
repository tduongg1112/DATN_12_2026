import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';

/**
 * Câu thông báo của feature auth (docs/auth/api_auth.md).
 * - Nguyên văn specs: EMAIL_TAKEN (BR-10), INVALID_CREDENTIALS (BR-07).
 * - Claude soạn, Dương duyệt 21/11: OQ-31 (khoá), OQ-32 (theo trường), OQ-33 (AUTH-04).
 */
export const AUTH_MESSAGES = {
  EMAIL_TAKEN:
    'Email này đã có tài khoản. Bạn có thể đăng nhập hoặc tiếp tục với Google',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  WRONG_PASSWORD: 'Mật khẩu hiện tại không đúng',
  PASSWORD_NOT_SET: 'Tài khoản đăng nhập bằng Google không có mật khẩu để đổi',
} as const;

/** OQ-32: câu lỗi theo từng trường. */
export const FIELD_MESSAGES = {
  FULL_NAME_REQUIRED: 'Vui lòng nhập họ tên',
  FULL_NAME_TOO_LONG: 'Họ tên tối đa 100 ký tự',
  EMAIL_REQUIRED: 'Vui lòng nhập email',
  EMAIL_INVALID: 'Email không hợp lệ',
  PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu',
  PASSWORD_WEAK: 'Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số',
  PASSWORD_TOO_LONG: 'Mật khẩu tối đa 72 ký tự',
  PASSWORD_MISMATCH: 'Mật khẩu xác nhận không khớp',
} as const;

/** OQ-31: số phút còn lại, làm tròn lên, tối thiểu 1. */
export function lockedMessage(lockedUntil: Date, now: Date): string {
  const minutes = Math.max(
    1,
    Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000),
  );
  return `Bạn đã nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${minutes} phút.`;
}

export const authErrors = {
  emailTaken: () =>
    new AppException(
      HttpStatus.CONFLICT,
      'AUTH_EMAIL_TAKEN',
      AUTH_MESSAGES.EMAIL_TAKEN,
      [{ field: 'email', message: AUTH_MESSAGES.EMAIL_TAKEN }],
    ),
  invalidCredentials: () =>
    new AppException(
      HttpStatus.UNAUTHORIZED,
      'AUTH_INVALID_CREDENTIALS',
      AUTH_MESSAGES.INVALID_CREDENTIALS,
    ),
  locked: (lockedUntil: Date, now: Date) =>
    new AppException(
      HttpStatus.LOCKED,
      'AUTH_ACCOUNT_LOCKED',
      lockedMessage(lockedUntil, now),
    ),
  wrongPassword: () =>
    new AppException(
      HttpStatus.BAD_REQUEST,
      'AUTH_WRONG_PASSWORD',
      AUTH_MESSAGES.WRONG_PASSWORD,
      [{ field: 'currentPassword', message: AUTH_MESSAGES.WRONG_PASSWORD }],
    ),
  passwordNotSet: () =>
    new AppException(
      HttpStatus.BAD_REQUEST,
      'AUTH_PASSWORD_NOT_SET',
      AUTH_MESSAGES.PASSWORD_NOT_SET,
    ),
};

import bcrypt from 'bcrypt';

/** TD-16: bcrypt 10 vòng (dùng chung cho đăng ký, đổi mật khẩu và seed ADMIN). */
export const BCRYPT_ROUNDS = 10;

/** BR-05: 8 → 72 ký tự (72 là giới hạn của bcrypt, OQ-32). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** BR-05: có ít nhất một chữ cái (kể cả chữ có dấu) và một chữ số. */
export function isPasswordStrongEnough(value: string): boolean {
  return (
    [...value].length >= PASSWORD_MIN_LENGTH &&
    /\p{L}/u.test(value) &&
    /[0-9]/.test(value)
  );
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * So sánh với một bản băm giả, để đăng nhập bằng email không tồn tại mất thời gian
 * tương đương email có thật (không lộ email có tồn tại hay không).
 */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= bcrypt.hash('khong-phai-mat-khau-that-0', BCRYPT_ROUNDS);
  await bcrypt.compare(plain, await dummyHash);
}

import { FIELD_TEXT as T } from "./messages"

/**
 * Kiểm tra phía client, cùng quy tắc với backend (BR-05, OQ-32). Backend vẫn là nơi
 * quyết định; đây chỉ để báo lỗi ngay dưới trường mà không cần gọi API.
 */
export type FieldErrors<K extends string> = Partial<Record<K, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function checkFullName(value: string): string | undefined {
  const v = value.trim()
  if (!v) return T.FULL_NAME_REQUIRED
  if ([...v].length > 100) return T.FULL_NAME_TOO_LONG
}

export function checkEmail(value: string): string | undefined {
  const v = value.trim()
  if (!v) return T.EMAIL_REQUIRED
  if (v.length > 255 || !EMAIL_PATTERN.test(v)) return T.EMAIL_INVALID
}

export function checkPasswordPresent(value: string): string | undefined {
  if (!value) return T.PASSWORD_REQUIRED
}

/** BR-05: 8 → 72 ký tự, có cả chữ (kể cả chữ có dấu) và số. */
export function checkNewPassword(value: string): string | undefined {
  if (!value) return T.PASSWORD_REQUIRED
  const length = [...value].length
  if (length > 72) return T.PASSWORD_TOO_LONG
  if (length < 8 || !/\p{L}/u.test(value) || !/[0-9]/.test(value)) {
    return T.PASSWORD_WEAK
  }
}

export function checkConfirm(
  password: string,
  confirm: string
): string | undefined {
  if (password !== confirm) return T.PASSWORD_MISMATCH
}

/** Bỏ các khoá không có lỗi; rỗng nghĩa là hợp lệ. */
export function compact<K extends string>(
  errors: Record<K, string | undefined>
): FieldErrors<K> {
  return Object.fromEntries(
    Object.entries(errors).filter(([, v]) => v !== undefined)
  ) as FieldErrors<K>
}

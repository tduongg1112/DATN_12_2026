import { randomBytes, timingSafeEqual } from 'node:crypto';

const NEXT_MAX_LENGTH = 500;

/**
 * Chỉ nhận đường dẫn nội bộ để quay về sau đăng nhập (BR-03), chặn chuyển hướng ra
 * ngoài (`//evil.com`, `https://…`, `/\evil.com`).
 */
export function safeNext(next: unknown): string | undefined {
  if (typeof next !== 'string' || next.length > NEXT_MAX_LENGTH)
    return undefined;
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.startsWith('/\\')
  ) {
    return undefined;
  }
  return next;
}

export interface OAuthState {
  state: string;
  next?: string;
}

export function newOAuthState(next: unknown): OAuthState {
  return { state: randomBytes(24).toString('base64url'), next: safeNext(next) };
}

/** Giá trị cookie `google_oauth`: JSON mã hoá base64url. */
export function encodeOAuthState(value: OAuthState): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function decodeOAuthState(raw: string | undefined): OAuthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as Partial<OAuthState>;
    if (typeof parsed.state !== 'string' || parsed.state.length === 0)
      return null;
    return { state: parsed.state, next: safeNext(parsed.next) };
  } catch {
    return null;
  }
}

/** So `state` Google gửi về với `state` trong cookie, thời gian so sánh cố định. */
export function stateMatches(expected: string, received: unknown): boolean {
  if (typeof received !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

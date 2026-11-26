import type { CookieOptions, Request, Response } from 'express';
import { API_PREFIX } from '../../../configure-app.js';

/** TD-12: refresh token chỉ đi kèm các route `/api/v1/auth/*`. */
export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = `/${API_PREFIX}/auth`;

/** TD-22: `state` và `next` của luồng Google, chỉ đi kèm `/api/v1/auth/google/*`. */
export const GOOGLE_STATE_COOKIE = 'google_oauth';
export const GOOGLE_STATE_COOKIE_PATH = `/${API_PREFIX}/auth/google`;
export const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;

function baseOptions(secure: boolean, path: string): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  expires: Date,
  secure: boolean,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(secure, REFRESH_COOKIE_PATH),
    expires,
  });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions(secure, REFRESH_COOKIE_PATH));
}

export function setGoogleStateCookie(
  res: Response,
  value: string,
  secure: boolean,
): void {
  res.cookie(GOOGLE_STATE_COOKIE, value, {
    ...baseOptions(secure, GOOGLE_STATE_COOKIE_PATH),
    maxAge: GOOGLE_STATE_TTL_MS,
  });
}

export function clearGoogleStateCookie(res: Response, secure: boolean): void {
  res.clearCookie(
    GOOGLE_STATE_COOKIE,
    baseOptions(secure, GOOGLE_STATE_COOKIE_PATH),
  );
}

/** Đọc cookie do `cookie-parser` gắn vào request (configure-app.ts). */
export function readCookie(req: Request, name: string): string | undefined {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

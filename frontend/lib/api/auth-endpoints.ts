/**
 * Hợp đồng feature `auth` (docs/auth/api_auth.md, TD-15 chốt 21/11).
 * - Refresh (A3): POST /auth/refresh, refresh token đi trong cookie httpOnly (TD-12),
 *   trả `{ accessToken: string }`.
 * - Đăng xuất (A4): POST /auth/logout, thu hồi refresh token (TD-03), trả 204.
 * - Google (A5): điều hướng toàn trang tới GET /auth/google?next=…
 */
export const AUTH_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  google: "/auth/google",
  me: "/users/me",
  password: "/users/me/password",
} as const

export function parseRefreshResponse(body: unknown): string | null {
  const token = (body as { accessToken?: unknown } | null)?.accessToken
  return typeof token === "string" && token.length > 0 ? token : null
}

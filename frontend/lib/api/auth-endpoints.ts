/**
 * GIẢ ĐỊNH chờ feature `auth` chốt trong docs/auth/api_auth.md. Mọi chỗ phụ thuộc
 * hợp đồng refresh/đăng xuất chỉ nằm ở file này; khi auth chốt thì sửa tại đây.
 * - Refresh: POST /auth/refresh, refresh token đi trong cookie httpOnly (TD-12),
 *   trả `{ accessToken: string }`.
 * - Đăng xuất: POST /auth/logout, thu hồi refresh token (TD-03).
 */
export const AUTH_ENDPOINTS = {
  refresh: "/auth/refresh",
  logout: "/auth/logout",
} as const

export function parseRefreshResponse(body: unknown): string | null {
  const token = (body as { accessToken?: unknown } | null)?.accessToken
  return typeof token === "string" && token.length > 0 ? token : null
}

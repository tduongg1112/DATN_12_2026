import { ROUTES } from "@/lib/navigation"
import type { Role } from "@/lib/types/domain"

/** Chỉ nhận đường dẫn nội bộ, tránh chuyển hướng ra ngoài (`//evil.com`, `https://…`). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null
  if (next.startsWith(ROUTES.login) || next.startsWith(ROUTES.register))
    return null
  return next
}

/** Đường tới màn đăng nhập, nhớ trang đang định vào. */
export function loginUrl(next: string): string {
  const target = safeNext(next)
  return target && target !== ROUTES.home
    ? `${ROUTES.login}?next=${encodeURIComponent(target)}`
    : ROUTES.login
}

/**
 * Trang đích sau khi đăng nhập (C4 UC01, specs_auth BR-03):
 * ADMIN luôn vào Dashboard; USER về trang đã định vào, mặc định trang chủ.
 */
export function postLoginRedirect(
  role: Role,
  next: string | null | undefined
): string {
  if (role === "ADMIN") return ROUTES.adminHome
  const target = safeNext(next)
  if (
    !target ||
    target === ROUTES.adminHome ||
    target.startsWith(`${ROUTES.adminHome}/`)
  ) {
    return ROUTES.home
  }
  return target
}

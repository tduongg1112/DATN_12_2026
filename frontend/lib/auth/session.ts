import type { Role } from "@/lib/types/domain"

/** Người dùng hiện tại, đọc từ payload access token (backend ký `{ sub, role }`). */
export interface SessionUser {
  id: number
  role: Role
}

/**
 * Giải mã payload JWT để biết id và vai trò, phục vụ điều hướng giao diện.
 * KHÔNG xác thực chữ ký: quyền thật do backend kiểm tra ở mọi request.
 */
export function decodeAccessToken(token: string): SessionUser | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      )
    ) as { sub?: unknown; role?: unknown }
    const id = Number(json.sub)
    if (!Number.isSafeInteger(id) || id <= 0) return null
    if (json.role !== "USER" && json.role !== "ADMIN") return null
    return { id, role: json.role }
  } catch {
    return null
  }
}

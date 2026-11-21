"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { postLoginRedirect, safeNext, useAuth } from "@/lib/auth"

/**
 * Dùng ở /login và /register. Đã có phiên (vừa đăng nhập, vừa đăng ký, quay về từ
 * Google, hoặc mở lại trang khi còn phiên) thì chuyển theo vai trò (BR-03):
 * ADMIN → Dashboard, USER → trang định vào hoặc trang chủ.
 */
export function useAuthRedirect(): {
  ready: boolean
  next: string | null
} {
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get("next"))
  const { status, user } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(postLoginRedirect(user.role, next))
    }
  }, [status, user, next, router])

  return { ready: status === "anonymous", next }
}

/** Đường dẫn kèm `?next=` để giữ trang định vào khi chuyển giữa đăng nhập và đăng ký. */
export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path
}

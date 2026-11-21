"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"

import { EmptyState, PageSkeleton } from "@/components/ds/states"
import { ROUTES } from "@/lib/navigation"
import type { Role } from "@/lib/types/domain"

import { useAuth } from "./auth-provider"
import { loginUrl } from "./redirect"

/** ADMIN kế thừa quyền của USER (OQ-22), khớp RolesGuard ở backend. */
function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return (
    allowed.includes(role) || (role === "ADMIN" && allowed.includes("USER"))
  )
}

interface RequireAuthProps {
  children: React.ReactNode
  roles?: readonly Role[]
}

/**
 * Bảo vệ route phía client (fe-coding-rules mục 3, 4; specs_auth BR-01).
 * Chưa đăng nhập: chuyển tới màn đăng nhập, nhớ trang định vào.
 */
export function RequireAuth({ children, roles = ["USER"] }: RequireAuthProps) {
  const { status, user } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "anonymous") {
      // Đọc từ window để không phải bọc Suspense cho useSearchParams.
      router.replace(
        loginUrl(window.location.pathname + window.location.search)
      )
    }
  }, [status, router])

  if (status !== "authenticated" || !user) {
    return (
      <div className="min-h-dvh bg-page px-[var(--gutter-mobile)] py-5 lg:px-8">
        <PageSkeleton label="Đang kiểm tra phiên đăng nhập" />
      </div>
    )
  }

  if (!hasRole(user.role, roles)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-page px-[var(--gutter-mobile)]">
        <EmptyState
          icon={ShieldAlert}
          message="Bạn không có quyền truy cập trang này."
          action={{ label: "Về trang chủ", href: ROUTES.home }}
        />
      </main>
    )
  }

  return <>{children}</>
}

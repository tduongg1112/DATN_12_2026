"use client"

import Link from "next/link"
import { LayoutDashboard } from "lucide-react"

import { Dock } from "@/components/ds/dock"
import { useAuth } from "@/lib/auth"
import { ADMIN_NAV, ROUTES, USER_NAV } from "@/lib/navigation"
import { useRecordPageVisit } from "@/lib/navigation-history"
import { cn } from "@/lib/utils"

import { AppTopbar } from "./app-topbar"
import { NotificationBell } from "./notification-bell"
import { UserMenu } from "./user-menu"

/** Khuôn trang theo design/06. */
export type UserLayout = "hero" | "list" | "detail"

interface ShellProps {
  title?: string
  backHref?: string
  /** Xem `AppTopbar`. "history": về trang trước trong app, mở thẳng thì về `backHref`. */
  backBehavior?: "link" | "history"
  actions?: React.ReactNode
  children: React.ReactNode
}

/** Nền khuôn "Chi tiết" (#F5F5F5 = --neutral-150); seam/notch khoét đúng màu này. */
const DETAIL_BG = {
  background: "var(--neutral-150)",
  "--seam-bg": "var(--neutral-150)",
} as React.CSSProperties

/** ADMIN dùng được khu người dùng (OQ-22): thêm lối quay lại khu quản trị. */
function AdminAreaLink() {
  const { user } = useAuth()
  if (user?.role !== "ADMIN") return null
  return (
    <Link
      href={ROUTES.adminHome}
      className="icon-btn"
      aria-label="Khu quản trị"
    >
      <LayoutDashboard size={24} aria-hidden />
    </Link>
  )
}

/**
 * Khung trang khu người dùng: Trung tâm (nền sage), Danh sách (xám), Chi tiết (xám nhạt).
 * Mobile: dock nổi đáy, chừa 96px; desktop ≥1024: dock dọc bên trái, nội dung tối đa 1320.
 */
export function UserPageShell({
  layout,
  title,
  backHref,
  backBehavior,
  actions,
  children,
}: ShellProps & { layout: UserLayout }) {
  useRecordPageVisit()
  return (
    <div
      className={cn("app-shell", layout === "hero" && "app-shell--hero")}
      style={layout === "detail" ? DETAIL_BG : undefined}
    >
      <Dock items={USER_NAV} />
      <main className="mx-auto w-full max-w-[var(--container-max)] min-w-0">
        <AppTopbar
          title={title}
          backHref={backHref}
          backBehavior={backBehavior}
          leading={<UserMenu />}
          actions={
            <>
              {actions}
              <NotificationBell />
              <AdminAreaLink />
            </>
          }
        />
        {children}
      </main>
    </div>
  )
}

/** Khuôn "Quản trị" (design/06): nền xám, dock dọc trên desktop, bento + bảng. */
export function AdminPageShell({
  title,
  backHref,
  actions,
  children,
}: ShellProps) {
  return (
    <div className="app-shell">
      <Dock items={ADMIN_NAV} label="Điều hướng quản trị" />
      <main className="mx-auto w-full max-w-[var(--container-max)] min-w-0">
        <AppTopbar
          title={title}
          backHref={backHref}
          leading={<UserMenu />}
          actions={
            <>
              {actions}
              <NotificationBell />
            </>
          }
        />
        {children}
      </main>
    </div>
  )
}

/**
 * Khuôn "Biểu mẫu" (design/06): nền trắng, một cột; desktop là card rộng 440 giữa trang
 * (cùng bề rộng `.dialog` của design/05).
 */
export function FormShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-surface px-[var(--gutter-mobile)] pt-[calc(var(--s-8)+env(safe-area-inset-top,0px))] pb-[calc(var(--s-8)+env(safe-area-inset-bottom,0px))] lg:grid lg:place-items-center lg:bg-page">
      <div className="mx-auto w-full max-w-[440px] lg:rounded-xl lg:bg-surface lg:p-8">
        {children}
      </div>
    </main>
  )
}

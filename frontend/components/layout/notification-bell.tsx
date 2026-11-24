"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

import { useUnreadCount } from "@/hooks/use-unread-count"
import { useAuth } from "@/lib/auth"
import { ROUTES } from "@/lib/navigation"
import { NOTIFICATIONS_TEXT as T } from "@/lib/notifications"

/**
 * Chuông thông báo (my_plants BR-19; design/screens/my_plants.md S6): nút tròn `bell`, có
 * chưa đọc thì chấm số nền `severe`, tối đa "99+". Mở trang thông báo.
 */
export function NotificationBell() {
  // Trang dev (`/dev/shells/*`) dùng chung khung trang mà không đăng nhập: không hiện chuông.
  const { user } = useAuth()
  const count = useUnreadCount(user !== null && user !== undefined)
  if (!user) return null
  return (
    <Link
      href={ROUTES.notifications}
      className="icon-btn relative"
      aria-label={T.BELL(count)}
    >
      <Bell size={24} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--status-severe-solid)] px-1 leading-none text-[var(--text-inverse)] type-caption"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}

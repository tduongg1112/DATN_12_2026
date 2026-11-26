"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { notificationsApi } from "@/lib/api/notifications"
import { onUnreadChanged, UNREAD_POLL_MS } from "@/lib/notifications"

/**
 * Số thông báo chưa đọc cho chuông (my_plants BR-19; design/screens/my_plants.md S6): tải khi
 * đổi trang, mỗi 60 giây khi tab đang hiện, khi quay lại tab, và khi trang thông báo vừa
 * đánh dấu đã đọc. Lỗi mạng thì giữ số cũ. setState chỉ trong callback của promise.
 * `enabled = false` (chưa có phiên) thì không gọi API.
 */
export function useUnreadCount(enabled: boolean): number {
  const pathname = usePathname()
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const load = () => {
      if (document.visibilityState !== "visible") return
      notificationsApi.unreadCount().then(
        (res) => {
          if (!cancelled) setCount(res.count)
        },
        () => undefined
      )
    }
    load()
    const timer = window.setInterval(load, UNREAD_POLL_MS)
    document.addEventListener("visibilitychange", load)
    const unsubscribe = onUnreadChanged(load)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", load)
      unsubscribe()
    }
  }, [pathname, enabled])

  return count
}

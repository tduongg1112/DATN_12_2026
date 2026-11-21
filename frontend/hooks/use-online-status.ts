"use client"

import { useSyncExternalStore } from "react"

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

/**
 * true khi trình duyệt báo đang có mạng. Dùng sự kiện chuẩn của web để chạy được
 * cả khi bọc Capacitor (TD-02); không dùng `useOffline` vì còn experimental.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}

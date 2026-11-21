"use client"

import { WifiOff } from "lucide-react"

import { useOnlineStatus } from "@/hooks/use-online-status"

/** Mất mạng (design/07): dải nhỏ đầu trang, dữ liệu đã có vẫn hiển thị. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-[var(--z-toast)] flex items-center justify-center gap-2 bg-inverse px-4 pt-[calc(var(--s-2)+env(safe-area-inset-top,0px))] pb-2 text-[var(--text-inverse)] type-caption"
    >
      <WifiOff size={18} aria-hidden />
      Đang ngoại tuyến.
    </div>
  )
}

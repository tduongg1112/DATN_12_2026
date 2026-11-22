"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

/*
 * Đếm số trang đã mở trong app từ lần tải trang gần nhất. Mở thẳng một đường dẫn (tải
 * lại trang, dán link) thì bộ đếm bắt đầu lại từ 1, nên nút quay lại biết là không có
 * trang trước trong app để về (design/06: app đóng gói không có nút Back của trình duyệt).
 */
let visitedPages = 0
let lastLocation: string | null = null

/** Ghi nhận một lần mở trang. Gọi trong khung trang (UserPageShell). */
export function useRecordPageVisit(): void {
  const pathname = usePathname()
  React.useEffect(() => {
    const location = `${pathname}${window.location.search}`
    // StrictMode chạy effect hai lần cho cùng một trang: chỉ đếm khi trang đổi.
    if (location === lastLocation) return
    lastLocation = location
    visitedPages++
  }, [pathname])
}

/**
 * Hàm quay lại: có trang trước trong app thì lùi lịch sử (giữ bộ lọc, vị trí cuộn), không
 * thì về `fallback`.
 */
export function useBackNavigation(fallback: string): () => void {
  const router = useRouter()
  return React.useCallback(() => {
    if (visitedPages > 1) router.back()
    else router.push(fallback)
  }, [router, fallback])
}

import type { Metadata } from "next"

import { NotificationsView } from "@/components/notifications/notifications-view"
import { NOTIFICATIONS_TEXT } from "@/lib/notifications"

export const metadata: Metadata = { title: NOTIFICATIONS_TEXT.TITLE }

/**
 * S6 Thông báo `/notifications` (my_plants US-10), khuôn "Danh sách". Khu người dùng; ADMIN
 * vào được (OQ-22) và thấy cả thông báo nhãn lạ (diagnosis BR-11).
 */
export default function Page() {
  return <NotificationsView />
}

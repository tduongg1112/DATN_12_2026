import type { NotificationsPage } from "@/lib/types/notifications"

import { api } from "./client"

/** Lời gọi API thông báo trong ứng dụng (my_plants N1 → N4; BR-17, BR-19). */
export const notificationsApi = {
  /** N1. */
  list: (page: { page: number; pageSize: number }, signal?: AbortSignal) =>
    api.get<NotificationsPage>("/notifications", { query: page, signal }),

  /** N2. */
  unreadCount: (signal?: AbortSignal) =>
    api.get<{ count: number }>("/notifications/unread-count", { signal }),

  /** N3. */
  markRead: (id: number) => api.post<void>(`/notifications/${id}/read`),

  /** N4. */
  markAllRead: () => api.post<void>("/notifications/read-all"),
}

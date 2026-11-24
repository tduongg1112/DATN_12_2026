/** N1 GET /notifications (docs/my_plants/api_my_plants.md). */
export interface NotificationView {
  id: number
  title: string
  content: string
  isRead: boolean
  /** ISO 8601. */
  createdAt: string
  /** Cây của lịch nhắc; null khi không gắn lịch nhắc hoặc lịch nhắc đã bị xoá. */
  plantId: number | null
}

export interface NotificationsPage {
  items: NotificationView[]
  page: number
  pageSize: number
  total: number
  unreadCount: number
}

/**
 * Chữ giao diện thông báo (design/screens/my_plants.md S6). Câu ✎ do Claude soạn, Dương duyệt
 * 23/11 (OQ-51).
 */
export const NOTIFICATIONS_TEXT = {
  /** ✎ */
  TITLE: "Thông báo",
  /** ✎ nhãn nút chuông */
  BELL: (unread: number) =>
    unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo",
  /** ✎ */
  MARK_ALL: "Đánh dấu tất cả đã đọc",
  /** ✎ */
  EMPTY: "Chưa có thông báo nào.",
  /** ✎ */
  LOAD_MORE: "Xem thêm",
} as const

/** N1: 20 thông báo mỗi lần. */
export const NOTIFICATIONS_PAGE_SIZE = 20
/** Tải lại số chưa đọc mỗi 60 giây khi tab đang hiện (design/screens/my_plants.md S6). */
export const UNREAD_POLL_MS = 60_000

/*
 * Báo cho chuông tải lại số chưa đọc sau khi người dùng đánh dấu đã đọc ở trang thông báo.
 */
const listeners = new Set<() => void>()

export function onUnreadChanged(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function unreadChanged(): void {
  listeners.forEach((listener) => listener())
}

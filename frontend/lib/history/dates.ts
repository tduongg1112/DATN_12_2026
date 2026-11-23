/**
 * Ngày giờ của lịch sử tra cứu, tính theo giờ máy người dùng (OQ-42, chốt 23/11).
 */

export type HistoryGroup = "today" | "week" | "earlier"

/** Thứ tự nhóm (C4 UC03 bước 2). */
export const HISTORY_GROUPS: HistoryGroup[] = ["today", "week", "earlier"]

const DATE_INPUT = /^(\d{4})-(\d{2})-(\d{2})$/

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** "Hôm nay" = cùng ngày; "7 ngày qua" = 6 ngày liền trước; "Trước đó" = cũ hơn. */
export function historyGroupOf(
  createdAt: string,
  now: Date = new Date()
): HistoryGroup {
  const day = startOfDay(new Date(createdAt))
  const today = startOfDay(now)
  if (day >= today) return "today"
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 6)
  return day >= weekStart ? "week" : "earlier"
}

/** Ngày `yyyy-MM-dd` có thật (vd không nhận 2026-02-30). */
export function parseDateInput(value: string | null): Date | null {
  const match = value ? DATE_INPUT.exec(value) : null
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null
}

/** `from` của H1: 00:00 ngày bắt đầu, theo giờ máy, dạng ISO có múi giờ. */
export function fromParam(fromDate: string | null): string | undefined {
  return parseDateInput(fromDate)?.toISOString()
}

/** `to` của H1: 00:00 của ngày SAU ngày kết thúc, để lấy trọn ngày cuối (`created_at < to`). */
export function toParam(toDate: string | null): string | undefined {
  const date = parseDateInput(toDate)
  if (!date) return undefined
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

/** Ngày bắt đầu sau ngày kết thúc thì không gọi API. */
export function isDateRangeValid(
  fromDate: string | null,
  toDate: string | null
): boolean {
  const from = parseDateInput(fromDate)
  const to = parseDateInput(toDate)
  return !from || !to || from <= to
}

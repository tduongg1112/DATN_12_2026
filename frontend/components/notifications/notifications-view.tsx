"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { UserPageShell } from "@/components/layout/page-shells"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { notificationsApi } from "@/lib/api/notifications"
import { formatDiagnosisTime } from "@/lib/diagnosis/text"
import { plantDetailHref } from "@/lib/navigation"
import {
  NOTIFICATIONS_PAGE_SIZE,
  NOTIFICATIONS_TEXT as T,
  unreadChanged,
} from "@/lib/notifications"
import type { NotificationView } from "@/lib/types/notifications"
import { cn } from "@/lib/utils"

function messageOf(error: unknown): string {
  return isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
}

/**
 * S6 Thông báo `/notifications` (my_plants US-10; BR-17, BR-19). Mới nhất trên; bấm một
 * thông báo thì đánh dấu đã đọc và mở chi tiết cây nếu thông báo gắn với lịch nhắc. Không có
 * xoá thông báo. Tự dựng khung trang để đặt nút "Đánh dấu tất cả đã đọc" trên thanh đầu trang.
 */
export function NotificationsView() {
  const router = useRouter()
  /** Tăng sau "Đánh dấu tất cả đã đọc" để tải lại từ trang 1. */
  const [version, setVersion] = React.useState(0)
  const firstPage = useApiRequest(`notifications#${version}`, (signal) =>
    notificationsApi.list(
      { page: 1, pageSize: NOTIFICATIONS_PAGE_SIZE },
      signal
    )
  )
  const [more, setMore] = React.useState<{
    version: number
    page: number
    items: NotificationView[]
  } | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)
  /** Đánh dấu đã đọc ngay trên màn, không chờ tải lại. */
  const [readIds, setReadIds] = React.useState<ReadonlySet<number>>(new Set())
  const [markingAll, setMarkingAll] = React.useState(false)

  const extra = more?.version === version ? more : null
  const items = firstPage.data
    ? [...firstPage.data.items, ...(extra?.items ?? [])].map((n) =>
        readIds.has(n.id) ? { ...n, isRead: true } : n
      )
    : []
  const total = firstPage.data?.total ?? 0
  const unread = firstPage.data
    ? Math.max(
        0,
        firstPage.data.unreadCount -
          items.filter((n) => readIds.has(n.id)).length
      )
    : 0

  async function loadMore() {
    const page = (extra?.page ?? 1) + 1
    setLoadingMore(true)
    try {
      const next = await notificationsApi.list({
        page,
        pageSize: NOTIFICATIONS_PAGE_SIZE,
      })
      const seen = new Set(items.map((n) => n.id))
      setMore({
        version,
        page,
        items: [
          ...(extra?.items ?? []),
          ...next.items.filter((n) => !seen.has(n.id)),
        ],
      })
    } catch (error) {
      notify(messageOf(error))
    } finally {
      setLoadingMore(false)
    }
  }

  async function open(notice: NotificationView) {
    if (!notice.isRead) {
      setReadIds((prev) => new Set([...prev, notice.id]))
      notificationsApi
        .markRead(notice.id)
        .then(unreadChanged, (error) => notify(messageOf(error)))
    }
    if (notice.plantId !== null) router.push(plantDetailHref(notice.plantId))
  }

  async function markAll() {
    setMarkingAll(true)
    try {
      await notificationsApi.markAllRead()
      setReadIds(new Set())
      setVersion((v) => v + 1)
      unreadChanged()
    } catch (error) {
      notify(messageOf(error))
    } finally {
      setMarkingAll(false)
    }
  }

  let content: React.ReactNode
  if (firstPage.error) {
    content = (
      <ErrorState
        message={firstPage.error.message}
        onRetry={firstPage.reload}
      />
    )
  } else if (!firstPage.data) {
    content = <NotificationsSkeleton />
  } else if (total === 0) {
    content = (
      <Card>
        <EmptyState icon={Bell} message={T.EMPTY} />
      </Card>
    )
  } else {
    content = (
      <div className="grid gap-3 lg:gap-5">
        <Card notch>
          <ul className="m-0 grid list-none p-0">
            {items.map((notice) => (
              <li
                key={notice.id}
                className="border-t border-dashed border-line first:border-0"
              >
                <button
                  type="button"
                  onClick={() => void open(notice)}
                  className="flex w-full items-start gap-3 rounded-md py-3 text-left outline-none hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-2 size-2.5 shrink-0 rounded-full",
                      notice.isRead ? "bg-transparent" : "bg-olive"
                    )}
                  />
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span
                      className={cn(
                        "type-title",
                        notice.isRead && "text-ink-secondary"
                      )}
                    >
                      {notice.title}
                    </span>
                    <span className="type-body-sm">{notice.content}</span>
                    <span className="text-ink-secondary type-caption">
                      {formatDiagnosisTime(notice.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        {items.length < total && (
          <Button
            variant="secondary"
            className="justify-self-center"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {T.LOAD_MORE}
          </Button>
        )}
      </div>
    )
  }

  return (
    <UserPageShell
      layout="list"
      title={T.TITLE}
      actions={
        unread > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={markingAll}
            onClick={markAll}
          >
            {T.MARK_ALL}
          </Button>
        ) : null
      }
    >
      {content}
    </UserPageShell>
  )
}

/** Khung chờ: 3 hàng (design/07). */
export function NotificationsSkeleton() {
  return (
    <Card role="status" aria-live="polite" className="grid gap-4">
      <span className="sr-only">Đang tải</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-5 w-2/3 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
        </div>
      ))}
    </Card>
  )
}

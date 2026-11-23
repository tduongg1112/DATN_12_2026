import { Suspense } from "react"
import type { Metadata } from "next"

import {
  HistoryListSkeleton,
  HistoryListView,
} from "@/components/history/history-list-view"
import { UserPageShell } from "@/components/layout/page-shells"
import { HISTORY_TEXT } from "@/lib/history/text"

export const metadata: Metadata = { title: HISTORY_TEXT.PAGE_TITLE }

/**
 * S1 Lịch sử tra cứu `/history` (UC03), khuôn "Danh sách" (design/screens/history.md).
 * Bộ lọc nằm trên URL, đọc bằng `useSearchParams` nên bọc `<Suspense>`. Khung trang do
 * `HistoryListView` dựng để đặt nút "Chọn" lên thanh đầu trang.
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <UserPageShell layout="list" title={HISTORY_TEXT.PAGE_TITLE}>
          <HistoryListSkeleton />
        </UserPageShell>
      }
    >
      <HistoryListView />
    </Suspense>
  )
}

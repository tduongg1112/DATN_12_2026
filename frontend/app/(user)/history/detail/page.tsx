import { Suspense } from "react"
import type { Metadata } from "next"

import { ResultSkeleton } from "@/components/diagnosis/result-cards"
import { HistoryDetailView } from "@/components/history/history-detail-view"
import { UserPageShell } from "@/components/layout/page-shells"
import { HISTORY_TEXT } from "@/lib/history/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: HISTORY_TEXT.DETAIL_TITLE }

/**
 * S2 Chi tiết lần tra cứu `/history/detail?id=…` (design/screens/history.md). Query string
 * thay cho `[id]` để build được bản tĩnh (fe-coding-rules mục 3). Nút quay lại về trang
 * trước trong app (giữ bộ lọc); mở thẳng thì về `/history`.
 */
export default function Page() {
  return (
    <UserPageShell
      layout="detail"
      title={HISTORY_TEXT.DETAIL_TITLE}
      backHref={ROUTES.history}
      backBehavior="history"
    >
      <Suspense fallback={<ResultSkeleton />}>
        <HistoryDetailView />
      </Suspense>
    </UserPageShell>
  )
}

import { Suspense } from "react"
import type { Metadata } from "next"

import { UserPageShell } from "@/components/layout/page-shells"
import {
  DiseaseDetailSkeleton,
  DiseaseDetailView,
} from "@/components/library/disease-detail-view"
import { LIBRARY_TEXT } from "@/lib/library/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: LIBRARY_TEXT.DETAIL_TITLE }

/**
 * S3 Chi tiết bệnh `/library/detail?id=…`, khuôn "Chi tiết" (design/screens/disease_library.md).
 * Query string thay cho `[id]` để build được bản tĩnh (fe-coding-rules mục 3). Nút quay
 * lại về trang trước trong app; mở thẳng bằng đường dẫn thì về "Xem tất cả".
 */
export default function Page() {
  return (
    <UserPageShell
      layout="detail"
      title={LIBRARY_TEXT.DETAIL_TITLE}
      backHref={ROUTES.library}
      backBehavior="history"
    >
      <Suspense fallback={<DiseaseDetailSkeleton />}>
        <DiseaseDetailView />
      </Suspense>
    </UserPageShell>
  )
}

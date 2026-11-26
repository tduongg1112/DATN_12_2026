import { Suspense } from "react"
import type { Metadata } from "next"

import { UserPageShell } from "@/components/layout/page-shells"
import {
  PlantDetailSkeleton,
  PlantDetailView,
} from "@/components/plants/plant-detail-view"
import { ROUTES } from "@/lib/navigation"
import { PLANTS_TEXT } from "@/lib/plants/text"

export const metadata: Metadata = { title: PLANTS_TEXT.PAGE_TITLE }

/**
 * S3 Chi tiết cây `/plants/detail?id=…` (design/screens/my_plants.md). Query string thay cho
 * `[id]` để build được bản tĩnh. Nút quay lại về trang trước trong app; mở thẳng thì về
 * `/plants`.
 */
export default function Page() {
  return (
    <UserPageShell
      layout="detail"
      title={PLANTS_TEXT.PAGE_TITLE}
      backHref={ROUTES.plants}
      backBehavior="history"
    >
      <Suspense fallback={<PlantDetailSkeleton />}>
        <PlantDetailView />
      </Suspense>
    </UserPageShell>
  )
}

import { Suspense } from "react"
import type { Metadata } from "next"

import { PageSkeleton } from "@/components/ds/states"
import { UserPageShell } from "@/components/layout/page-shells"
import { NewPlantView } from "@/components/plants/plant-form-views"
import { ROUTES } from "@/lib/navigation"
import { PLANTS_TEXT } from "@/lib/plants/text"

export const metadata: Metadata = { title: PLANTS_TEXT.ADD }

/**
 * S2 Thêm cây `/plants/new` (`?diagnosisId=` khi tạo từ kết quả chẩn đoán). Biểu mẫu trong
 * khung có dock (design/screens/my_plants.md). Nút quay lại về trang trước trong app.
 */
export default function Page() {
  return (
    <UserPageShell
      layout="detail"
      title={PLANTS_TEXT.ADD}
      backHref={ROUTES.plants}
      backBehavior="history"
    >
      <Suspense fallback={<PageSkeleton />}>
        <NewPlantView />
      </Suspense>
    </UserPageShell>
  )
}

import { Suspense } from "react"
import type { Metadata } from "next"

import { PageSkeleton } from "@/components/ds/states"
import { UserPageShell } from "@/components/layout/page-shells"
import { EditPlantView } from "@/components/plants/plant-form-views"
import { ROUTES } from "@/lib/navigation"
import { PLANTS_TEXT } from "@/lib/plants/text"

export const metadata: Metadata = { title: PLANTS_TEXT.EDIT_TITLE }

/** S4 Sửa cây `/plants/edit?id=…` (design/screens/my_plants.md). */
export default function Page() {
  return (
    <UserPageShell
      layout="detail"
      title={PLANTS_TEXT.EDIT_TITLE}
      backHref={ROUTES.plants}
      backBehavior="history"
    >
      <Suspense fallback={<PageSkeleton />}>
        <EditPlantView />
      </Suspense>
    </UserPageShell>
  )
}

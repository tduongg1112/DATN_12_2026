import { Suspense } from "react"
import type { Metadata } from "next"

import { FormSkeleton, NewDiseaseView } from "@/components/catalog/form-views"
import { AdminPageShell } from "@/components/layout/page-shells"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: T.ADD_DISEASE }

/** S2 Thêm bệnh `/admin/catalog/diseases/new?classCode=` (design/screens/catalog.md). */
export default function Page() {
  return (
    <AdminPageShell title={T.ADD_DISEASE} backHref={ROUTES.catalog}>
      <Suspense fallback={<FormSkeleton />}>
        <NewDiseaseView />
      </Suspense>
    </AdminPageShell>
  )
}

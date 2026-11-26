import { Suspense } from "react"
import type { Metadata } from "next"

import { EditDiseaseView, FormSkeleton } from "@/components/catalog/form-views"
import { AdminPageShell } from "@/components/layout/page-shells"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: T.EDIT_DISEASE }

/** S2 Sửa bệnh `/admin/catalog/diseases/edit?id=` (design/screens/catalog.md). */
export default function Page() {
  return (
    <AdminPageShell title={T.EDIT_DISEASE} backHref={ROUTES.catalog}>
      <Suspense fallback={<FormSkeleton />}>
        <EditDiseaseView />
      </Suspense>
    </AdminPageShell>
  )
}

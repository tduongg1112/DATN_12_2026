import { Suspense } from "react"
import type { Metadata } from "next"

import { EditCropView, FormSkeleton } from "@/components/catalog/form-views"
import { AdminPageShell } from "@/components/layout/page-shells"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: T.EDIT_CROP }

/** S5 Sửa loại cây `/admin/catalog/crops/edit?id=` (design/screens/catalog.md). */
export default function Page() {
  return (
    <AdminPageShell title={T.EDIT_CROP} backHref={ROUTES.catalogCrops}>
      <Suspense fallback={<FormSkeleton />}>
        <EditCropView />
      </Suspense>
    </AdminPageShell>
  )
}

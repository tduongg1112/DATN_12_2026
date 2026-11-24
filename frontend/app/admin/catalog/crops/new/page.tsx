import type { Metadata } from "next"

import { CropForm } from "@/components/catalog/crop-form"
import { AdminPageShell } from "@/components/layout/page-shells"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: T.ADD_CROP }

/** S5 Thêm loại cây `/admin/catalog/crops/new` (design/screens/catalog.md). */
export default function Page() {
  return (
    <AdminPageShell title={T.ADD_CROP} backHref={ROUTES.catalogCrops}>
      <CropForm crop={null} />
    </AdminPageShell>
  )
}

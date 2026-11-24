import type { Metadata } from "next"

import { CatalogNav } from "@/components/catalog/catalog-nav"
import { CropListView } from "@/components/catalog/crop-list-view"
import { AddCropAction } from "@/components/catalog/header-actions"
import { AdminPageShell } from "@/components/layout/page-shells"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"

export const metadata: Metadata = { title: T.CROPS }

/** S4 Danh mục loại cây `/admin/catalog/crops` (C4 1d → 3d). */
export default function Page() {
  return (
    <AdminPageShell title={T.CROPS} actions={<AddCropAction />}>
      <div className="grid gap-4 lg:gap-5">
        <CatalogNav />
        <CropListView />
      </div>
    </AdminPageShell>
  )
}

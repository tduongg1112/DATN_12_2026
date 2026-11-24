import type { Metadata } from "next"

import { CatalogNav } from "@/components/catalog/catalog-nav"
import { DiseaseListView } from "@/components/catalog/disease-list-view"
import { AddDiseaseAction } from "@/components/catalog/header-actions"
import { AdminPageShell } from "@/components/layout/page-shells"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"

export const metadata: Metadata = { title: T.DISEASES }

/** S1 Danh mục bệnh `/admin/catalog` (UC06), khuôn "Quản trị" (design/screens/catalog.md). */
export default function Page() {
  return (
    <AdminPageShell title={T.DISEASES} actions={<AddDiseaseAction />}>
      <div className="grid gap-4 lg:gap-5">
        <CatalogNav />
        <DiseaseListView />
      </div>
    </AdminPageShell>
  )
}

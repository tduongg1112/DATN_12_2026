import type { Metadata } from "next"

import { CatalogNav } from "@/components/catalog/catalog-nav"
import { LabelsView } from "@/components/catalog/labels-view"
import { AdminPageShell } from "@/components/layout/page-shells"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"

export const metadata: Metadata = { title: T.LABELS }

/** S6 Nhãn mô hình `/admin/catalog/labels` (US-07; OQ-59). */
export default function Page() {
  return (
    <AdminPageShell title={T.LABELS}>
      <div className="grid gap-4 lg:gap-5">
        <CatalogNav />
        <LabelsView />
      </div>
    </AdminPageShell>
  )
}

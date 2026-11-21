import type { Metadata } from "next"
import { Construction } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState } from "@/components/ds/states"
import { AdminPageShell } from "@/components/layout/page-shells"

export const metadata: Metadata = { title: "Danh mục" }

/** Trang tạm, khuôn "Quản trị". Nghiệp vụ làm ở feature catalog. */
export default function Page() {
  return (
    <AdminPageShell title="Danh mục">
      <Card>
        <EmptyState icon={Construction} message="Trang đang được xây dựng." />
      </Card>
    </AdminPageShell>
  )
}

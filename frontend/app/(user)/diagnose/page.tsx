import type { Metadata } from "next"
import { Construction } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState } from "@/components/ds/states"
import { UserPageShell } from "@/components/layout/page-shells"

export const metadata: Metadata = { title: "Chẩn đoán" }

/** Trang tạm, khuôn "Chi tiết (màn chụp ảnh làm ở diagnosis)". Nghiệp vụ làm ở feature diagnosis. */
export default function Page() {
  return (
    <UserPageShell layout="detail" title="Chẩn đoán" backHref="/">
      <Card notch>
        <EmptyState icon={Construction} message="Trang đang được xây dựng." />
      </Card>
    </UserPageShell>
  )
}

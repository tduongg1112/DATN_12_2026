import type { Metadata } from "next"
import { Construction } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState } from "@/components/ds/states"
import { UserPageShell } from "@/components/layout/page-shells"

export const metadata: Metadata = { title: "Cây trồng của tôi" }

/** Trang tạm, khuôn "Danh sách". Nghiệp vụ làm ở feature my_plants. */
export default function Page() {
  return (
    <UserPageShell layout="list" title="Cây trồng của tôi">
      <Card notch>
        <EmptyState icon={Construction} message="Trang đang được xây dựng." />
      </Card>
    </UserPageShell>
  )
}

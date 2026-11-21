import type { Metadata } from "next"
import { Construction } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { EmptyState } from "@/components/ds/states"
import { UserPageShell } from "@/components/layout/page-shells"

export const metadata: Metadata = { title: "Trang chủ" }

/** Trang tạm, khuôn "Trung tâm". Nghiệp vụ làm ở feature disease_library. */
export default function Page() {
  return (
    <UserPageShell layout="hero">
      <Card notch>
        <EmptyState icon={Construction} message="Trang đang được xây dựng." />
      </Card>
    </UserPageShell>
  )
}

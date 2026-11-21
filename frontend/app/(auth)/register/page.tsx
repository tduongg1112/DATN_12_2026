import { Suspense } from "react"
import type { Metadata } from "next"

import { RegisterView } from "@/components/auth/register-view"
import { PageSkeleton } from "@/components/ds/states"

export const metadata: Metadata = { title: "Tạo tài khoản" }

/** S2 (design/screens/auth.md). Đọc `?next=` nên bọc Suspense (Next 16). */
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="Đang tải" />}>
      <RegisterView />
    </Suspense>
  )
}

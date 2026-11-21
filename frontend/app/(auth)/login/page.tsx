import { Suspense } from "react"
import type { Metadata } from "next"

import { LoginView } from "@/components/auth/login-view"
import { PageSkeleton } from "@/components/ds/states"

export const metadata: Metadata = { title: "Đăng nhập" }

/** S1 (design/screens/auth.md). Đọc `?next=`, `?error=` nên bọc Suspense (Next 16). */
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="Đang tải" />}>
      <LoginView />
    </Suspense>
  )
}

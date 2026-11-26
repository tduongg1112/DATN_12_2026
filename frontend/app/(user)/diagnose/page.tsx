import { Suspense } from "react"
import type { Metadata } from "next"

import { PageSkeleton } from "@/components/ds/states"
import { DiagnoseFlow } from "@/components/diagnosis/diagnose-flow"
import { UserPageShell } from "@/components/layout/page-shells"
import { DIAGNOSIS_TEXT } from "@/lib/diagnosis/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: DIAGNOSIS_TEXT.PAGE_TITLE }

/**
 * Chẩn đoán `/diagnose` (UC02), khuôn "Chi tiết" (design/screens/diagnosis.md S1 → S4).
 * `?cropId=` chọn sẵn loại cây, đọc bằng `useSearchParams` nên bọc `<Suspense>`.
 */
export default function Page() {
  return (
    <UserPageShell
      layout="detail"
      title={DIAGNOSIS_TEXT.PAGE_TITLE}
      backHref={ROUTES.home}
    >
      <Suspense fallback={<PageSkeleton />}>
        <DiagnoseFlow />
      </Suspense>
    </UserPageShell>
  )
}

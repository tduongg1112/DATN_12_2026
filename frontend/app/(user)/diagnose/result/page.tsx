import { Suspense } from "react"
import type { Metadata } from "next"

import {
  DiagnosisResultSkeleton,
  DiagnosisResultView,
} from "@/components/diagnosis/diagnosis-result-view"
import { UserPageShell } from "@/components/layout/page-shells"
import { DIAGNOSIS_TEXT } from "@/lib/diagnosis/text"
import { ROUTES } from "@/lib/navigation"

export const metadata: Metadata = { title: DIAGNOSIS_TEXT.RESULT_TITLE }

/**
 * S5 Kết quả `/diagnose/result?id=…` (design/screens/diagnosis.md). Query string thay cho
 * `[id]` để build được bản tĩnh (fe-coding-rules mục 3). Nút quay lại về trang trước trong
 * app; mở thẳng bằng đường dẫn thì về `/diagnose`.
 */
export default function Page() {
  return (
    <UserPageShell
      layout="detail"
      title={DIAGNOSIS_TEXT.RESULT_TITLE}
      backHref={ROUTES.diagnose}
      backBehavior="history"
    >
      <Suspense fallback={<DiagnosisResultSkeleton />}>
        <DiagnosisResultView />
      </Suspense>
    </UserPageShell>
  )
}

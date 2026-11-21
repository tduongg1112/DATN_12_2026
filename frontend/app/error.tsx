"use client"

import { ErrorState } from "@/components/ds/states"
import { CLIENT_ERRORS } from "@/lib/api"

/** Lỗi không lường trước khi hiển thị trang: giữ khung, cho thử lại (design/07). */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-dvh bg-page px-[var(--gutter-mobile)] py-5 lg:px-8">
      <ErrorState message={CLIENT_ERRORS.INTERNAL_ERROR} onRetry={reset} />
    </main>
  )
}

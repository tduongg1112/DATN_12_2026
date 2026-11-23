"use client"

import * as React from "react"

import { Card } from "@/components/ds/card-stack"
import { ProgressMeter } from "@/components/ds/confidence-meter"
import { Button } from "@/components/ui/button"
import { DIAGNOSIS_TEXT as T } from "@/lib/diagnosis/text"

/** Quá 10 giây thì thêm câu trấn an và nút huỷ (design/07). */
const SLOW_AFTER_MS = 10_000

/**
 * S4 Đang phân tích (BR-07, BR-08): thước sọc chạy, không hiện phần trăm giả. Gắn `key`
 * mới cho mỗi lần gửi để đếm lại 10 giây.
 */
export function AnalyzingPanel({ onCancel }: { onCancel: () => void }) {
  const [slow, setSlow] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Card notch className="grid gap-4" aria-live="polite">
      <ProgressMeter label={T.ANALYZING} />
      <p className="m-0 type-title">{T.ANALYZING}</p>
      {slow && (
        <>
          <p className="m-0 text-ink-secondary type-body">{T.ANALYZING_SLOW}</p>
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={onCancel}
          >
            {T.CANCEL}
          </Button>
        </>
      )}
    </Card>
  )
}

/**
 * S4 lỗi (BR-08, BR-10, BR-11; TD-26): card lỗi ngay chỗ trạng thái, ảnh vẫn giữ. Lỗi
 * tạm thời (AI bận, mất mạng) có "Thử lại" gửi lại đúng ảnh cũ; lỗi do ảnh chỉ có
 * "Chụp lại".
 */
export function AnalysisErrorPanel({
  message,
  onRetry,
  onRetake,
}: {
  message: string
  /** Không có: lỗi do ảnh, nút chính là "Chụp lại". */
  onRetry?: () => void
  onRetake: () => void
}) {
  return (
    <Card notch role="alert" className="grid gap-4">
      <p className="m-0 type-body-lg">{message}</p>
      <div className="grid gap-2 sm:flex">
        {onRetry ? (
          <>
            <Button onClick={onRetry}>{T.RETRY}</Button>
            <Button variant="secondary" onClick={onRetake}>
              {T.RETAKE}
            </Button>
          </>
        ) : (
          <Button onClick={onRetake}>{T.RETAKE}</Button>
        )}
      </div>
    </Card>
  )
}

import { StatusPill } from "@/components/ds/health-status"
import { RESULT_STATUS_DISPLAY } from "@/lib/diagnosis/text"
import type { ResultType } from "@/lib/types/diagnosis"

/** Dạng kết quả chẩn đoán bằng cả màu lẫn chữ (Bảng 4.4; tông theo OQ-40). */
export function ResultStatus({
  resultType,
  className,
}: {
  resultType: ResultType
  className?: string
}) {
  const { label, tone } = RESULT_STATUS_DISPLAY[resultType]
  return (
    <StatusPill tone={tone} className={className}>
      {label}
    </StatusPill>
  )
}

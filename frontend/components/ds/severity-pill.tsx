import { StatusPill } from "@/components/ds/health-status"
import { SEVERITY_DISPLAY } from "@/lib/library/text"
import type { Severity } from "@/lib/types/domain"

/**
 * Mức độ nguy hại của bệnh bằng cả màu lẫn chữ (disease_library specs mục 5; design/01).
 * Chữ và tông theo OQ-38.
 */
export function SeverityPill({
  severity,
  className,
}: {
  severity: Severity
  className?: string
}) {
  const { label, tone } = SEVERITY_DISPLAY[severity]
  return (
    <StatusPill tone={tone} className={className}>
      {label}
    </StatusPill>
  )
}

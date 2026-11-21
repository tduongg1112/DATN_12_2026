import type { HealthStatus as HealthStatusValue } from "@/lib/types/domain"
import { cn } from "@/lib/utils"

export type StatusTone = "healthy" | "watch" | "severe" | "info"

/** Viên trạng thái có chấm (design/05 `.status`). Luôn có chữ, không chỉ dùng màu. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("status", `status--${tone}`, className)}>
      {children}
    </span>
  )
}

/**
 * Tình trạng sức khoẻ cây theo Bảng 4.8 (C4). Chữ dùng đúng tên trong bảng.
 * Màu theo cột "Dùng khi" của design/01 (Dương chốt 21/11).
 */
export const HEALTH_STATUS_DISPLAY: Record<
  HealthStatusValue,
  { label: string; tone: StatusTone }
> = {
  NOT_DIAGNOSED: { label: "Chưa chẩn đoán", tone: "info" },
  HEALTHY: { label: "Khoẻ mạnh", tone: "healthy" },
  DISEASED: { label: "Đang có bệnh", tone: "severe" },
  TREATING: { label: "Đang điều trị", tone: "watch" },
  RECOVERED: { label: "Đã khỏi", tone: "healthy" },
}

export function HealthStatus({
  status,
  className,
}: {
  status: HealthStatusValue
  className?: string
}) {
  const { label, tone } = HEALTH_STATUS_DISPLAY[status]
  return (
    <StatusPill tone={tone} className={className}>
      {label}
    </StatusPill>
  )
}

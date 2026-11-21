import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type IconTone = "accent" | "neutral" | "warm" | "severe"

interface StatRowProps {
  icon: LucideIcon
  title: string
  sub?: string
  value?: string | number
  unit?: string
  /** accent: đang hoạt động; neutral: không hoạt động (design/05). */
  tone?: IconTone
  className?: string
}

/** Hàng thống kê (design/05): icon tròn 60 · tiêu đề + dòng phụ · số lớn mảnh + đơn vị bé. */
export function StatRow({
  icon: Icon,
  title,
  sub,
  value,
  unit,
  tone = "accent",
  className,
}: StatRowProps) {
  return (
    <div className={cn("stat-row", className)}>
      <span
        className={cn("icon-tile", tone !== "accent" && `icon-tile--${tone}`)}
        aria-hidden
      >
        <Icon size={24} />
      </span>
      <div className="stat-row__text">
        <p className="stat-row__title">{title}</p>
        {sub && <p className="stat-row__sub">{sub}</p>}
      </div>
      {value !== undefined && (
        <span className="stat-row__value">
          {value}
          {unit && <span className="unit">{unit}</span>}
        </span>
      )}
    </div>
  )
}

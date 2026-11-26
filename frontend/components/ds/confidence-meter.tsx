import { cn } from "@/lib/utils"

/**
 * Thước độ tin cậy (design/05 `.meter`): sọc chéo, độ dài theo xác suất, luôn có số `%`
 * đi kèm.
 */
export function ConfidenceMeter({
  value,
  label,
  className,
}: {
  /** Xác suất 0–1. */
  value: number
  /** Tên cho trình đọc màn hình, vd "Độ tin cậy". */
  label: string
  className?: string
}) {
  const percent = Math.round(value * 100)
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        className="meter min-w-0 flex-1"
        style={{ "--value": value } as React.CSSProperties}
      />
      <span className="w-14 shrink-0 text-right type-num-md" aria-hidden>
        {percent}%
      </span>
    </div>
  )
}

/**
 * Thước sọc chạy chậm khi chưa biết tiến độ (design/07 "Trạng thái phân tích ảnh"): không
 * hiện phần trăm giả. Người dùng bật giảm chuyển động thì sọc đứng yên.
 */
export function ProgressMeter({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className={cn("meter meter--running", className)}
    >
      <span className="meter__run" aria-hidden />
    </div>
  )
}

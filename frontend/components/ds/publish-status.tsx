import { StatusPill } from "@/components/ds/health-status"
import { CROP_STATUS_DISPLAY, PUBLISH_STATUS_DISPLAY } from "@/lib/catalog/text"
import type { CropStatus, PublishStatus } from "@/lib/types/catalog"

/** Trạng thái bệnh (Nháp, Công khai, Ẩn) bằng cả màu lẫn chữ (design/screens/catalog.md). */
export function PublishStatusPill({
  status,
  className,
}: {
  status: PublishStatus
  className?: string
}) {
  const { label, tone } = PUBLISH_STATUS_DISPLAY[status]
  return (
    <StatusPill tone={tone} className={className}>
      {label}
    </StatusPill>
  )
}

/** Trạng thái loại cây (Hiển thị, Ẩn). */
export function CropStatusPill({
  status,
  className,
}: {
  status: CropStatus
  className?: string
}) {
  const { label, tone } = CROP_STATUS_DISPLAY[status]
  return (
    <StatusPill tone={tone} className={className}>
      {label}
    </StatusPill>
  )
}

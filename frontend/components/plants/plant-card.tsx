import Link from "next/link"

import { CoverImage } from "@/components/ds/cover-image"
import { HealthStatus } from "@/components/ds/health-status"
import { plantDetailHref } from "@/lib/navigation"
import { formatDate, PLANTS_TEXT as T } from "@/lib/plants/text"
import type { PlantCard as PlantCardData } from "@/lib/types/plants"

/**
 * Thẻ cây (design/05 "Thẻ cây"; BR-01): ảnh 84 × 104 bo 16, tình trạng có cả màu lẫn chữ,
 * tên, loại cây · ngày chẩn đoán gần nhất. Không có `.scrubber` (chưa có số liệu tiến độ).
 */
export function PlantCard({ plant }: { plant: PlantCardData }) {
  const sub = [
    plant.crop.name,
    plant.lastDiagnosedAt &&
      T.LAST_DIAGNOSED(formatDate(plant.lastDiagnosedAt)),
  ].filter(Boolean)

  return (
    <Link
      href={plantDetailHref(plant.id)}
      className="card flex h-full items-center gap-4 outline-none hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:p-5"
    >
      <CoverImage
        src={plant.avatarUrl}
        alt=""
        iconSize={28}
        className="h-[104px] w-[84px] shrink-0 rounded-md"
      />
      <span className="grid min-w-0 gap-2">
        <HealthStatus
          status={plant.healthStatus}
          className="justify-self-start"
        />
        <span className="truncate type-title">{plant.name}</span>
        <span className="text-ink-secondary type-caption">
          {sub.join(" · ")}
        </span>
      </span>
    </Link>
  )
}

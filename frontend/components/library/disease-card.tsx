import Link from "next/link"

import { CoverImage } from "@/components/ds/cover-image"
import { SeverityPill } from "@/components/ds/severity-pill"
import { LIBRARY_TEXT } from "@/lib/library/text"
import { diseaseDetailHref } from "@/lib/navigation"
import type { DiseaseCard as DiseaseCardData } from "@/lib/types/library"
import { cn } from "@/lib/utils"

type Variant = "feature" | "row" | "tile"

interface DiseaseCardProps {
  disease: DiseaseCardData
  /**
   * feature: ảnh lớn 16:10 (thẻ đầu trang chủ). row: ảnh 84 × 84 bên trái (danh sách gọn).
   * tile: như row dưới 640, từ 640 thành ô lưới có ảnh 4:3 phía trên.
   */
  variant: Variant
  className?: string
}

/** Nhãn "Đang phổ biến" (BR-04): `.tag` đè góc trên trái ảnh. */
function TrendingTag({ className }: { className?: string }) {
  return (
    <span className={cn("tag absolute top-3 left-3", className)}>
      {LIBRARY_TEXT.TRENDING}
    </span>
  )
}

/**
 * Thẻ tin bệnh (BR-02: ảnh, tên bệnh, loại cây, mô tả ngắn). Cả thẻ là một liên kết tới
 * trang chi tiết (design/screens/disease_library.md, thành phần `DiseaseCard`).
 */
export function DiseaseCard({ disease, variant, className }: DiseaseCardProps) {
  const href = diseaseDetailHref(disease.id)

  if (variant === "feature") {
    return (
      <Link href={href} className={cn("grid gap-4 rounded-xl", className)}>
        <CoverImage
          src={disease.coverImageUrl}
          alt={disease.name}
          iconSize={48}
          className="aspect-[16/10]"
        >
          {disease.trending && <TrendingTag />}
        </CoverImage>
        <div className="grid justify-items-start gap-2">
          <SeverityPill severity={disease.severity} />
          <h3 className="m-0 type-h3">{disease.name}</h3>
          <p className="m-0 text-ink-secondary type-caption">
            {disease.crop.name}
          </p>
          {disease.summary && (
            <p className="m-0 line-clamp-3 type-body">{disease.summary}</p>
          )}
        </div>
      </Link>
    )
  }

  const tile = variant === "tile"
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full items-start gap-4 rounded-md",
        tile && "sm:flex-col sm:items-stretch sm:gap-3 sm:rounded-xl",
        className
      )}
    >
      <CoverImage
        src={disease.coverImageUrl}
        alt={disease.name}
        iconSize={24}
        className={cn(
          "size-21 shrink-0 rounded-md",
          tile && "sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-xl"
        )}
      >
        {tile && disease.trending && <TrendingTag className="hidden sm:flex" />}
      </CoverImage>
      <div className="grid min-w-0 justify-items-start gap-1.5">
        <h3 className="m-0 line-clamp-2 type-title">{disease.name}</h3>
        <p className="m-0 flex flex-wrap items-center gap-2 text-ink-secondary type-caption">
          <span>{disease.crop.name}</span>
          {disease.trending && (
            <span className={cn("tag", tile && "sm:hidden")}>
              {LIBRARY_TEXT.TRENDING}
            </span>
          )}
        </p>
        {disease.summary && (
          <p className="m-0 line-clamp-2 text-ink-secondary type-body-sm">
            {disease.summary}
          </p>
        )}
        {tile && <SeverityPill severity={disease.severity} className="mt-1" />}
      </div>
    </Link>
  )
}

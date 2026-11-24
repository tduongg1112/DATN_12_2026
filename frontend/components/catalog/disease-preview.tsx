"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { DiseaseDetailContent } from "@/components/library/disease-detail-view"
import { useApiRequest } from "@/hooks/use-api-request"
import { catalogApi } from "@/lib/api/catalog"
import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import type { PathogenGroup, Severity } from "@/lib/types/domain"
import type { CropSummary, DiseaseDetail } from "@/lib/types/library"

export interface PreviewSource {
  id: number | null
  crop: CropSummary
  name: string
  pathogen: string
  pathogenGroup: PathogenGroup
  severity: Severity
  summary: string
  symptoms: string
  causes: string
  prevention: string
  treatment: string
  images: { url: string; caption: string }[]
  /** Bệnh đang công khai thì không hiện dải "Bản xem trước". */
  published: boolean
}

const textOrNull = (value: string) => value.trim() || null

/**
 * S3 Xem trước (US-04, BR-07; OQ-58): lớp phủ toàn màn dựng trang chi tiết bệnh của người
 * dùng từ **nội dung đang nhập** (chưa lưu), bằng chính `DiseaseDetailContent`. "Các bệnh
 * liên quan" lấy từ B7 theo loại cây và nhóm tác nhân đang chọn; lỗi thì ẩn phần đó.
 */
export function DiseasePreview({
  open,
  onOpenChange,
  source,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: PreviewSource
}) {
  const related = useApiRequest(
    open
      ? `related|${source.crop.id}|${source.pathogenGroup}|${source.id ?? 0}`
      : null,
    (signal) =>
      catalogApi.related(
        {
          cropId: source.crop.id,
          pathogenGroup: source.pathogenGroup,
          excludeId: source.id ?? undefined,
        },
        signal
      )
  )

  const disease: DiseaseDetail = {
    id: source.id ?? 0,
    name: source.name.trim(),
    pathogen: textOrNull(source.pathogen),
    pathogenGroup: source.pathogenGroup,
    crop: source.crop,
    severity: source.severity,
    summary: textOrNull(source.summary),
    symptoms: textOrNull(source.symptoms),
    causes: textOrNull(source.causes),
    prevention: textOrNull(source.prevention),
    treatment: textOrNull(source.treatment),
    images: source.images.map((img) => ({
      url: img.url,
      caption: textOrNull(img.caption),
    })),
    related: related.error ? [] : (related.data ?? []),
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-[var(--z-sheet)] overflow-y-auto bg-[var(--neutral-150)] outline-none [--seam-bg:var(--neutral-150)]">
          <div className="mx-auto w-full max-w-[var(--container-max)] px-[var(--gutter-mobile)] pb-10 lg:px-8">
            <div className="flex items-center gap-3 py-4">
              <Dialog.Close className="icon-btn" aria-label={T.CLOSE_PREVIEW}>
                <X size={24} aria-hidden />
              </Dialog.Close>
              <Dialog.Title className="m-0 type-h3">{T.PREVIEW}</Dialog.Title>
            </div>
            {!source.published && (
              <p className="m-0 mb-4 rounded-md bg-[var(--status-info-bg)] px-4 py-3 text-[var(--status-info-fg)] type-body-sm">
                {T.PREVIEW_NOTE}
              </p>
            )}
            <DiseaseDetailContent disease={disease} preview />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

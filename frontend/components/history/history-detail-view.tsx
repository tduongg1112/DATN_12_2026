"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { History } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { CoverImage } from "@/components/ds/cover-image"
import { ResultStatus } from "@/components/ds/result-status"
import { EmptyState, ErrorState } from "@/components/ds/states"
import {
  ResultActions,
  ResultCards,
  resultLinks,
  ResultSkeleton,
} from "@/components/diagnosis/result-cards"
import { useApiRequest } from "@/hooks/use-api-request"
import { diagnosesApi } from "@/lib/api/diagnoses"
import { DIAGNOSIS_TEXT, formatDiagnosisTime } from "@/lib/diagnosis/text"
import { HISTORY_TEXT as T } from "@/lib/history/text"
import { PATHOGEN_GROUP_LABEL } from "@/lib/library/text"
import { parsePositiveId, ROUTES } from "@/lib/navigation"
import type { DiagnosisResult } from "@/lib/types/diagnosis"
import { cn } from "@/lib/utils"

import { SaveToPlant } from "../plants/save-to-plant"

/**
 * S2 Chi tiết lần tra cứu `/history/detail?id=` (US-03, US-05; BR-04, 05, 07). Dữ liệu từ D2;
 * khối kết quả dùng chung với màn kết quả chẩn đoán. Đọc `useSearchParams` nên trang phải
 * bọc `<Suspense>`.
 */
export function HistoryDetailView() {
  const searchParams = useSearchParams()
  const id = parsePositiveId(searchParams.get("id"))
  const request = useApiRequest(
    id === null ? null : `diagnosis:${id}`,
    (signal) => diagnosesApi.get(id ?? 0, signal)
  )
  const data = request.data?.id === id ? request.data : undefined

  // Id sai, lượt đã xoá hoặc của người khác đều là không tìm thấy (OQ-29).
  if (
    id === null ||
    request.error?.status === 404 ||
    request.error?.status === 400
  ) {
    return (
      <Card>
        <EmptyState
          icon={History}
          message={DIAGNOSIS_TEXT.NOT_FOUND}
          action={{ label: T.BACK_TO_HISTORY, href: ROUTES.history }}
        />
      </Card>
    )
  }
  if (request.error) {
    return (
      <ErrorState message={request.error.message} onRetry={request.reload} />
    )
  }
  if (!data) return <ResultSkeleton />
  return <DetailContent key={data.id} result={data} />
}

function DetailContent({ result }: { result: DiagnosisResult }) {
  const disease = result.predictions[0]?.disease ?? null
  const rows: { term: string; value: string }[] = [
    { term: T.CROP, value: result.crop.name },
    ...(result.plant ? [{ term: T.PLANT, value: result.plant.name }] : []),
    { term: T.TIME, value: formatDiagnosisTime(result.createdAt) },
    ...(result.resultType === "DISEASE" && disease
      ? [
          {
            term: T.PATHOGEN_GROUP,
            value: PATHOGEN_GROUP_LABEL[disease.pathogenGroup],
          },
        ]
      : []),
  ]

  return (
    // Mobile: chừa chỗ cho nút chính dính đáy trên dock.
    <div className="grid gap-2 pb-[calc(var(--ctl-md)+var(--s-3))] lg:grid-cols-12 lg:items-start lg:gap-5 lg:pb-0">
      <div className="grid gap-3 lg:sticky lg:top-5 lg:col-span-5">
        <PhotoSwitcher result={result} />
        <Card>
          <dl className="m-0 grid">
            {rows.map((row) => (
              <div
                key={row.term}
                className="flex items-center justify-between gap-3 border-t border-dashed border-line py-3 first:border-0 first:pt-0 last:pb-0"
              >
                <dt className="text-ink-secondary type-body-sm">{row.term}</dt>
                <dd className="m-0 text-right type-title">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid min-w-0 gap-2 lg:col-span-7 lg:gap-5">
        <ResultCards result={result} />
        <p className="m-0 px-2 text-ink-secondary type-caption">
          {DIAGNOSIS_TEXT.DISCLAIMER}
        </p>
        <ResultActions
          {...resultLinks(result, DIAGNOSIS_TEXT.DIAGNOSE_AGAIN)}
        />
        <SaveToPlant result={result} />
      </div>
    </div>
  )
}

/** Ảnh đã chỉnh (mặc định) và ảnh gốc, đổi qua lại bằng hai ảnh nhỏ (Bảng 4.6 CT). */
function PhotoSwitcher({ result }: { result: DiagnosisResult }) {
  const photos = [
    { label: T.PROCESSED_IMAGE, url: result.processedImageUrl },
    { label: T.ORIGINAL_IMAGE, url: result.originalImageUrl },
  ]
  const [index, setIndex] = React.useState(0)
  const current = photos[index]

  return (
    <div className="grid gap-2">
      <CoverImage
        src={current.url}
        alt={current.label}
        iconSize={56}
        className="aspect-square"
      >
        <div className="photo-card__overlay">
          <ResultStatus resultType={result.resultType} />
        </div>
      </CoverImage>
      <div className="flex gap-2">
        {photos.map((photo, i) => (
          <button
            key={photo.label}
            type="button"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "flex items-center gap-2 rounded-full border-2 border-transparent bg-surface p-1 pr-4 outline-none type-label focus-visible:ring-3 focus-visible:ring-ring/50",
              i === index && "border-inverse"
            )}
          >
            <CoverImage
              src={photo.url}
              alt=""
              iconSize={16}
              className="size-10 rounded-full"
            />
            {photo.label}
          </button>
        ))}
      </div>
    </div>
  )
}

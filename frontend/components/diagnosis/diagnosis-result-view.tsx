"use client"

import { useSearchParams } from "next/navigation"
import { ScanSearch } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { CoverImage } from "@/components/ds/cover-image"
import { ResultStatus } from "@/components/ds/result-status"
import { EmptyState, ErrorState } from "@/components/ds/states"
import { useApiRequest } from "@/hooks/use-api-request"
import { diagnosesApi } from "@/lib/api/diagnoses"
import { rememberedResult } from "@/lib/diagnosis/result-cache"
import { DIAGNOSIS_TEXT as T, formatDiagnosisTime } from "@/lib/diagnosis/text"
import { parsePositiveId, ROUTES } from "@/lib/navigation"
import type { DiagnosisResult } from "@/lib/types/diagnosis"

import {
  ResultActions,
  ResultCards,
  resultLinks,
  ResultSkeleton,
} from "./result-cards"

/**
 * S5 Kết quả `/diagnose/result?id=` (US-05, US-08; BR-12, 14 → 21). Vừa chẩn đoán xong thì
 * dùng kết quả D1 đang giữ trong bộ nhớ; mở lại hoặc tải lại trang thì gọi D2.
 */
export function DiagnosisResultView() {
  const searchParams = useSearchParams()
  const id = parsePositiveId(searchParams.get("id"))
  const remembered = id === null ? undefined : rememberedResult(id)
  const request = useApiRequest(
    id === null || remembered ? null : `diagnosis:${id}`,
    (signal) => diagnosesApi.get(id ?? 0, signal)
  )
  const data =
    remembered ?? (request.data?.id === id ? request.data : undefined)

  // Thiếu id, id sai, lượt của người khác hoặc chưa hoàn tất đều là không tìm thấy (OQ-29).
  if (
    id === null ||
    request.error?.status === 404 ||
    request.error?.status === 400
  ) {
    return (
      <Card>
        <EmptyState
          icon={ScanSearch}
          message={T.NOT_FOUND}
          action={{ label: T.GO_DIAGNOSE, href: ROUTES.diagnose }}
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
  return <ResultContent key={data.id} result={data} />
}

function ResultContent({ result }: { result: DiagnosisResult }) {
  return (
    // Mobile: chừa chỗ cho nút chính dính đáy trên dock.
    <div className="grid gap-2 pb-[calc(var(--ctl-md)+var(--s-3))] lg:grid-cols-12 lg:items-start lg:gap-5 lg:pb-0">
      <div className="grid gap-3 lg:sticky lg:top-5 lg:col-span-5">
        <CoverImage
          src={result.processedImageUrl}
          alt={T.RESULT_IMAGE}
          iconSize={56}
          className="aspect-square"
        >
          <div className="photo-card__overlay">
            <ResultStatus resultType={result.resultType} />
          </div>
        </CoverImage>
        <p className="m-0 px-2 text-ink-secondary type-body-sm">
          {result.crop.name} · {formatDiagnosisTime(result.createdAt)}
        </p>
      </div>

      <div className="grid min-w-0 gap-2 lg:col-span-7 lg:gap-5">
        <ResultCards result={result} />
        <div className="grid gap-1 px-2">
          <p className="m-0 text-ink-secondary type-caption">{T.DISCLAIMER}</p>
          <p className="m-0 text-ink-secondary type-caption">
            {T.SAVED_TO_HISTORY}
          </p>
        </div>
        <ResultActions {...resultLinks(result, T.RETAKE)} />
      </div>
    </div>
  )
}

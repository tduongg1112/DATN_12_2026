"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ScanSearch } from "lucide-react"

import { Card, CardStack } from "@/components/ds/card-stack"
import { ConfidenceMeter } from "@/components/ds/confidence-meter"
import { CoverImage } from "@/components/ds/cover-image"
import { ResultStatus } from "@/components/ds/result-status"
import { SeverityPill } from "@/components/ds/severity-pill"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { diagnosesApi } from "@/lib/api/diagnoses"
import { rememberedResult } from "@/lib/diagnosis/result-cache"
import {
  DIAGNOSIS_TEXT as T,
  formatDiagnosisTime,
  formatPercent,
  RETAKE_TIPS,
  textLines,
} from "@/lib/diagnosis/text"
import {
  diagnoseHref,
  diseaseDetailHref,
  parsePositiveId,
  ROUTES,
} from "@/lib/navigation"
import type {
  DiagnosisPrediction,
  DiagnosisResult,
} from "@/lib/types/diagnosis"

/** Hiện tối đa 4 dòng đầu của triệu chứng (design/screens/diagnosis.md S5). */
const SYMPTOM_LINES = 4

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
  if (!data) return <DiagnosisResultSkeleton />
  return <ResultContent key={data.id} result={data} />
}

function ResultContent({ result }: { result: DiagnosisResult }) {
  const [top, ...others] = result.predictions
  const disease = top?.disease ?? null
  const again = diagnoseHref(result.crop.id)

  let cards: React.ReactNode[]
  let primary: { label: string; href: string } | null
  let secondary: { label: string; href: string } | null = null

  if (result.resultType === "DISEASE" && top && disease) {
    const symptoms = textLines(disease.symptoms).slice(0, SYMPTOM_LINES)
    const treatment = textLines(disease.treatment)
    cards = [
      <Card key="main" className="grid gap-4">
        <div>
          <p className="m-0 text-ink-secondary type-body-sm">{T.LIKELY}</p>
          <h2 className="m-0 type-h2">{disease.name}</h2>
        </div>
        <SeverityPill
          severity={disease.severity}
          className="justify-self-start"
        />
        <Confidence probability={top.probability} />
        {disease.summary && <p className="m-0 type-body">{disease.summary}</p>}
      </Card>,
      symptoms.length > 0 && (
        <Card key="symptoms">
          <h3 className="m-0 mb-3 type-h3">{T.SYMPTOMS}</h3>
          <ul className="m-0 grid list-disc gap-2 pl-5 type-body">
            {symptoms.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </Card>
      ),
      treatment.length > 0 && (
        <Card key="treatment">
          <h3 className="m-0 mb-3 type-h3">{T.TREATMENT}</h3>
          <ol className="list">
            {treatment.map((line, i) => (
              <li key={i} className="list-row py-3">
                <span className="list-row__index">{i + 1}</span>
                <span className="list-row__main">{line}</span>
              </li>
            ))}
          </ol>
        </Card>
      ),
      others.length > 0 && (
        <PredictionsCard
          key="others"
          title={T.OTHER_POSSIBILITIES}
          items={others}
        />
      ),
    ]
    primary = disease.detailAvailable
      ? { label: T.VIEW_DISEASE, href: diseaseDetailHref(disease.id) }
      : null
    secondary = { label: T.DIAGNOSE_AGAIN, href: again }
  } else if (result.resultType === "HEALTHY" && top) {
    cards = [
      <Card key="main" className="grid gap-4">
        <h2 className="m-0 type-h2">{T.HEALTHY_TITLE}</h2>
        <Confidence probability={top.probability} />
      </Card>,
      result.crop.careGuide && (
        <Card key="care">
          <h3 className="m-0 mb-3 type-h3">{T.CARE_GUIDE}</h3>
          <p className="m-0 whitespace-pre-line type-body">
            {result.crop.careGuide}
          </p>
        </Card>
      ),
      others.length > 0 && (
        <PredictionsCard
          key="others"
          title={T.OTHER_POSSIBILITIES}
          items={others}
        />
      ),
    ]
    primary = { label: T.DIAGNOSE_AGAIN, href: again }
  } else {
    cards = [
      <Card key="main" className="grid gap-4">
        <h2 className="m-0 type-h2">{T.UNCERTAIN_TITLE}</h2>
        <ul className="list">
          {RETAKE_TIPS.map((tip) => (
            <li key={tip} className="list-row">
              {tip}
            </li>
          ))}
        </ul>
      </Card>,
      <PredictionsCard
        key="reference"
        title={T.REFERENCE_POSSIBILITIES}
        items={result.predictions}
        note={T.REFERENCE_ONLY}
      />,
    ]
    primary = { label: T.RETAKE, href: again }
  }

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
        <CardStack background="detail">{cards.filter(Boolean)}</CardStack>
        <div className="grid gap-1 px-2">
          <p className="m-0 text-ink-secondary type-caption">{T.DISCLAIMER}</p>
          <p className="m-0 text-ink-secondary type-caption">
            {T.SAVED_TO_HISTORY}
          </p>
        </div>
        <div className="grid gap-2 lg:flex">
          {primary && (
            <div className="fixed inset-x-[var(--gutter-mobile)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 lg:static">
              <Button
                className="w-full"
                nativeButton={false}
                render={<Link href={primary.href} />}
              >
                {primary.label}
              </Button>
            </div>
          )}
          {secondary && (
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href={secondary.href} />}
            >
              {secondary.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Confidence({ probability }: { probability: number }) {
  return (
    <div className="grid gap-2">
      <p className="m-0 type-label">{T.CONFIDENCE}</p>
      <ConfidenceMeter value={probability} label={T.CONFIDENCE} />
    </div>
  )
}

/** Danh sách dự đoán: tên bệnh hoặc "Cây khoẻ mạnh", kèm phần trăm. */
function PredictionsCard({
  title,
  items,
  note,
}: {
  title: string
  items: DiagnosisPrediction[]
  note?: string
}) {
  return (
    <Card>
      <h3 className="m-0 mb-3 type-h3">{title}</h3>
      <ul className="list">
        {items.map((p) => (
          <li key={p.rank} className="list-row">
            <span className="list-row__main">
              {p.disease?.name ?? T.HEALTHY_TITLE}
            </span>
            <span className="list-row__meta">
              {formatPercent(p.probability)}
            </span>
          </li>
        ))}
      </ul>
      {note && (
        <p className="m-0 mt-3 text-ink-secondary type-caption">{note}</p>
      )}
    </Card>
  )
}

/** Khung chờ D2: ảnh vuông và 2 card (design/screens/diagnosis.md S5). */
export function DiagnosisResultSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-5"
    >
      <span className="sr-only">Đang tải</span>
      <Skeleton className="aspect-square rounded-xl lg:col-span-5" />
      <div className="grid gap-2 lg:col-span-7 lg:gap-5">
        <Card className="grid gap-3">
          <Skeleton className="h-8 w-2/3 rounded-full" />
          <Skeleton className="h-[26px] w-full rounded-full" />
        </Card>
        <Card className="grid gap-3">
          <Skeleton className="h-6 w-1/3 rounded-full" />
          <Skeleton className="h-20 rounded-md" />
        </Card>
      </div>
    </div>
  )
}

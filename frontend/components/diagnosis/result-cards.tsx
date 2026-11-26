import * as React from "react"
import Link from "next/link"

import { Card, CardStack } from "@/components/ds/card-stack"
import { ConfidenceMeter } from "@/components/ds/confidence-meter"
import { SeverityPill } from "@/components/ds/severity-pill"
import { Skeleton } from "@/components/ds/states"
import { Button } from "@/components/ui/button"
import {
  DIAGNOSIS_TEXT as T,
  formatPercent,
  RETAKE_TIPS,
  textLines,
} from "@/lib/diagnosis/text"
import { diagnoseHref, diseaseDetailHref } from "@/lib/navigation"
import type {
  DiagnosisPrediction,
  DiagnosisResult,
} from "@/lib/types/diagnosis"

/** Hiện tối đa 4 dòng đầu của triệu chứng (design/screens/diagnosis.md S5). */
const SYMPTOM_LINES = 4

export interface ResultLink {
  label: string
  href: string
}

/**
 * Cụm card nội dung theo dạng kết quả (Bảng 4.4; design/screens/diagnosis.md S5). Dùng chung
 * cho màn kết quả chẩn đoán và chi tiết lịch sử tra cứu (design/screens/history.md S2).
 */
export function ResultCards({ result }: { result: DiagnosisResult }) {
  const [top, ...others] = result.predictions
  const disease = top?.disease ?? null
  const othersCard = others.length > 0 && (
    <PredictionsCard
      key="others"
      title={T.OTHER_POSSIBILITIES}
      items={others}
    />
  )

  let cards: React.ReactNode[]
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
      othersCard,
    ]
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
      othersCard,
    ]
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
  }

  return <CardStack background="detail">{cards.filter(Boolean)}</CardStack>
}

/**
 * Nút của màn kết quả. `DISEASE`: "Xem chi tiết bệnh" (khi mở được) + "Chẩn đoán lại".
 * Còn lại một nút chính: màn kết quả chẩn đoán dùng "Chụp lại" cho `UNCERTAIN` (C4 12d);
 * lịch sử dùng "Chẩn đoán lại" (C4 7c).
 */
export function resultLinks(
  result: DiagnosisResult,
  uncertainLabel: string
): { primary: ResultLink | null; secondary: ResultLink | null } {
  const again = diagnoseHref(result.crop.id)
  const disease = result.predictions[0]?.disease ?? null
  if (result.resultType === "DISEASE" && disease) {
    return {
      primary: disease.detailAvailable
        ? { label: T.VIEW_DISEASE, href: diseaseDetailHref(disease.id) }
        : null,
      secondary: { label: T.DIAGNOSE_AGAIN, href: again },
    }
  }
  return {
    primary: {
      label:
        result.resultType === "UNCERTAIN" ? uncertainLabel : T.DIAGNOSE_AGAIN,
      href: again,
    },
    secondary: null,
  }
}

/** Hàng nút; nút chính dính đáy trên dock ở mobile, không bị dock che. */
export function ResultActions({
  primary,
  secondary,
}: {
  primary: ResultLink | null
  secondary: ResultLink | null
}) {
  return (
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

/** Khung chờ: ảnh vuông và 2 card (design/screens/diagnosis.md S5, history.md S2). */
export function ResultSkeleton() {
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

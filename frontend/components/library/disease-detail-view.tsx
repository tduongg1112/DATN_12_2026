"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BookOpen } from "lucide-react"

import { Card, CardStack } from "@/components/ds/card-stack"
import { CoverImage } from "@/components/ds/cover-image"
import { SeverityPill } from "@/components/ds/severity-pill"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { libraryApi } from "@/lib/api/library"
import {
  DETAIL_SECTIONS,
  LIBRARY_TEXT,
  PATHOGEN_GROUP_LABEL,
} from "@/lib/library/text"
import { diagnoseHref, parsePositiveId, ROUTES } from "@/lib/navigation"
import type {
  DiseaseCard as DiseaseCardData,
  DiseaseDetail,
} from "@/lib/types/library"
import { cn } from "@/lib/utils"

import { DiseaseCard } from "./disease-card"

/**
 * S3 Chi tiết bệnh (US-03, US-04; BR-06, 07, 09). Dùng chung cho thư viện, kết quả chẩn
 * đoán và lịch sử. Đọc `?id=` bằng `useSearchParams` nên trang phải bọc `<Suspense>`.
 */
export function DiseaseDetailView() {
  const searchParams = useSearchParams()
  const id = parsePositiveId(searchParams.get("id"))
  const { data, error, loading, reload } = useApiRequest(
    id === null ? null : `disease:${id}`,
    (signal) => libraryApi.disease(id ?? 0, signal)
  )

  // Thiếu id, id sai, hoặc bệnh không còn công khai (BR-01) đều coi là không tìm thấy.
  if (id === null || error?.status === 404 || error?.status === 400) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          message={LIBRARY_TEXT.NOT_FOUND}
          action={{ label: LIBRARY_TEXT.SEE_ALL, href: ROUTES.library }}
        />
      </Card>
    )
  }
  if (error) return <ErrorState message={error.message} onRetry={reload} />
  if (loading || !data) return <DiseaseDetailSkeleton />
  return <DiseaseDetailContent key={data.id} disease={data} />
}

/**
 * Phần hiển thị của trang chi tiết bệnh. Dùng chung cho trang của người dùng và trang xem
 * trước của quản trị (catalog BR-07, OQ-58), nên xem trước đúng như người dùng sẽ thấy.
 * `preview`: nút và liên kết không bấm được, nút chính không dính đáy.
 */
export function DiseaseDetailContent({
  disease,
  preview = false,
}: {
  disease: DiseaseDetail
  preview?: boolean
}) {
  // Mục có giá trị null thì ẩn (design/screens/disease_library.md S3).
  const sections: { title: string; text: string | null }[] = [
    { title: DETAIL_SECTIONS.SYMPTOMS, text: disease.symptoms },
    { title: DETAIL_SECTIONS.CAUSES, text: disease.causes },
    { title: DETAIL_SECTIONS.PREVENTION, text: disease.prevention },
    { title: DETAIL_SECTIONS.TREATMENT, text: disease.treatment },
  ]
  const visibleSections = sections.filter((s) => s.text)
  const hasRelated = disease.related.length > 0

  return (
    // Mobile: chừa chỗ cho nút "Chẩn đoán cây của bạn" dính đáy.
    <div
      className={cn(
        "grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-5 lg:pb-0",
        !preview && "pb-[calc(var(--ctl-md)+var(--s-3))]"
      )}
    >
      <div className="grid min-w-0 gap-2 lg:col-span-8 lg:gap-5">
        <Gallery disease={disease} />
        <CardStack background="detail">
          <Card>
            <h2 className="m-0 type-h2">{disease.name}</h2>
            {disease.pathogen && (
              <p className="m-0 mt-1 text-ink-secondary type-body-sm">
                {DETAIL_SECTIONS.PATHOGEN}: <i>{disease.pathogen}</i>
              </p>
            )}
            {disease.summary && (
              <p className="m-0 mt-4 type-body">{disease.summary}</p>
            )}
            <InfoRows disease={disease} className="mt-5 lg:hidden" />
          </Card>
          {visibleSections.map((section) => (
            <Card key={section.title}>
              <h3 className="m-0 mb-3 type-h3">{section.title}</h3>
              <p className="m-0 whitespace-pre-line type-body">
                {section.text}
              </p>
            </Card>
          ))}
          {hasRelated && (
            <RelatedCard
              items={disease.related}
              inert={preview}
              className="lg:hidden"
            />
          )}
        </CardStack>
        <p className="m-0 px-2 text-ink-secondary type-caption">
          {LIBRARY_TEXT.DISCLAIMER}
        </p>
      </div>

      <aside className="contents lg:sticky lg:top-5 lg:col-span-4 lg:grid lg:gap-5">
        <Card className="hidden lg:block">
          <InfoRows disease={disease} />
        </Card>
        {/* BR-09. Mobile: dính đáy ngay trên dock, không bị dock che (design/06). */}
        <div
          inert={preview}
          className={cn(
            "lg:static",
            preview
              ? "static"
              : "fixed inset-x-[var(--gutter-mobile)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10"
          )}
        >
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href={diagnoseHref(disease.crop.id)} />}
          >
            {LIBRARY_TEXT.DIAGNOSE_YOUR_PLANT}
          </Button>
        </div>
        {hasRelated && (
          <RelatedCard
            items={disease.related}
            inert={preview}
            className="hidden lg:block"
          />
        )}
      </aside>
    </div>
  )
}

/** Ảnh bìa và dải ảnh nhỏ khi có từ 2 ảnh (BR-06, BR-08). */
function Gallery({ disease }: { disease: DiseaseDetail }) {
  const [index, setIndex] = React.useState(0)
  const current = disease.images[index] ?? null

  return (
    <div className="grid gap-2">
      <CoverImage
        src={current?.url ?? null}
        alt={current?.caption ?? disease.name}
        iconSize={56}
        className="aspect-[4/3] lg:aspect-[16/9]"
      >
        <div className="photo-card__overlay">
          <SeverityPill severity={disease.severity} />
        </div>
      </CoverImage>
      {disease.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {disease.images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              aria-pressed={i === index}
              aria-label={image.caption ?? `${disease.name} – ảnh ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "shrink-0 rounded-md border-2 border-transparent",
                i === index && "border-inverse"
              )}
            >
              <CoverImage
                src={image.url}
                alt=""
                iconSize={20}
                className="size-16 rounded-sm"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Loại cây, nhóm tác nhân, mức độ nguy hại (BR-06). */
function InfoRows({
  disease,
  className,
}: {
  disease: DiseaseDetail
  className?: string
}) {
  const rows: { term: string; value: React.ReactNode }[] = [
    { term: DETAIL_SECTIONS.CROP, value: disease.crop.name },
    {
      term: DETAIL_SECTIONS.PATHOGEN_GROUP,
      value: PATHOGEN_GROUP_LABEL[disease.pathogenGroup],
    },
    {
      term: DETAIL_SECTIONS.SEVERITY,
      value: <SeverityPill severity={disease.severity} />,
    },
  ]
  return (
    <dl className={cn("m-0 grid", className)}>
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
  )
}

/** "Các bệnh liên quan" (BR-07). */
function RelatedCard({
  items,
  inert,
  className,
}: {
  items: DiseaseCardData[]
  inert?: boolean
  className?: string
}) {
  return (
    <Card className={className} inert={inert}>
      <h3 className="m-0 mb-4 type-h3">{DETAIL_SECTIONS.RELATED}</h3>
      <ul className="m-0 grid list-none p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-t border-dashed border-line py-4 first:border-0 first:pt-0 last:pb-0"
          >
            <DiseaseCard disease={item} variant="row" />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Khung chờ: ảnh, card tên và 2 card nội dung (design/07). */
export function DiseaseDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-5"
    >
      <span className="sr-only">Đang tải</span>
      <div className="grid gap-2 lg:col-span-8 lg:gap-5">
        <Skeleton className="aspect-[4/3] rounded-xl lg:aspect-[16/9]" />
        <Card className="grid gap-3">
          <Skeleton className="h-8 w-2/3 rounded-full" />
          <Skeleton className="h-5 w-full rounded-full" />
        </Card>
        <Card className="grid gap-3">
          <Skeleton className="h-6 w-1/3 rounded-full" />
          <Skeleton className="h-20 rounded-md" />
        </Card>
      </div>
      <Card className="hidden gap-3 lg:col-span-4 lg:grid">
        <Skeleton className="h-6 w-full rounded-full" />
        <Skeleton className="h-6 w-full rounded-full" />
        <Skeleton className="h-6 w-2/3 rounded-full" />
      </Card>
    </div>
  )
}

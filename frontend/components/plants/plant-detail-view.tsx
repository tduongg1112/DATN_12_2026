"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Bell, Droplets, Sprout, Stethoscope } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { ConfirmDialog } from "@/components/ds/confirm-dialog"
import { CoverImage } from "@/components/ds/cover-image"
import { HealthStatus } from "@/components/ds/health-status"
import { SeverityPill } from "@/components/ds/severity-pill"
import { EmptyState, ErrorState, Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { plantsApi } from "@/lib/api/plants"
import {
  DIAGNOSIS_TEXT,
  formatDiagnosisTime,
  textLines,
} from "@/lib/diagnosis/text"
import {
  diagnosePlantHref,
  diseaseDetailHref,
  parsePositiveId,
  plantEditHref,
  ROUTES,
} from "@/lib/navigation"
import { clearSuggestions, pendingSuggestions } from "@/lib/plants/follow-ups"
import { formatDate, PLANTS_TEXT as T } from "@/lib/plants/text"
import type { PlantDetail, ReminderView } from "@/lib/types/plants"

import { CareNoteSheet, StatusSheet } from "./plant-sheets"
import { PlantFollowUps, RecheckSheet } from "./reminder-sheets"
import { PlantTimeline } from "./plant-timeline"

/**
 * S3 Chi tiết cây `/plants/detail?id=` (US-03 → 08; BR-05 → 09, 11). Đọc `useSearchParams`
 * nên trang phải bọc `<Suspense>`.
 */
export function PlantDetailView() {
  const searchParams = useSearchParams()
  const id = parsePositiveId(searchParams.get("id"))
  const request = useApiRequest(id === null ? null : `plant:${id}`, (signal) =>
    plantsApi.get(id ?? 0, signal)
  )
  /** Bản mới nhất sau khi cập nhật tình trạng (không phải tải lại). */
  const [updated, setUpdated] = React.useState<PlantDetail | null>(null)
  const loaded = request.data?.id === id ? request.data : undefined
  const data = updated && loaded && updated.id === loaded.id ? updated : loaded

  if (
    id === null ||
    request.error?.status === 404 ||
    request.error?.status === 400
  ) {
    return (
      <Card>
        <EmptyState
          icon={Sprout}
          message={DIAGNOSIS_TEXT.NOT_FOUND}
          action={{ label: T.BACK_TO_PLANTS, href: ROUTES.plants }}
        />
      </Card>
    )
  }
  if (request.error) {
    return (
      <ErrorState message={request.error.message} onRetry={request.reload} />
    )
  }
  if (!data) return <PlantDetailSkeleton />
  return (
    <DetailContent
      key={data.id}
      plant={data}
      onChanged={(next) => setUpdated(next)}
      onReload={() => {
        setUpdated(null)
        request.reload()
      }}
    />
  )
}

function DetailContent({
  plant,
  onChanged,
  onReload,
}: {
  plant: PlantDetail
  onChanged: (plant: PlantDetail) => void
  onReload: () => void
}) {
  const router = useRouter()
  const [sheet, setSheet] = React.useState<
    "status" | "note" | "recheck" | "delete" | null
  >(null)
  const [deleting, setDeleting] = React.useState(false)
  /** Gợi ý nhắc vừa nhận khi tạo cây (S2): mở "Gợi ý lịch nhắc" một lần. */
  const [suggestions] = React.useState(() => pendingSuggestions(plant.id))
  React.useEffect(() => clearSuggestions(plant.id), [plant.id])

  async function remove() {
    setDeleting(true)
    try {
      await plantsApi.remove(plant.id)
      notify(T.DELETED)
      router.replace(ROUTES.plants)
    } catch (e) {
      notify(isApiError(e) ? e.message : CLIENT_ERRORS.INTERNAL_ERROR)
      setDeleting(false)
      setSheet(null)
    }
  }

  const info: { term: string; value: string }[] = [
    { term: T.CROP, value: plant.crop.name },
    ...(plant.plantedDate
      ? [{ term: T.PLANTED_DATE, value: formatDate(plant.plantedDate) }]
      : []),
    ...(plant.note ? [{ term: T.NOTE, value: plant.note }] : []),
    ...(plant.lastDiagnosedAt
      ? [
          {
            term: T.LAST_DIAGNOSED_LABEL,
            value: formatDate(plant.lastDiagnosedAt),
          },
        ]
      : []),
  ]
  const disease = plant.currentDisease
  const treatment = textLines(disease?.treatment ?? null)

  return (
    // Mobile: chừa chỗ cho nút "Chẩn đoán lại" dính đáy trên dock.
    <div className="grid gap-2 pb-[calc(var(--ctl-md)+var(--s-3))] lg:grid-cols-12 lg:items-start lg:gap-5 lg:pb-0">
      <div className="grid gap-2 lg:sticky lg:top-5 lg:col-span-5 lg:gap-5">
        <CoverImage
          src={plant.avatarUrl}
          alt={T.PLANT_PHOTO(plant.name)}
          iconSize={56}
          className="aspect-[4/5] max-h-[520px]"
        >
          <div className="photo-card__overlay">
            <HealthStatus status={plant.healthStatus} />
          </div>
        </CoverImage>
        <Card>
          <dl className="m-0 grid">
            {info.map((row) => (
              <div
                key={row.term}
                className="flex items-center justify-between gap-3 border-t border-dashed border-line py-3 first:border-0 first:pt-0 last:pb-0"
              >
                <dt className="text-ink-secondary type-body-sm">{row.term}</dt>
                <dd className="m-0 min-w-0 text-right type-title">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="grid gap-2">
          <div className="fixed inset-x-[var(--gutter-mobile)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 lg:static">
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href={diagnosePlantHref(plant.id)} />}
            >
              {T.DIAGNOSE_AGAIN}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {plant.allowedStatusChanges.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSheet("status")}
              >
                {T.UPDATE_STATUS}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSheet("note")}
            >
              {T.ADD_NOTE}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSheet("recheck")}
            >
              {T.REMIND_ME}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              nativeButton={false}
              render={<Link href={plantEditHref(plant.id)} />}
            >
              {T.EDIT}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start text-severe hover:text-severe"
            onClick={() => setSheet("delete")}
          >
            {T.DELETE}
          </Button>
        </Card>
      </div>

      <div className="grid min-w-0 gap-2 lg:col-span-7 lg:gap-5">
        {disease && (
          <Card notch className="grid gap-4">
            <div className="grid gap-2">
              <p className="m-0 text-ink-secondary type-body-sm">
                {T.CURRENT_DISEASE}
              </p>
              <h2 className="m-0 type-h3">{disease.name}</h2>
              <SeverityPill
                severity={disease.severity}
                className="justify-self-start"
              />
            </div>
            {treatment.length > 0 && (
              <div className="grid gap-2">
                <h3 className="m-0 type-title">{T.TREATMENT}</h3>
                <ol className="list">
                  {treatment.map((line, i) => (
                    <li key={i} className="list-row py-3">
                      <span className="list-row__index">{i + 1}</span>
                      <span className="list-row__main">{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {disease.detailAvailable && (
              <Button
                variant="link"
                className="justify-self-start px-0"
                nativeButton={false}
                render={<Link href={diseaseDetailHref(disease.id)} />}
              >
                {T.VIEW_DISEASE}
              </Button>
            )}
          </Card>
        )}
        {plant.reminders.length > 0 && (
          <RemindersCard reminders={plant.reminders} notch={!disease} />
        )}
        <Card notch={!disease && plant.reminders.length === 0}>
          <h3 className="m-0 mb-4 type-h3">{T.TIMELINE}</h3>
          <PlantTimeline plant={plant} />
        </Card>
      </div>

      <StatusSheet
        plant={plant}
        open={sheet === "status"}
        onOpenChange={(open) => setSheet(open ? "status" : null)}
        onSaved={onChanged}
      />
      <CareNoteSheet
        plantId={plant.id}
        open={sheet === "note"}
        onOpenChange={(open) => setSheet(open ? "note" : null)}
        onSaved={onReload}
      />
      <RecheckSheet
        plantId={plant.id}
        open={sheet === "recheck"}
        onOpenChange={(open) => setSheet(open ? "recheck" : null)}
        onSaved={onReload}
      />
      {suggestions.length > 0 && (
        <PlantFollowUps
          link={{ plant, suggestRecovered: false, suggestions }}
          onDone={onReload}
        />
      )}
      <ConfirmDialog
        open={sheet === "delete"}
        onOpenChange={(open) => setSheet(open ? "delete" : null)}
        title={T.DELETE_TITLE(plant.name)}
        description={<p className="m-0">{T.DELETE_BODY}</p>}
        confirmLabel={T.DELETE}
        cancelLabel={T.CANCEL}
        onConfirm={remove}
        busy={deleting}
      />
    </div>
  )
}

const REMINDER_ICONS = {
  RECHECK: Stethoscope,
  WATERING: Droplets,
  FERTILIZING: Sprout,
  OTHER: Bell,
} as const

/** Card "Lịch nhắc" (OQ-49): nhắc đang bật, chỉ xem. */
function RemindersCard({
  reminders,
  notch,
}: {
  reminders: ReminderView[]
  notch: boolean
}) {
  return (
    <Card notch={notch}>
      <h3 className="m-0 mb-3 type-h3">{T.REMINDERS}</h3>
      <ul className="m-0 grid list-none p-0">
        {reminders.map((r) => {
          const Icon = REMINDER_ICONS[r.type]
          return (
            <li
              key={r.id}
              className="flex items-center gap-3 border-t border-dashed border-line py-3 first:border-0 first:pt-0 last:pb-0"
            >
              <span
                className="icon-tile icon-tile--neutral size-10 shrink-0"
                aria-hidden
              >
                <Icon size={18} />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="type-title">
                  {r.title}
                  {r.repeatDays ? ` · ${T.EVERY(r.repeatDays)}` : ""}
                </span>
                <span className="text-ink-secondary type-caption">
                  {T.NEXT_AT(formatDiagnosisTime(r.nextRemindAt))}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** Khung chờ: ảnh và 2 card. */
export function PlantDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-5"
    >
      <span className="sr-only">Đang tải</span>
      <Skeleton className="aspect-[4/5] max-h-[520px] rounded-xl lg:col-span-5" />
      <div className="grid gap-2 lg:col-span-7 lg:gap-5">
        <Card className="grid gap-3">
          <Skeleton className="h-6 w-1/3 rounded-full" />
          <Skeleton className="h-20 rounded-md" />
        </Card>
        <Card className="grid gap-3">
          <Skeleton className="h-6 w-1/4 rounded-full" />
          <Skeleton className="h-16 rounded-md" />
        </Card>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { Check, TriangleAlert } from "lucide-react"

import { CoverImage } from "@/components/ds/cover-image"
import { FormError } from "@/components/ds/field"
import { HealthStatus } from "@/components/ds/health-status"
import { Sheet } from "@/components/ds/sheet"
import { Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { diagnosesApi } from "@/lib/api/diagnoses"
import { plantsApi } from "@/lib/api/plants"
import { plantDetailHref, plantNewHref } from "@/lib/navigation"
import { PLANTS_PAGE_SIZE, PLANTS_TEXT as T } from "@/lib/plants/text"
import type { DiagnosisResult } from "@/lib/types/diagnosis"
import type { PlantCard, PlantLink } from "@/lib/types/plants"
import { cn } from "@/lib/utils"

import { PlantFollowUps } from "./reminder-sheets"

/**
 * "Lưu vào cây trồng của tôi" trên màn kết quả chẩn đoán và chi tiết lịch sử (diagnosis
 * BR-22, 23; history BR-06; design/screens/my_plants.md S5). Lượt đã gắn cây thì hiện dòng
 * "Đã lưu vào hồ sơ cây {tên}" có liên kết. `plantLink` là kết quả gắn ngay lúc chẩn đoán
 * từ hồ sơ cây (D1). Sau khi gắn: hỏi "Cây đã khỏi bệnh?" rồi "Gợi ý lịch nhắc" nếu có.
 */
export function SaveToPlant({
  result,
  plantLink = null,
}: {
  result: DiagnosisResult
  plantLink?: PlantLink | null
}) {
  const [linked, setLinked] = React.useState<{
    id: number
    name: string
  } | null>(result.plant)
  const [open, setOpen] = React.useState(false)
  /** Lần gắn gần nhất cần hỏi tiếp; `key` để mỗi lần gắn bắt đầu lại từ đầu. */
  const [followUp, setFollowUp] = React.useState<{
    key: number
    link: PlantLink
  } | null>(plantLink ? { key: 0, link: plantLink } : null)

  function handleLinked(link: PlantLink) {
    setLinked({ id: link.plant.id, name: link.plant.name })
    setOpen(false)
    notify(T.SAVED_TO_PLANT)
    setFollowUp((prev) => ({ key: (prev?.key ?? 0) + 1, link }))
  }

  return (
    <>
      {linked ? (
        <p className="m-0 flex items-center gap-2 px-2 type-body-sm">
          <Check size={18} aria-hidden className="text-ink-accent" />
          <Link
            href={plantDetailHref(linked.id)}
            className="underline underline-offset-4"
          >
            {T.SAVED_TO_PLANT_NAMED(linked.name)}
          </Link>
        </p>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {T.SAVE_TO_PLANT}
        </Button>
      )}
      {open && (
        <PickPlantSheet
          result={result}
          onOpenChange={setOpen}
          onLinked={handleLinked}
        />
      )}
      {followUp && (
        <PlantFollowUps
          key={followUp.key}
          link={followUp.link}
          onDone={() => setFollowUp(null)}
        />
      )}
    </>
  )
}

/** Sheet chọn cây: 10 cây mỗi lần (OQ-45), cảnh báo khác loại cây (OQ-50). */
function PickPlantSheet({
  result,
  onOpenChange,
  onLinked,
}: {
  result: DiagnosisResult
  onOpenChange: (open: boolean) => void
  onLinked: (link: PlantLink) => void
}) {
  const firstPage = useApiRequest("plants|pick", (signal) =>
    plantsApi.list({ page: 1, pageSize: PLANTS_PAGE_SIZE }, signal)
  )
  const [more, setMore] = React.useState<{
    page: number
    items: PlantCard[]
  } | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [selected, setSelected] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const plants = firstPage.data
    ? [...firstPage.data.items, ...(more?.items ?? [])]
    : firstPage.error
      ? []
      : null
  const total = firstPage.data?.total ?? 0

  async function loadMore() {
    const page = (more?.page ?? 1) + 1
    setLoadingMore(true)
    try {
      const next = await plantsApi.list({ page, pageSize: PLANTS_PAGE_SIZE })
      const seen = new Set((plants ?? []).map((p) => p.id))
      setMore({
        page,
        items: [
          ...(more?.items ?? []),
          ...next.items.filter((p) => !seen.has(p.id)),
        ],
      })
    } catch (e) {
      setError(isApiError(e) ? e.message : CLIENT_ERRORS.INTERNAL_ERROR)
    } finally {
      setLoadingMore(false)
    }
  }

  async function save() {
    if (selected === null) return
    setSaving(true)
    setError(null)
    try {
      onLinked(await diagnosesApi.attachToPlant(result.id, selected))
    } catch (e) {
      setError(isApiError(e) ? e.message : CLIENT_ERRORS.INTERNAL_ERROR)
      setSaving(false)
    }
  }

  const createLink = (
    <Button
      variant="secondary"
      nativeButton={false}
      render={<Link href={plantNewHref(result.id)} />}
    >
      {T.CREATE_PLANT}
    </Button>
  )

  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={T.SAVE_TO_PLANT}
      busy={saving}
      footer={
        plants && plants.length > 0 ? (
          <>
            {createLink}
            <Button disabled={selected === null || saving} onClick={save}>
              {T.SAVE}
            </Button>
          </>
        ) : (
          createLink
        )
      }
    >
      {plants === null ? (
        <div className="grid gap-2" aria-hidden>
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      ) : plants.length === 0 ? (
        <p className="m-0 text-ink-secondary type-body">{T.NO_PLANTS}</p>
      ) : (
        <div
          role="radiogroup"
          aria-label={T.SAVE_TO_PLANT}
          className="grid gap-1"
        >
          {plants.map((plant) => {
            const checked = plant.id === selected
            const mismatch = checked && plant.crop.id !== result.crop.id
            return (
              <div key={plant.id} className="grid gap-1">
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setSelected(plant.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border-2 border-transparent p-2 text-left outline-none hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    checked && "border-inverse"
                  )}
                >
                  <CoverImage
                    src={plant.avatarUrl}
                    alt=""
                    iconSize={18}
                    className="size-12 shrink-0 rounded-md"
                  />
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="truncate type-title">{plant.name}</span>
                    <span className="text-ink-secondary type-caption">
                      {plant.crop.name}
                    </span>
                  </span>
                  <HealthStatus status={plant.healthStatus} />
                </button>
                {mismatch && (
                  <p className="m-0 flex items-start gap-2 px-2 text-ink-secondary type-body-sm">
                    <TriangleAlert size={18} aria-hidden className="shrink-0" />
                    {T.CROP_MISMATCH(plant.crop.name, result.crop.name)}
                  </p>
                )}
              </div>
            )
          })}
          {plants.length < total && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-center"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {T.LOAD_MORE}
            </Button>
          )}
        </div>
      )}
      <FormError message={error ?? firstPage.error?.message ?? null} />
    </Sheet>
  )
}

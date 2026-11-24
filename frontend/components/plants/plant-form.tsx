"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Card } from "@/components/ds/card-stack"
import { FormError, TextField } from "@/components/ds/field"
import { FilterChips } from "@/components/ds/filter-chips"
import { ImagePicker } from "@/components/ds/image-picker"
import { Skeleton } from "@/components/ds/states"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { diagnosesApi } from "@/lib/api/diagnoses"
import { libraryApi } from "@/lib/api/library"
import { plantsApi } from "@/lib/api/plants"
import { useBackNavigation } from "@/lib/navigation-history"
import { plantDetailHref, ROUTES } from "@/lib/navigation"
import { rememberSuggestions } from "@/lib/plants/follow-ups"
import { PLANTS_TEXT as T, todayInput } from "@/lib/plants/text"
import type { PlantDetail, PlantFormValues } from "@/lib/types/plants"
import { cn } from "@/lib/utils"

type Mode =
  | { kind: "create" }
  | { kind: "edit"; plant: PlantDetail }
  /** Tạo cây từ kết quả chẩn đoán (A2): loại cây điền sẵn theo lượt (C4 UC02 bước 14). */
  | { kind: "fromDiagnosis"; diagnosisId: number; cropId: number }

type FieldName = "name" | "cropId" | "plantedDate" | "note"

/**
 * Form S2 Thêm cây · S4 Sửa cây (US-02, US-07; BR-02, 03, 10). Thiếu tên gọi hoặc loại cây
 * thì đánh dấu trường thiếu và báo câu C4 6.1. Sau khi lưu sang chi tiết cây.
 */
export function PlantForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const goBack = useBackNavigation(ROUTES.plants)
  const crops = useApiRequest("crops", (signal) => libraryApi.crops(signal))
  const initial = mode.kind === "edit" ? mode.plant : null
  const [values, setValues] = React.useState<PlantFormValues>(() => ({
    name: initial?.name ?? "",
    cropId:
      initial?.crop.id ?? (mode.kind === "fromDiagnosis" ? mode.cropId : null),
    plantedDate: initial?.plantedDate ?? "",
    note: initial?.note ?? "",
    avatar: null,
  }))
  const [errors, setErrors] = React.useState<
    Partial<Record<FieldName, string>>
  >({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [today] = React.useState(() => todayInput())

  function set<K extends keyof PlantFormValues>(
    key: K,
    value: PlantFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<FieldName, string>> = {}
    if (!values.name.trim()) next.name = T.REQUIRED
    if (values.cropId === null) next.cropId = T.REQUIRED
    if (values.plantedDate && values.plantedDate > today) {
      next.plantedDate = T.PLANTED_FUTURE
    }
    setErrors(next)
    setFormError(next.name || next.cropId ? T.REQUIRED : null)
    return Object.keys(next).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setFormError(null)
    try {
      if (mode.kind === "edit") {
        await plantsApi.update(mode.plant.id, values)
        notify(T.UPDATED)
        router.replace(plantDetailHref(mode.plant.id))
      } else if (mode.kind === "fromDiagnosis") {
        const link = await diagnosesApi.createPlantFrom(
          mode.diagnosisId,
          values
        )
        notify(T.SAVED_TO_PLANT)
        rememberSuggestions(link.plant.id, link.suggestions)
        router.replace(plantDetailHref(link.plant.id))
      } else {
        const { plant, suggestions } = await plantsApi.create(values)
        notify(T.ADDED)
        rememberSuggestions(plant.id, suggestions)
        router.replace(plantDetailHref(plant.id))
      }
    } catch (error) {
      setErrors(fieldErrors(error) as Partial<Record<FieldName, string>>)
      setFormError(
        isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
      )
      setSaving(false)
    }
  }

  return (
    <Card notch className="mx-auto w-full max-w-[560px]">
      <form noValidate onSubmit={submit} className="grid gap-5">
        <TextField
          id="plant-name"
          label={T.NAME}
          value={values.name}
          maxLength={100}
          autoComplete="off"
          error={errors.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <div className={cn("field", errors.cropId && "field--error")}>
          <span id="plant-crop-label" className="field__label">
            {T.CROP}
          </span>
          {crops.data ? (
            <div
              aria-labelledby="plant-crop-label"
              aria-describedby={errors.cropId ? "plant-crop-help" : undefined}
            >
              <FilterChips<number | null>
                label={T.CROP}
                options={crops.data.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                value={values.cropId}
                onChange={(id) => set("cropId", id)}
                className="flex-wrap"
              />
            </div>
          ) : (
            <Skeleton className="h-[46px] w-full rounded-full" />
          )}
          {errors.cropId && (
            <p id="plant-crop-help" className="field__help m-0">
              {errors.cropId}
            </p>
          )}
        </div>
        <TextField
          id="plant-date"
          type="date"
          label={T.PLANTED_DATE}
          value={values.plantedDate}
          max={today}
          error={errors.plantedDate}
          onChange={(e) => set("plantedDate", e.target.value)}
        />
        <ImagePicker
          label={T.AVATAR}
          value={values.avatar}
          currentUrl={initial?.avatarUrl}
          removeLabel={T.REMOVE_IMAGE}
          onChange={(avatar) => set("avatar", avatar)}
          disabled={saving}
        />
        <TextField
          id="plant-note"
          label={T.NOTE}
          value={values.note}
          maxLength={255}
          error={errors.note}
          onChange={(e) => set("note", e.target.value)}
        />
        <FormError message={formError} />
        <div className="grid gap-2 sm:flex sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={goBack}
            disabled={saving}
          >
            {T.CANCEL}
          </Button>
          <Button type="submit" disabled={saving}>
            {T.SAVE}
          </Button>
        </div>
      </form>
    </Card>
  )
}

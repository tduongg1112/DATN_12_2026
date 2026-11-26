"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Card } from "@/components/ds/card-stack"
import { FormError, TextField } from "@/components/ds/field"
import { ImagePicker } from "@/components/ds/image-picker"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { catalogApi } from "@/lib/api/catalog"
import {
  CATALOG_TEXT as T,
  CROP_CODE_PATTERN,
  LIMITS,
  isValidDays,
} from "@/lib/catalog/text"
import { ROUTES } from "@/lib/navigation"
import type { AdminCrop, CropFormValues } from "@/lib/types/catalog"

import { ClassCodeField } from "./class-code-field"
import { TextAreaField } from "./form-fields"

type Errors = Partial<Record<keyof CropFormValues, string>>

/**
 * S5 Thêm loại cây · Sửa loại cây (US-06, 07; BR-11; OQ-17, OQ-53): mã, tên, ảnh, mô tả,
 * hướng dẫn chăm sóc, chu kỳ tưới, bón, mã lớp khoẻ mạnh. Lưu xong về S4.
 */
export function CropForm({ crop }: { crop: AdminCrop | null }) {
  const router = useRouter()
  const [values, setValues] = React.useState<CropFormValues>(() => ({
    code: crop?.code ?? "",
    name: crop?.name ?? "",
    description: crop?.description ?? "",
    careGuide: crop?.careGuide ?? "",
    wateringIntervalDays: crop?.wateringIntervalDays
      ? String(crop.wateringIntervalDays)
      : "",
    fertilizingIntervalDays: crop?.fertilizingIntervalDays
      ? String(crop.fertilizingIntervalDays)
      : "",
    healthyClassCode: crop?.healthyClassCode ?? "",
    image: null,
    removeImage: false,
  }))
  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  function set<K extends keyof CropFormValues>(
    key: K,
    value: CropFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Errors = {}
    const code = values.code.trim()
    if (!code) next.code = T.REQUIRED
    else if (!CROP_CODE_PATTERN.test(code)) next.code = T.CROP_CODE_FORMAT
    if (!values.name.trim()) next.name = T.REQUIRED
    for (const key of [
      "wateringIntervalDays",
      "fertilizingIntervalDays",
    ] as const) {
      if (!isValidDays(values[key])) next[key] = T.DAYS_RANGE
    }
    setErrors(next)
    setFormError(next.code === T.REQUIRED || next.name ? T.REQUIRED : null)
    return Object.keys(next).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setFormError(null)
    try {
      if (crop) {
        await catalogApi.updateCrop(crop.id, values)
        notify(T.UPDATED)
      } else {
        await catalogApi.createCrop(values)
        notify(T.CROP_ADDED)
      }
      router.replace(ROUTES.catalogCrops)
    } catch (error) {
      setErrors(fieldErrors(error) as Errors)
      setFormError(
        isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
      )
      setSaving(false)
    }
  }

  const currentUrl = values.removeImage ? null : (crop?.imageUrl ?? null)

  return (
    <Card notch className="w-full lg:max-w-[calc(100%*8/12)]">
      <form noValidate onSubmit={submit} className="grid gap-5">
        <TextField
          id="crop-code"
          label={T.CROP_CODE}
          value={values.code}
          maxLength={LIMITS.cropCode}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          error={errors.code}
          help={T.CROP_CODE_HINT}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
        />
        <TextField
          id="crop-name"
          label={T.CROP_NAME}
          value={values.name}
          maxLength={LIMITS.cropName}
          autoComplete="off"
          error={errors.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <div className="grid gap-2">
          <ImagePicker
            label={T.CROP_IMAGE}
            value={values.image}
            currentUrl={currentUrl}
            removeLabel={T.REMOVE_IMAGE}
            onChange={(image) => set("image", image)}
            disabled={saving}
          />
          {currentUrl && !values.image && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              disabled={saving}
              onClick={() => set("removeImage", true)}
            >
              {T.REMOVE_IMAGE}
            </Button>
          )}
          {errors.image && (
            <p role="alert" className="m-0 text-severe type-body-sm">
              {errors.image}
            </p>
          )}
        </div>
        <TextAreaField
          id="crop-description"
          label={T.DESCRIPTION}
          value={values.description}
          maxLength={LIMITS.description}
          rows={3}
          error={errors.description}
          onChange={(v) => set("description", v)}
        />
        <TextAreaField
          id="crop-careGuide"
          label={T.CARE_GUIDE}
          value={values.careGuide}
          maxLength={LIMITS.content}
          rows={5}
          error={errors.careGuide}
          help={T.CARE_GUIDE_HINT}
          onChange={(v) => set("careGuide", v)}
        />
        <div className="grid gap-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="crop-watering"
              label={T.WATERING}
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={values.wateringIntervalDays}
              error={errors.wateringIntervalDays}
              onChange={(e) => set("wateringIntervalDays", e.target.value)}
            />
            <TextField
              id="crop-fertilizing"
              label={T.FERTILIZING}
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={values.fertilizingIntervalDays}
              error={errors.fertilizingIntervalDays}
              onChange={(e) => set("fertilizingIntervalDays", e.target.value)}
            />
          </div>
          <p className="m-0 text-ink-secondary type-caption">
            {T.INTERVAL_HINT}
          </p>
        </div>
        <ClassCodeField
          id="crop-healthyClassCode"
          label={T.HEALTHY_CLASS_CODE}
          value={values.healthyClassCode}
          current={crop?.healthyClassCode ?? null}
          error={errors.healthyClassCode}
          disabled={saving}
          onChange={(code) => set("healthyClassCode", code)}
        />
        <FormError message={formError} />
        <div className="grid gap-2 sm:flex sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(ROUTES.catalogCrops)}
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

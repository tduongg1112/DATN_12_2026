"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Card } from "@/components/ds/card-stack"
import { ConfirmDialog } from "@/components/ds/confirm-dialog"
import { FormError, TextField } from "@/components/ds/field"
import { FilterChips } from "@/components/ds/filter-chips"
import { PublishStatusPill } from "@/components/ds/publish-status"
import { Skeleton } from "@/components/ds/states"
import { SwitchField } from "@/components/ds/switch"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { catalogApi } from "@/lib/api/catalog"
import {
  CATALOG_TEXT as T,
  LIMITS,
  PUBLISH_STATUS_DISPLAY,
  SEVERITY_CHOICE,
  isValidDays,
} from "@/lib/catalog/text"
import { PATHOGEN_GROUP_LABEL } from "@/lib/library/text"
import { diseaseEditHref, ROUTES } from "@/lib/navigation"
import type {
  AdminDisease,
  DiseaseFormValues,
  GalleryImage,
} from "@/lib/types/catalog"
import type { PathogenGroup, Severity } from "@/lib/types/domain"

import { ClassCodeField } from "./class-code-field"
import { DiseasePreview, type PreviewSource } from "./disease-preview"
import { ChipField, TextAreaField } from "./form-fields"
import { ImageGallery } from "./image-gallery"

type Mode =
  | { kind: "create"; classCode?: string }
  | { kind: "edit"; disease: AdminDisease }

type Errors = Partial<Record<string, string>>

const PATHOGEN_GROUPS = Object.keys(PATHOGEN_GROUP_LABEL) as PathogenGroup[]
const SEVERITIES = Object.keys(SEVERITY_CHOICE) as Severity[]
const CONTENT_FIELDS = [
  ["symptoms", T.SYMPTOMS],
  ["causes", T.CAUSES],
  ["prevention", T.PREVENTION],
  ["treatment", T.TREATMENT],
] as const
/** BR-06: bắt buộc khi công khai. */
const PUBLISH_FIELDS = ["summary", "symptoms", "treatment"] as const

function valuesFrom(d: AdminDisease | null, classCode = ""): DiseaseFormValues {
  return {
    cropId: d?.crop.id ?? null,
    name: d?.name ?? "",
    pathogen: d?.pathogen ?? "",
    pathogenGroup: d?.pathogenGroup ?? null,
    severity: d?.severity ?? null,
    classCode: d ? (d.classCode ?? "") : classCode,
    summary: d?.summary ?? "",
    symptoms: d?.symptoms ?? "",
    causes: d?.causes ?? "",
    prevention: d?.prevention ?? "",
    treatment: d?.treatment ?? "",
    recheckDays: d?.recheckDays ? String(d.recheckDays) : "",
    isFeatured: d?.isFeatured ?? false,
    status: d?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    images: (d?.images ?? []).map((img): GalleryImage => ({
      key: `img-${img.id}`,
      kind: "existing",
      id: img.id,
      url: img.url,
      caption: img.caption ?? "",
    })),
  }
}

function revokeNew(images: GalleryImage[]) {
  for (const img of images) if (img.kind === "new") URL.revokeObjectURL(img.url)
}

/**
 * S2 Thêm bệnh · Sửa bệnh (US-02, 03, 05, 07; BR-02 → 06, 09, 10; OQ-53 → 58). Thiếu trường
 * bắt buộc thì đánh dấu từng trường và báo câu C4 6.1 trên nút "Lưu".
 */
export function DiseaseForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const crops = useApiRequest("admin-crops", (signal) =>
    catalogApi.crops(signal)
  )
  const [disease, setDisease] = React.useState<AdminDisease | null>(
    mode.kind === "edit" ? mode.disease : null
  )
  const [values, setValues] = React.useState<DiseaseFormValues>(() =>
    valuesFrom(
      mode.kind === "edit" ? mode.disease : null,
      mode.kind === "create" ? (mode.classCode ?? "") : ""
    )
  )
  const [errors, setErrors] = React.useState<Errors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [statusBusy, setStatusBusy] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  // Thu hồi URL tạm của ảnh mới khi rời form.
  const imagesRef = React.useRef(values.images)
  React.useEffect(() => {
    imagesRef.current = values.images
  })
  React.useEffect(() => () => revokeNew(imagesRef.current), [])

  /** Bệnh đã công khai: không còn trường trạng thái, đổi bằng "Ẩn" / "Hiện" (OQ-54). */
  const statusEditable = disease === null || disease.status === "DRAFT"
  const resultingStatus = statusEditable ? values.status : disease.status
  const busy = saving || statusBusy || deleting

  function set<K extends keyof DiseaseFormValues>(
    key: K,
    value: DiseaseFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  /** Trường cơ bản (luôn bắt buộc); dùng cả cho "Xem trước". */
  function basicErrors(): Errors {
    const next: Errors = {}
    if (values.cropId === null) next.cropId = T.REQUIRED
    if (!values.name.trim()) next.name = T.REQUIRED
    if (!values.pathogenGroup) next.pathogenGroup = T.REQUIRED
    if (!values.severity) next.severity = T.REQUIRED
    return next
  }

  function validate(): boolean {
    const next = basicErrors()
    if (resultingStatus === "PUBLISHED") {
      for (const f of PUBLISH_FIELDS)
        if (!values[f].trim()) next[f] = T.REQUIRED
    }
    if (!isValidDays(values.recheckDays)) next.recheckDays = T.DAYS_RANGE
    setErrors(next)
    const missing = Object.values(next).some((m) => m === T.REQUIRED)
    setFormError(missing ? T.REQUIRED : null)
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0]
      document
        .getElementById(`disease-${first}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
      return false
    }
    return true
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setFormError(null)
    try {
      if (disease === null) {
        const created = await catalogApi.createDisease(values)
        notify(T.DISEASE_ADDED)
        router.replace(diseaseEditHref(created.id))
        return
      }
      const updated = await catalogApi.updateDisease(
        disease.id,
        values,
        statusEditable
      )
      notify(T.UPDATED)
      revokeNew(values.images)
      setDisease(updated)
      setValues(valuesFrom(updated))
      setErrors({})
      setSaving(false)
    } catch (error) {
      const fields = fieldErrors(error)
      const imageError = Object.entries(fields).find(
        ([f]) => f === "images" || f.startsWith("imageLayout")
      )?.[1]
      setErrors({ ...fields, images: imageError })
      setFormError(
        isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
      )
      setSaving(false)
    }
  }

  async function toggleStatus() {
    if (!disease) return
    const next = disease.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"
    setStatusBusy(true)
    try {
      const updated = await catalogApi.setDiseaseStatus(disease.id, next)
      setDisease(updated)
      notify(next === "HIDDEN" ? T.DISEASE_HIDDEN : T.DISEASE_SHOWN)
    } catch (error) {
      notify(isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR)
    } finally {
      setStatusBusy(false)
    }
  }

  async function remove() {
    if (!disease) return
    setDeleting(true)
    try {
      await catalogApi.removeDisease(disease.id)
      notify(T.DISEASE_DELETED)
      router.replace(ROUTES.catalog)
    } catch (error) {
      setDeleteOpen(false)
      setDeleting(false)
      notify(isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR)
    }
  }

  function openPreview() {
    const next = basicErrors()
    if (Object.keys(next).length > 0) {
      setErrors((e) => ({ ...e, ...next }))
      setFormError(T.REQUIRED)
      return
    }
    setPreviewOpen(true)
  }

  const crop = crops.data?.find((c) => c.id === values.cropId)
  const preview: PreviewSource | null =
    crop && values.pathogenGroup && values.severity
      ? {
          id: disease?.id ?? null,
          crop: { id: crop.id, code: crop.code, name: crop.name },
          name: values.name,
          pathogen: values.pathogen,
          pathogenGroup: values.pathogenGroup,
          severity: values.severity,
          summary: values.summary,
          symptoms: values.symptoms,
          causes: values.causes,
          prevention: values.prevention,
          treatment: values.treatment,
          images: values.images.map((img) => ({
            url: img.url,
            caption: img.caption,
          })),
          published: disease?.status === "PUBLISHED",
        }
      : null

  const cropLocked = disease?.cropLocked ?? false

  return (
    <form
      noValidate
      onSubmit={submit}
      className="grid gap-2 pb-[calc(var(--ctl-md)+var(--s-3))] lg:grid-cols-12 lg:items-start lg:gap-5 lg:pb-0"
    >
      <div className="grid min-w-0 gap-2 lg:col-span-8 lg:gap-5">
        <Card notch className="grid gap-5">
          <h2 className="m-0 type-h3">{T.GROUP_GENERAL}</h2>
          <ChipField
            id="disease-cropId"
            label={T.CROP}
            error={errors.cropId}
            help={cropLocked ? T.CROP_LOCKED : undefined}
          >
            {crops.data ? (
              <FilterChips<number | null>
                label={T.CROP}
                options={crops.data
                  .filter((c) => !cropLocked || c.id === values.cropId)
                  .map((c) => ({
                    value: c.id,
                    label:
                      c.status === "HIDDEN"
                        ? `${c.name} ${T.CROP_HIDDEN_SUFFIX}`
                        : c.name,
                  }))}
                value={values.cropId}
                onChange={(id) => !cropLocked && set("cropId", id)}
                className="flex-wrap"
              />
            ) : (
              <Skeleton className="h-[46px] w-full rounded-full" />
            )}
          </ChipField>
          <TextField
            id="disease-name"
            label={T.NAME}
            value={values.name}
            maxLength={LIMITS.diseaseName}
            autoComplete="off"
            error={errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <TextField
            id="disease-pathogen"
            label={T.PATHOGEN}
            value={values.pathogen}
            maxLength={LIMITS.pathogen}
            autoComplete="off"
            placeholder={T.PATHOGEN_HINT}
            error={errors.pathogen}
            onChange={(e) => set("pathogen", e.target.value)}
          />
          <ChipField
            id="disease-pathogenGroup"
            label={T.PATHOGEN_GROUP}
            error={errors.pathogenGroup}
          >
            <FilterChips<PathogenGroup | null>
              label={T.PATHOGEN_GROUP}
              options={PATHOGEN_GROUPS.map((g) => ({
                value: g,
                label: PATHOGEN_GROUP_LABEL[g],
              }))}
              value={values.pathogenGroup}
              onChange={(g) => set("pathogenGroup", g)}
              className="flex-wrap"
            />
          </ChipField>
          <ChipField
            id="disease-severity"
            label={T.SEVERITY}
            error={errors.severity}
          >
            <FilterChips<Severity | null>
              label={T.SEVERITY}
              options={SEVERITIES.map((s) => ({
                value: s,
                label: SEVERITY_CHOICE[s],
              }))}
              value={values.severity}
              onChange={(s) => set("severity", s)}
              className="flex-wrap"
            />
          </ChipField>
          <ClassCodeField
            id="disease-classCode"
            label={T.CLASS_CODE}
            value={values.classCode}
            current={disease?.classCode ?? null}
            error={errors.classCode}
            disabled={busy}
            onChange={(code) => set("classCode", code)}
          />
        </Card>

        <Card className="grid gap-5">
          <div className="grid gap-1">
            <h2 className="m-0 type-h3">{T.GROUP_CONTENT}</h2>
            <p className="m-0 text-ink-secondary type-caption">
              {T.CONTENT_HINT}
            </p>
          </div>
          <TextAreaField
            id="disease-summary"
            label={T.SUMMARY}
            value={values.summary}
            maxLength={LIMITS.summary}
            rows={3}
            counter
            error={errors.summary}
            onChange={(v) => set("summary", v)}
          />
          {CONTENT_FIELDS.map(([key, label]) => (
            <TextAreaField
              key={key}
              id={`disease-${key}`}
              label={label}
              value={values[key]}
              maxLength={LIMITS.content}
              rows={5}
              error={errors[key]}
              onChange={(v) => set(key, v)}
            />
          ))}
        </Card>

        <Card className="grid gap-4">
          <h2 id="disease-images" className="m-0 type-h3">
            {T.GROUP_IMAGES}
          </h2>
          <ImageGallery
            images={values.images}
            onChange={(images) => set("images", images)}
            error={errors.images}
            disabled={busy}
          />
        </Card>
      </div>

      <aside className="grid gap-2 lg:sticky lg:top-5 lg:col-span-4 lg:gap-5">
        <Card className="grid gap-5">
          <h2 className="m-0 type-h3">{T.GROUP_PUBLISH}</h2>
          {statusEditable ? (
            <ChipField id="disease-status" label={T.STATUS}>
              <FilterChips<"DRAFT" | "PUBLISHED">
                label={T.STATUS}
                options={(["DRAFT", "PUBLISHED"] as const).map((s) => ({
                  value: s,
                  label: PUBLISH_STATUS_DISPLAY[s].label,
                }))}
                value={values.status}
                onChange={(s) => set("status", s)}
              />
            </ChipField>
          ) : (
            <div className="grid gap-2">
              <span className="field__label">{T.STATUS}</span>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PublishStatusPill status={disease.status} />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void toggleStatus()}
                >
                  {disease.status === "PUBLISHED" ? T.HIDE : T.SHOW}
                </Button>
              </div>
            </div>
          )}
          <SwitchField
            id="disease-featured"
            label={T.FEATURED_FIELD}
            checked={values.isFeatured}
            help={T.FEATURED_HINT}
            disabled={busy}
            onChange={(on) => set("isFeatured", on)}
          />
          <TextField
            id="disease-recheckDays"
            label={T.RECHECK_DAYS}
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={values.recheckDays}
            error={errors.recheckDays}
            help={T.RECHECK_HINT}
            onChange={(e) => set("recheckDays", e.target.value)}
          />
          <FormError message={formError} />
          <div className="grid gap-2">
            {/* Mobile: nút "Lưu" dính đáy trên dock (design/screens/catalog.md S2). */}
            <div className="fixed inset-x-[var(--gutter-mobile)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 lg:static">
              <Button type="submit" className="w-full" disabled={busy}>
                {T.SAVE}
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={openPreview}
            >
              {T.PREVIEW}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => router.push(ROUTES.catalog)}
            >
              {T.CANCEL}
            </Button>
            {disease && (
              <Button
                type="button"
                variant="ghost"
                className="text-severe"
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
              >
                {T.DELETE_DISEASE}
              </Button>
            )}
          </div>
        </Card>
      </aside>

      {preview && (
        <DiseasePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          source={preview}
        />
      )}
      {disease && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={T.DELETE_TITLE(disease.name)}
          description={T.DELETE_BODY}
          confirmLabel={T.DELETE_DISEASE}
          cancelLabel={T.CANCEL}
          onConfirm={() => void remove()}
          busy={deleting}
        />
      )}
    </form>
  )
}

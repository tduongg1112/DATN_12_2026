"use client"

import * as React from "react"

import { ConfirmDialog } from "@/components/ds/confirm-dialog"
import { FormError } from "@/components/ds/field"
import { FilterChips } from "@/components/ds/filter-chips"
import { ImagePicker } from "@/components/ds/image-picker"
import { Sheet } from "@/components/ds/sheet"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { CLIENT_ERRORS, fieldErrors, isApiError } from "@/lib/api"
import { plantsApi } from "@/lib/api/plants"
import {
  MANUAL_STATUS_LABEL,
  PLANTS_TEXT as T,
  todayInput,
} from "@/lib/plants/text"
import type { ManualStatus, PlantDetail } from "@/lib/types/plants"
import { cn } from "@/lib/utils"

function messageOf(error: unknown): string {
  return isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
}

/** H2 Cập nhật tình trạng (BR-08; OQ-47): chỉ các lựa chọn được phép. */
export function StatusSheet({
  plant,
  open,
  onOpenChange,
  onSaved,
}: {
  plant: PlantDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (plant: PlantDetail) => void
}) {
  const [status, setStatus] = React.useState<ManualStatus | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save() {
    if (!status) return
    setSaving(true)
    setError(null)
    try {
      const updated = await plantsApi.changeStatus(plant.id, status)
      notify(T.STATUS_SAVED)
      onSaved(updated)
      onOpenChange(false)
      setStatus(null)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={T.UPDATE_STATUS}
      busy={saving}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {T.CANCEL}
          </Button>
          <Button disabled={!status || saving} onClick={save}>
            {T.SAVE}
          </Button>
        </>
      }
    >
      <FilterChips<ManualStatus | null>
        label={T.UPDATE_STATUS}
        options={plant.allowedStatusChanges.map((s) => ({
          value: s,
          label: MANUAL_STATUS_LABEL[s],
        }))}
        value={status}
        onChange={setStatus}
        className="flex-wrap"
      />
      <FormError message={error} />
    </Sheet>
  )
}

/** H3 Thêm ghi chú (BR-09): nội dung bắt buộc, ngày mặc định hôm nay, ảnh tuỳ chọn. */
export function CareNoteSheet({
  plantId,
  open,
  onOpenChange,
  onSaved,
}: {
  plantId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [today] = React.useState(() => todayInput())
  const [content, setContent] = React.useState("")
  const [actionDate, setActionDate] = React.useState(today)
  const [image, setImage] = React.useState<Blob | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  function reset() {
    setContent("")
    setActionDate(today)
    setImage(null)
    setErrors({})
    setFormError(null)
  }

  async function save() {
    const next: Record<string, string> = {}
    if (!content.trim()) next.content = T.NOTE_REQUIRED
    if (actionDate && actionDate > today) next.actionDate = T.NOTE_DATE_FUTURE
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setSaving(true)
    setFormError(null)
    try {
      await plantsApi.addLog(plantId, { content, actionDate, image })
      notify(T.NOTE_ADDED)
      reset()
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setErrors(fieldErrors(e))
      setFormError(messageOf(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={T.ADD_NOTE}
      busy={saving}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {T.CANCEL}
          </Button>
          <Button disabled={saving} onClick={save}>
            {T.SAVE}
          </Button>
        </>
      }
    >
      <div className={cn("field", errors.content && "field--error")}>
        <label htmlFor="note-content" className="field__label">
          {T.NOTE_CONTENT}
        </label>
        <textarea
          id="note-content"
          rows={4}
          maxLength={1000}
          value={content}
          placeholder={T.NOTE_PLACEHOLDER}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={errors.content ? "note-content-help" : undefined}
          onChange={(e) => {
            setContent(e.target.value)
            setErrors((x) => ({ ...x, content: "" }))
          }}
          className="field__input min-h-28 rounded-lg py-3"
        />
        {errors.content && (
          <p id="note-content-help" className="field__help m-0">
            {errors.content}
          </p>
        )}
      </div>
      <div className={cn("field", errors.actionDate && "field--error")}>
        <label htmlFor="note-date" className="field__label">
          {T.NOTE_DATE}
        </label>
        <input
          id="note-date"
          type="date"
          value={actionDate}
          max={today}
          aria-invalid={errors.actionDate ? true : undefined}
          onChange={(e) => setActionDate(e.target.value)}
          className="field__input"
        />
        {errors.actionDate && (
          <p className="field__help m-0">{errors.actionDate}</p>
        )}
      </div>
      <ImagePicker
        label={T.NOTE_IMAGE}
        value={image}
        removeLabel={T.REMOVE_IMAGE}
        onChange={setImage}
        disabled={saving}
      />
      <FormError message={formError} />
    </Sheet>
  )
}

/**
 * H6 "Cây đã khỏi bệnh?" (Bảng 4.8; OQ-48): lượt khoẻ vừa gắn vào cây đang bệnh hoặc đang
 * điều trị. Đồng ý thì chuyển "Đã khỏi" (P6).
 */
export function RecoveredDialog({
  plant,
  open,
  onOpenChange,
  onRecovered,
}: {
  plant: { id: number; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecovered?: (plant: PlantDetail) => void
}) {
  const [saving, setSaving] = React.useState(false)

  async function confirm() {
    setSaving(true)
    try {
      const updated = await plantsApi.changeStatus(plant.id, "RECOVERED")
      notify(T.STATUS_SAVED)
      onRecovered?.(updated)
      onOpenChange(false)
    } catch (e) {
      notify(messageOf(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={T.RECOVERED_TITLE}
      description={<p className="m-0">{T.RECOVERED_BODY(plant.name)}</p>}
      confirmLabel={T.RECOVERED}
      cancelLabel={T.LATER}
      confirmVariant="default"
      onConfirm={confirm}
      busy={saving}
    />
  )
}

"use client"

import * as React from "react"

import { FormError } from "@/components/ds/field"
import { FilterChips } from "@/components/ds/filter-chips"
import { Sheet } from "@/components/ds/sheet"
import { notify } from "@/components/ds/toast"
import { Button } from "@/components/ui/button"
import { CLIENT_ERRORS, isApiError } from "@/lib/api"
import { plantsApi } from "@/lib/api/plants"
import { PLANTS_TEXT as T } from "@/lib/plants/text"
import type { PlantLink, ReminderSuggestion } from "@/lib/types/plants"

import { RecoveredDialog } from "./plant-sheets"

function messageOf(error: unknown): string {
  return isApiError(error) ? error.message : CLIENT_ERRORS.INTERNAL_ERROR
}

/** BR-14: sau 3, 7 hoặc 14 ngày. */
const RECHECK_DAYS = [3, 7, 14] as const

/** H4 "Nhắc tôi kiểm tra lại" (BR-14). */
export function RecheckSheet({
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
  const [days, setDays] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save() {
    if (days === null) return
    setSaving(true)
    setError(null)
    try {
      await plantsApi.createRecheck(plantId, days)
      notify(T.RECHECK_SET)
      setDays(null)
      onSaved()
      onOpenChange(false)
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
      title={T.REMIND_ME}
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
          <Button disabled={days === null || saving} onClick={save}>
            {T.SET_REMINDER}
          </Button>
        </>
      }
    >
      <FilterChips<number | null>
        label={T.REMIND_ME}
        options={RECHECK_DAYS.map((d) => ({
          value: d,
          label: T.RECHECK_AFTER(d),
        }))}
        value={days}
        onChange={setDays}
        className="flex-wrap"
      />
      <FormError message={error} />
    </Sheet>
  )
}

/**
 * H5 "Gợi ý lịch nhắc" (BR-18; diagnosis BR-26, 27): mặc định chọn hết; người dùng xác nhận
 * thì mới tạo (OQ-15).
 */
export function SuggestionsSheet({
  plantId,
  suggestions,
  open,
  onOpenChange,
  onCreated,
}: {
  plantId: number
  suggestions: ReminderSuggestion[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}) {
  const [chosen, setChosen] = React.useState<Set<ReminderSuggestion["type"]>>(
    () => new Set(suggestions.map((s) => s.type))
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await plantsApi.createSuggested(plantId, [...chosen])
      notify(T.REMINDERS_CREATED)
      onCreated?.()
      onOpenChange(false)
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
      title={T.SUGGEST_TITLE}
      busy={saving}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {T.SKIP}
          </Button>
          <Button disabled={chosen.size === 0 || saving} onClick={save}>
            {T.CREATE_REMINDERS}
          </Button>
        </>
      }
    >
      <ul className="m-0 grid list-none gap-2 p-0">
        {suggestions.map((s) => {
          const id = `suggestion-${s.type}`
          return (
            <li key={s.type} className="flex items-center gap-3">
              <input
                id={id}
                type="checkbox"
                checked={chosen.has(s.type)}
                onChange={() =>
                  setChosen((prev) => {
                    const next = new Set(prev)
                    if (next.has(s.type)) next.delete(s.type)
                    else next.add(s.type)
                    return next
                  })
                }
                className="size-5 shrink-0 cursor-pointer accent-[var(--olive-400)]"
              />
              <label htmlFor={id} className="cursor-pointer type-body">
                {T.SUGGEST[s.type](s.days)}
              </label>
            </li>
          )
        })}
      </ul>
      <FormError message={error} />
    </Sheet>
  )
}

/**
 * Các câu hỏi sau khi gắn lượt vào cây hoặc tạo cây (design/screens/my_plants.md): H6 "Cây đã
 * khỏi bệnh?" trước, rồi H5 "Gợi ý lịch nhắc". Gắn `key` mới cho mỗi lần lưu.
 */
export function PlantFollowUps({
  link,
  onDone,
}: {
  link: Pick<PlantLink, "plant" | "suggestRecovered" | "suggestions">
  onDone?: () => void
}) {
  const [step, setStep] = React.useState<"recovered" | "suggestions" | "done">(
    () =>
      link.suggestRecovered
        ? "recovered"
        : link.suggestions.length > 0
          ? "suggestions"
          : "done"
  )

  function next(from: "recovered" | "suggestions") {
    if (from === "recovered" && link.suggestions.length > 0) {
      setStep("suggestions")
    } else {
      setStep("done")
      onDone?.()
    }
  }

  return (
    <>
      {step === "recovered" && (
        <RecoveredDialog
          plant={link.plant}
          open
          onOpenChange={(open) => {
            if (!open) next("recovered")
          }}
        />
      )}
      {step === "suggestions" && (
        <SuggestionsSheet
          plantId={link.plant.id}
          suggestions={link.suggestions}
          open
          onOpenChange={(open) => {
            if (!open) next("suggestions")
          }}
        />
      )}
    </>
  )
}

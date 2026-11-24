"use client"

import * as React from "react"

import { Card } from "@/components/ds/card-stack"
import { FilterChips } from "@/components/ds/filter-chips"
import { Skeleton } from "@/components/ds/states"
import { Button } from "@/components/ui/button"
import type { ApiError } from "@/lib/api"
import { DIAGNOSIS_TEXT as T } from "@/lib/diagnosis/text"
import type { CropSummary } from "@/lib/types/library"

/**
 * Card "Loại cây" (S3; US-04, OQ-05): chọn một loại cây, bắt buộc. Lỗi hiện ngay dưới
 * hàng chip.
 */
export function CropPicker({
  crops,
  loadError,
  onReload,
  value,
  onChange,
  error,
  note = null,
}: {
  crops: CropSummary[] | undefined
  loadError: ApiError | undefined
  onReload: () => void
  value: number | null
  onChange: (cropId: number) => void
  error: string | null
  /** Dòng phụ dưới tiêu đề, vd "Chẩn đoán cho cây {tên}" khi loại cây bị khoá theo cây. */
  note?: string | null
}) {
  const errorId = React.useId()

  let body: React.ReactNode
  if (loadError && !crops) {
    body = (
      <div role="alert" className="grid justify-items-start gap-3">
        <p className="m-0 type-body">{loadError.message}</p>
        <Button variant="secondary" size="sm" onClick={onReload}>
          {T.RETRY}
        </Button>
      </div>
    )
  } else if (!crops) {
    body = (
      <div className="flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[46px] w-24 rounded-full" />
        ))}
      </div>
    )
  } else {
    body = (
      <div aria-describedby={error ? errorId : undefined}>
        <FilterChips<number | null>
          label={T.CROP_TITLE}
          options={crops.map((c) => ({ value: c.id, label: c.name }))}
          value={value}
          onChange={(id) => id !== null && onChange(id)}
          className="lg:flex-wrap"
        />
      </div>
    )
  }

  return (
    <Card className="grid gap-4">
      <h3 className="m-0 type-h3">{T.CROP_TITLE}</h3>
      {note && (
        <p className="m-0 -mt-2 text-ink-secondary type-body-sm">{note}</p>
      )}
      {body}
      {error && (
        <p id={errorId} role="alert" className="m-0 text-severe type-body-sm">
          {error}
        </p>
      )}
    </Card>
  )
}

"use client"

import * as React from "react"

import { FilterChips, type ChipOption } from "@/components/ds/filter-chips"
import { SearchField } from "@/components/ds/search-field"
import { RESULT_STATUS_DISPLAY } from "@/lib/diagnosis/text"
import { HISTORY_TEXT as T } from "@/lib/history/text"
import type { ResultType } from "@/lib/types/diagnosis"
import type { CropSummary } from "@/lib/types/library"

/** Cùng giới hạn với API (H1). */
const QUERY_MAX_LENGTH = 100

const RESULT_OPTIONS: ChipOption<ResultType | null>[] = [
  { value: null, label: T.ALL },
  ...(["DISEASE", "HEALTHY", "UNCERTAIN"] as const).map((value) => ({
    value,
    label: RESULT_STATUS_DISPLAY[value].label,
  })),
]

interface HistoryFiltersProps {
  text: string
  onTextChange: (value: string) => void
  crops: CropSummary[] | undefined
  cropId: number | null
  onCropChange: (cropId: number | null) => void
  resultType: ResultType | null
  onResultTypeChange: (resultType: ResultType | null) => void
  fromDate: string
  toDate: string
  onDateChange: (range: { fromDate: string; toDate: string }) => void
  /** Câu lỗi khi ngày bắt đầu sau ngày kết thúc. */
  dateError: string | null
}

/**
 * Hàng lọc của S1 (BR-03; design/screens/history.md): ô tìm + chip loại cây; chip dạng kết
 * quả + hai ô ngày (OQ-42).
 */
export function HistoryFilters(props: HistoryFiltersProps) {
  const dateErrorId = React.useId()
  const cropOptions: ChipOption<number | null>[] = [
    { value: null, label: T.ALL },
    ...(props.crops ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="grid gap-3 lg:gap-4">
      <div className="grid gap-3 lg:flex lg:items-center lg:gap-5">
        <SearchField
          value={props.text}
          onChange={props.onTextChange}
          label={T.SEARCH_LABEL}
          clearLabel={T.CLEAR_SEARCH}
          maxLength={QUERY_MAX_LENGTH}
          className="lg:w-[480px] lg:flex-none"
        />
        <FilterChips
          options={cropOptions}
          value={props.cropId}
          onChange={props.onCropChange}
          label={T.CROP_FILTER_LABEL}
          className="min-w-0"
        />
      </div>
      <div className="grid gap-3 lg:flex lg:items-end lg:justify-between lg:gap-5">
        <FilterChips
          options={RESULT_OPTIONS}
          value={props.resultType}
          onChange={props.onResultTypeChange}
          label={T.RESULT_FILTER_LABEL}
          className="min-w-0"
        />
        <div className="grid gap-1">
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <DateField
              label={T.FROM_DATE}
              value={props.fromDate}
              max={props.toDate || undefined}
              invalid={Boolean(props.dateError)}
              describedBy={props.dateError ? dateErrorId : undefined}
              onChange={(fromDate) =>
                props.onDateChange({ fromDate, toDate: props.toDate })
              }
            />
            <DateField
              label={T.TO_DATE}
              value={props.toDate}
              min={props.fromDate || undefined}
              invalid={Boolean(props.dateError)}
              describedBy={props.dateError ? dateErrorId : undefined}
              onChange={(toDate) =>
                props.onDateChange({ fromDate: props.fromDate, toDate })
              }
            />
          </div>
          {props.dateError && (
            <p
              id={dateErrorId}
              role="alert"
              className="m-0 px-2 text-severe type-body-sm"
            >
              {props.dateError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Ô ngày `input type="date"` (design/05 `.field`), nền trắng vì đặt trên nền xám. */
function DateField({
  label,
  value,
  min,
  max,
  invalid,
  describedBy,
  onChange,
}: {
  label: string
  value: string
  min?: string
  max?: string
  invalid: boolean
  describedBy?: string
  onChange: (value: string) => void
}) {
  const id = React.useId()
  return (
    <div className={invalid ? "field field--error" : "field"}>
      <label htmlFor={id} className="field__label px-2">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className="field__input min-w-0 bg-surface lg:w-[180px]"
      />
    </div>
  )
}

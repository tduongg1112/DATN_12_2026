"use client"

import * as React from "react"

import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { cn } from "@/lib/utils"

/** Nhãn + nhóm chip + lỗi dưới nhóm (cùng cách của form cây). */
export function ChipField({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string
  label: string
  error?: string
  help?: string
  children: React.ReactNode
}) {
  const message = error ?? help
  return (
    <div id={id} className={cn("field", error && "field--error")}>
      <span id={`${id}-label`} className="field__label">
        {label}
      </span>
      <div
        aria-labelledby={`${id}-label`}
        aria-describedby={message ? `${id}-help` : undefined}
      >
        {children}
      </div>
      {message && (
        <p id={`${id}-help`} className="field__help m-0">
          {message}
        </p>
      )}
    </div>
  )
}

/** Ô nhiều dòng (design/05: bo 24), có đếm ký tự khi cần. */
export function TextAreaField({
  id,
  label,
  value,
  maxLength,
  rows,
  counter,
  error,
  help,
  onChange,
}: {
  id: string
  label: string
  value: string
  maxLength: number
  rows: number
  counter?: boolean
  error?: string
  /** Dòng gợi ý dưới ô khi không có lỗi. */
  help?: string
  onChange: (value: string) => void
}) {
  const message = error ?? help
  const helpId = message ? `${id}-help` : undefined
  return (
    <div className={cn("field", error && "field--error")}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        {counter && (
          <span className="text-ink-secondary type-caption" aria-hidden>
            {T.COUNTER(value.length, maxLength)}
          </span>
        )}
      </div>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={helpId}
        onChange={(e) => onChange(e.target.value)}
        className="field__input min-h-24 rounded-lg py-3"
      />
      {message && (
        <p id={helpId} className="field__help m-0">
          {message}
        </p>
      )}
    </div>
  )
}

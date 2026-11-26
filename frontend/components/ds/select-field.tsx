"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  error?: string
  help?: string
  disabled?: boolean
  /** Nội dung đặt dưới ô, sau dòng gợi ý (vd nút "Thử lại"). */
  footer?: React.ReactNode
  className?: string
}

/**
 * Ô chọn viên thuốc có `chevron-down` (design/05 "Biểu mẫu": nhiều mục dùng ô chọn dạng
 * viên thuốc). Dùng thẻ `select` gốc để dùng được bằng bàn phím và trên điện thoại.
 */
export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  error,
  help,
  disabled,
  footer,
  className,
}: SelectFieldProps) {
  const message = error ?? help
  const helpId = message ? `${id}-help` : undefined
  return (
    <div className={cn("field", error && "field--error", className)}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={helpId}
          onChange={(e) => onChange(e.target.value)}
          className="field__input cursor-pointer appearance-none truncate pr-12"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={20}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-ink-secondary"
        />
      </div>
      {message && (
        <p id={helpId} className="field__help m-0">
          {message}
        </p>
      )}
      {footer}
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"

export interface ChipOption<T> {
  value: T
  label: string
}

interface FilterChipsProps<T> {
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Tên nhóm cho trình đọc màn hình. */
  label: string
  className?: string
}

/**
 * Hàng chip lọc, chọn một (design/05 "Chip"): cao 46, `aria-pressed`. Mobile cuộn ngang,
 * không xuống dòng.
 */
export function FilterChips<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
  className,
}: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("chips", className)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className="chip"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

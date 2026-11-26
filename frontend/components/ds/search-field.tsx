"use client"

import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** Tên của ô cho trình đọc màn hình, cũng là chữ gợi ý trong ô. */
  label: string
  /** `aria-label` của nút xoá. */
  clearLabel: string
  maxLength?: number
  className?: string
}

/**
 * Ô tìm kiếm viên thuốc 52 (design/05 "Biểu mẫu", `.field__input`) có icon `search` đầu ô.
 * Ô đứng riêng, không nằm trong form nên dùng `aria-label` thay nhãn hiện
 * (design/screens/disease_library.md). Đặt trên nền xám nên đổi nền ô thành trắng.
 */
export function SearchField({
  value,
  onChange,
  label,
  clearLabel,
  maxLength,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-secondary"
      />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label={label}
        placeholder={label}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field__input bg-surface pr-14 pl-12 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          className="icon-btn icon-btn--sm absolute top-1/2 right-1 -translate-y-1/2 bg-transparent"
          aria-label={clearLabel}
          onClick={() => onChange("")}
        >
          <X size={20} aria-hidden />
        </button>
      )}
    </div>
  )
}

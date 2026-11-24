"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  /** Tên vùng điều hướng, nút trước, nút sau (cho trình đọc màn hình). */
  labels: { nav: string; prev: string; next: string }
  className?: string
}

/** Số trang hiển thị: trang đầu, cuối và hai bên trang hiện tại; chỗ trống là `null`. */
export function pageItems(page: number, pages: number): (number | null)[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1])
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b)
  const items: (number | null)[] = []
  for (const p of sorted) {
    const last = items[items.length - 1]
    if (typeof last === "number" && p - last > 1) items.push(null)
    items.push(p)
  }
  return items
}

/**
 * Phân trang của bảng quản trị (design/05): nút tròn `.icon-btn--sm --outline` và số trang
 * dạng chip nhỏ. Một trang thì không hiện.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  labels,
  className,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <nav
      aria-label={labels.nav}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <button
        type="button"
        className="icon-btn icon-btn--sm icon-btn--outline"
        aria-label={labels.prev}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={20} aria-hidden />
      </button>
      {pageItems(page, pages).map((p, i) =>
        p === null ? (
          <span
            key={`gap-${i}`}
            className="px-1 text-ink-secondary type-body-sm"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className="chip h-11 min-w-11 justify-center px-3"
            aria-current={p === page ? "page" : undefined}
            aria-pressed={p === page}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="icon-btn icon-btn--sm icon-btn--outline"
        aria-label={labels.next}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={20} aria-hidden />
      </button>
    </nav>
  )
}

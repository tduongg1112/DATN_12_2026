"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { CATALOG_TEXT as T } from "@/lib/catalog/text"
import { ROUTES } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { href: ROUTES.catalog, label: T.DISEASES },
  { href: ROUTES.catalogCrops, label: T.CROPS },
  { href: ROUTES.catalogLabels, label: T.LABELS },
] as const

/**
 * Hàng chip chuyển giữa ba phần của khu Danh mục (design/screens/catalog.md): liên kết,
 * `aria-current="page"` cho phần đang xem. Mobile cuộn ngang (design/05 "Chip").
 */
export function CatalogNav({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label={T.NAV_LABEL} className={cn("chips", className)}>
      {SECTIONS.map((s) => {
        const active = pathname === s.href
        return (
          <Link
            key={s.href}
            href={s.href}
            // Liên kết không dùng aria-pressed: tô như `.chip[aria-pressed]` bằng cùng token.
            className={cn(
              "chip",
              active && "bg-[var(--surface-inverse)] text-[var(--text-inverse)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}

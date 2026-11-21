"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { isNavActive, type NavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

interface DockProps {
  items: NavItem[]
  /** Tên vùng điều hướng cho trình đọc màn hình. */
  label?: string
  className?: string
}

/**
 * Điều hướng chính (design/05 "Dock"). Mobile: nổi giữa đáy, có safe-area.
 * Desktop (≥1024, trong `.app-shell`): dọc, dính bên trái, có tooltip khi hover/focus.
 */
export function Dock({
  items,
  label = "Điều hướng chính",
  className,
}: DockProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("dock dock--float", className)} aria-label={label}>
      {items.map((item) => {
        const active = isNavActive(item, pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="dock__btn group"
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={24} aria-hidden />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-full z-[var(--z-toast)] ml-3 hidden -translate-y-1/2 rounded-full bg-inverse px-3 py-2 whitespace-nowrap text-[var(--text-inverse)] opacity-0 transition-opacity duration-[var(--dur-fast)] type-caption group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

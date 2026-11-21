import * as React from "react"

import { cn } from "@/lib/utils"

type CardVariant = "default" | "muted" | "inverse" | "accent" | "pill"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Vết lõm ở mép trên, dùng cho card đầu cụm (design/03). */
  notch?: boolean
}

/** Card (design/05): bo 32, padding 20, desktop 32, không viền, không bóng. */
export function Card({
  variant = "default",
  notch = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "card",
        variant !== "default" && `card--${variant}`,
        variant !== "pill" && "lg:p-8",
        notch && "card--notch",
        className
      )}
      {...props}
    />
  )
}

/** Màu nền phía sau cụm card. Seam và notch phải "khoét" đúng màu này. */
export type SeamBackground = "page" | "hero" | "detail"

const SEAM_BG: Record<SeamBackground, string> = {
  page: "var(--bg-page)",
  hero: "var(--bg-hero)",
  detail: "var(--neutral-150)",
}

interface CardStackProps {
  children: React.ReactNode
  /** Nền phía sau cụm card (khuôn trang). */
  background?: SeamBackground
  /** Thêm notch cho card đầu tiên. Mặc định có. */
  notch?: boolean
  className?: string
}

/**
 * Cụm card xếp dọc nối bằng `seam`, card đầu có `notch` (design/03, luật cứng 9).
 * Desktop (≥1024): bỏ seam, dùng khoảng cách 20px.
 */
export function CardStack({
  children,
  background = "page",
  notch = true,
  className,
}: CardStackProps) {
  const items = React.Children.toArray(children).filter(React.isValidElement)

  return (
    <div
      className={cn("stack lg:gap-[var(--gap-card-desktop)]", className)}
      style={{ "--seam-bg": SEAM_BG[background] } as React.CSSProperties}
    >
      {items.map((child, index) => (
        <React.Fragment key={child.key ?? index}>
          {index > 0 && <div className="seam lg:hidden" aria-hidden />}
          {index === 0 && notch
            ? React.cloneElement(child as React.ReactElement<CardProps>, {
                notch: true,
              })
            : child}
        </React.Fragment>
      ))}
    </div>
  )
}

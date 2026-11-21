import { UserRound } from "lucide-react"

import { cn } from "@/lib/utils"

interface AvatarProps {
  src?: string | null
  /** md: 46 (thanh đầu trang, design/05); lg: 84 (trang hồ sơ). */
  size?: "md" | "lg"
  className?: string
}

const SIZE = {
  md: { box: "size-[46px]", icon: 22 },
  lg: { box: "size-21", icon: 40 },
} as const

/**
 * Ảnh đại diện tròn (design/05 `.avatar`). Không có ảnh thì hiện icon trên nền xám.
 * Dùng thẻ `img` vì ảnh đến từ URL do API trả (có thể là presigned URL), không qua
 * bộ tối ưu ảnh của Next (fe-coding-rules mục 3, TD-02).
 */
export function Avatar({ src, size = "md", className }: AvatarProps) {
  const { box, icon } = SIZE[size]
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cn("avatar", box, className)} />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "avatar grid place-items-center text-ink-secondary",
        box,
        className
      )}
    >
      <UserRound size={icon} />
    </span>
  )
}

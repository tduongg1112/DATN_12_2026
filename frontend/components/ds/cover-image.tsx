"use client"

import * as React from "react"
import { Leaf } from "lucide-react"

import { cn } from "@/lib/utils"

interface CoverImageProps {
  src: string | null
  alt: string
  /** Kích thước icon của ảnh thay thế. */
  iconSize?: number
  className?: string
  /** Phần tử đè lên ảnh (nhãn, viên trạng thái). */
  children?: React.ReactNode
}

/**
 * Ảnh trong `.photo-card` (design/05 "Ảnh"). Không có ảnh, hoặc ảnh lỗi (presigned URL
 * hết hạn), thì hiện khối xám có icon `leaf`. Dùng thẻ `img` vì ảnh đến từ URL do API trả,
 * không qua bộ tối ưu ảnh của Next (fe-coding-rules mục 3, TD-02).
 */
export function CoverImage({
  src,
  alt,
  iconSize = 32,
  className,
  children,
}: CoverImageProps) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const showImage = src !== null && src !== failedSrc

  return (
    <div className={cn("photo-card", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          aria-hidden
          className="grid h-full w-full place-items-center text-ink-tertiary"
        >
          <Leaf size={iconSize} />
        </div>
      )}
      {children}
    </div>
  )
}

"use client"

import * as React from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageDropzoneProps {
  /** Mở hộp chọn tệp (input file do nơi dùng giữ). */
  onBrowse: () => void
  /** Tệp được kéo thả vào vùng (desktop). */
  onDropFile: (file: File) => void
  title: string
  browseLabel: string
  hint: string
  /** Câu lỗi hiện ngay dưới vùng (vd sai định dạng). */
  error?: string | null
  disabled?: boolean
  className?: string
}

/**
 * Vùng tải ảnh (design/05 `.dropzone`): bấm vào đâu cũng mở hộp chọn tệp, kéo thả được trên
 * desktop. Bàn phím dùng nút bên trong.
 */
export function ImageDropzone({
  onBrowse,
  onDropFile,
  title,
  browseLabel,
  hint,
  error,
  disabled = false,
  className,
}: ImageDropzoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const errorId = React.useId()

  return (
    <div className={cn("grid gap-2", className)}>
      <div
        className={cn(
          "dropzone min-h-[360px] content-center transition-colors",
          dragging && "border-solid bg-[var(--olive-100)]",
          disabled && "pointer-events-none opacity-60"
        )}
        onClick={onBrowse}
        onDragOver={(e) => {
          e.preventDefault()
          if (!dragging) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file && !disabled) onDropFile(file)
        }}
      >
        <span className="icon-tile" aria-hidden>
          <Upload size={24} />
        </span>
        <p className="m-0 type-body">{title}</p>
        <Button
          type="button"
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
        >
          {browseLabel}
        </Button>
        <p className="m-0 text-ink-secondary type-caption">{hint}</p>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="m-0 px-2 text-severe type-body-sm"
        >
          {error}
        </p>
      )}
    </div>
  )
}

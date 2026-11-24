"use client"

import * as React from "react"
import { Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DIAGNOSIS_TEXT } from "@/lib/diagnosis/text"
import { device, IMAGE_RULES, validateImageFile } from "@/lib/device"
import { cn } from "@/lib/utils"

interface ImagePickerProps {
  label: string
  /** Ảnh mới đã chọn (đã nén), hoặc null. */
  value: Blob | null
  onChange: (image: Blob | null) => void
  /** Ảnh đang có trên máy chủ (khi sửa), hiện khi chưa chọn ảnh mới. */
  currentUrl?: string | null
  /** Nhãn của nút bỏ ảnh mới chọn (chỉ cho trình đọc màn hình). */
  removeLabel: string
  disabled?: boolean
  className?: string
}

/**
 * Chọn một ảnh JPG/PNG ≤ 10 MB (design/screens/my_plants.md `ImagePicker`): `.dropzone` thu
 * nhỏ, ảnh xem trước. Ảnh được nén trước khi gửi (TD-17). Sai định dạng thì báo câu BR-04.
 */
export function ImagePicker({
  label,
  value,
  onChange,
  currentUrl,
  removeLabel,
  disabled = false,
  className,
}: ImagePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const labelId = React.useId()
  const errorId = React.useId()
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const previewUrl = React.useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value]
  )
  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )
  const shown = previewUrl ?? currentUrl ?? null

  async function handleFile(file: File) {
    const invalid = validateImageFile(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      onChange(await device.images.compress(file))
    } catch {
      setError(IMAGE_RULES.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <span id={labelId} className="field__label">
        {label}
      </span>
      <div className="flex items-center gap-4">
        {shown && (
          <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown} alt="" className="size-full object-cover" />
            {value && (
              <button
                type="button"
                className="icon-btn icon-btn--sm absolute top-1 right-1 size-8 bg-surface"
                aria-label={removeLabel}
                onClick={() => onChange(null)}
                disabled={disabled}
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </div>
        )}
        <div
          className={cn(
            "dropzone flex-1 justify-items-start gap-2 p-4 text-left",
            (disabled || busy) && "pointer-events-none opacity-60"
          )}
          onClick={() => inputRef.current?.click()}
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || busy}
            aria-describedby={error ? `${labelId} ${errorId}` : labelId}
          >
            <Upload aria-hidden />
            {DIAGNOSIS_TEXT.UPLOAD}
          </Button>
          <p className="m-0 text-ink-secondary type-caption">
            {DIAGNOSIS_TEXT.FILE_RULES}
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_RULES.types.join(",")}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) void handleFile(file)
        }}
      />
      {error && (
        <p id={errorId} role="alert" className="m-0 text-severe type-body-sm">
          {error}
        </p>
      )}
    </div>
  )
}

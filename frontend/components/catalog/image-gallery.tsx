"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, Upload, X } from "lucide-react"

import { CoverImage } from "@/components/ds/cover-image"
import { Button } from "@/components/ui/button"
import {
  CATALOG_TEXT as T,
  LIMITS,
  MAX_DISEASE_IMAGES,
} from "@/lib/catalog/text"
import { device, IMAGE_RULES, validateImageFile } from "@/lib/device"
import { DIAGNOSIS_TEXT } from "@/lib/diagnosis/text"
import type { GalleryImage } from "@/lib/types/catalog"
import { cn } from "@/lib/utils"

interface ImageGalleryProps {
  images: GalleryImage[]
  onChange: (images: GalleryImage[]) => void
  /** Lỗi từ API của trường `images` hoặc chú thích. */
  error?: string
  disabled?: boolean
}

let keySeed = 0
const nextKey = () => `new-${++keySeed}`

/**
 * "Ảnh minh hoạ" của form bệnh (design/screens/catalog.md `ImageGallery`; ERD-doc 4.4): nhiều
 * ảnh, ảnh đầu là ảnh bìa, chú thích, đổi thứ tự bằng nút (dùng được bằng bàn phím), bỏ ảnh.
 * Ảnh được nén trước khi gửi (TD-17). Tối đa 10 ảnh (OQ-60).
 */
export function ImageGallery({
  images,
  onChange,
  error,
  disabled = false,
}: ImageGalleryProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const errorId = React.useId()
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const full = images.length >= MAX_DISEASE_IMAGES

  async function addFiles(files: File[]) {
    const room = MAX_DISEASE_IMAGES - images.length
    const accepted: GalleryImage[] = []
    let problem: string | null = files.length > room ? T.MAX_IMAGES : null
    setBusy(true)
    for (const file of files.slice(0, Math.max(room, 0))) {
      const invalid = validateImageFile(file)
      if (invalid) {
        problem = invalid
        continue
      }
      try {
        const blob = await device.images.compress(file)
        accepted.push({
          key: nextKey(),
          kind: "new",
          blob,
          url: URL.createObjectURL(blob),
          caption: "",
        })
      } catch {
        problem = IMAGE_RULES.message
      }
    }
    setBusy(false)
    setFileError(problem)
    if (accepted.length > 0) onChange([...images, ...accepted])
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  function remove(index: number) {
    const item = images[index]
    if (item.kind === "new") URL.revokeObjectURL(item.url)
    onChange(images.filter((_, i) => i !== index))
    setFileError(null)
  }

  function setCaption(index: number, caption: string) {
    onChange(images.map((img, i) => (i === index ? { ...img, caption } : img)))
  }

  const message = error ?? fileError

  return (
    <div className="grid gap-3">
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-3">
        {images.map((image, i) => (
          <li key={image.key} className="grid content-start gap-2">
            <CoverImage
              src={image.url}
              alt={image.caption || `${T.GROUP_IMAGES} ${i + 1}`}
              iconSize={28}
              className="aspect-[4/3] rounded-md"
            >
              {i === 0 && (
                <span className="tag absolute top-2 left-2">{T.COVER}</span>
              )}
              <button
                type="button"
                className="icon-btn icon-btn--sm absolute top-2 right-2 size-9 bg-surface"
                aria-label={`${T.REMOVE_IMAGE} ${i + 1}`}
                onClick={() => remove(i)}
                disabled={disabled}
              >
                <X size={16} aria-hidden />
              </button>
            </CoverImage>
            <input
              type="text"
              aria-label={`${T.CAPTION} ${i + 1}`}
              placeholder={T.CAPTION}
              maxLength={LIMITS.caption}
              value={image.caption}
              disabled={disabled}
              onChange={(e) => setCaption(i, e.target.value)}
              className="field__input h-11"
            />
            <div className="flex justify-between gap-2">
              <button
                type="button"
                className="icon-btn icon-btn--sm icon-btn--outline"
                aria-label={`${T.MOVE_EARLIER} ${i + 1}`}
                disabled={disabled || i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--sm icon-btn--outline"
                aria-label={`${T.MOVE_LATER} ${i + 1}`}
                disabled={disabled || i === images.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {!full && (
          <li>
            <div
              className={cn(
                "dropzone aspect-[4/3] content-center justify-items-center gap-2 p-4",
                (disabled || busy) && "pointer-events-none opacity-60"
              )}
              onClick={() => inputRef.current?.click()}
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled || busy}
                aria-describedby={message ? errorId : undefined}
              >
                <Upload aria-hidden />
                {DIAGNOSIS_TEXT.UPLOAD}
              </Button>
              <p className="m-0 text-center text-ink-secondary type-caption">
                {DIAGNOSIS_TEXT.FILE_RULES}
              </p>
            </div>
          </li>
        )}
      </ul>
      {full && (
        <p className="m-0 text-ink-secondary type-caption">{T.MAX_IMAGES}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_RULES.types.join(",")}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ""
          if (files.length > 0) void addFiles(files)
        }}
      />
      {message && (
        <p id={errorId} role="alert" className="m-0 text-severe type-body-sm">
          {message}
        </p>
      )}
    </div>
  )
}

"use client"

import * as React from "react"
import { RotateCw } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { Button } from "@/components/ui/button"
import {
  cropRect,
  cssFilter,
  drawRotated,
  EDIT_LIMITS,
  normalizeEdit,
  panEdit,
  rotateEdit,
  type EditState,
} from "@/lib/diagnosis/image-edit"
import { DIAGNOSIS_TEXT as T } from "@/lib/diagnosis/text"
import { cn } from "@/lib/utils"

type SetEdit = React.Dispatch<React.SetStateAction<EditState>>

/** Khung cắt cách mép vùng ảnh 8%, phần ngoài khung làm tối. */
const FRAME_INSET = 0.08
/** Mỗi lần bấm phím mũi tên dịch ảnh 5% khung. */
const KEY_STEP = 0.05

/**
 * Vùng ảnh vuông của S3 (BR-03): ảnh nằm dưới khung vuông, kéo để dịch. Ảnh xem trước vẽ
 * bằng canvas, độ sáng và tương phản xem trước bằng bộ lọc CSS; ảnh gửi đi xuất bằng
 * `exportEdited` với cùng công thức.
 */
export function ImageEditor({
  image,
  edit,
  onChange,
  disabled = false,
  className,
}: {
  image: ImageBitmap
  edit: EditState
  onChange: SetEdit
  disabled?: boolean
  className?: string
}) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const dragRef = React.useRef<{ x: number; y: number } | null>(null)
  const [boxSize, setBoxSize] = React.useState(0)

  React.useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) =>
      setBoxSize(entry.contentRect.width)
    )
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || boxSize === 0) return
    const size = Math.round(boxSize * (window.devicePixelRatio || 1))
    if (canvas.width !== size) {
      canvas.width = size
      canvas.height = size
    }
    const { x, y, side } = cropRect(edit, image)
    const offset = size * FRAME_INSET
    const k = (size - 2 * offset) / side
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingQuality = "high"
    ctx.setTransform(k, 0, 0, k, offset - x * k, offset - y * k)
    drawRotated(ctx, image, edit.rotation)
  }, [image, edit, boxSize])

  const frameSize = boxSize * (1 - 2 * FRAME_INSET)
  const pan = (dx: number, dy: number) =>
    onChange((prev) => panEdit(prev, image, dx, dy))

  return (
    <div
      ref={boxRef}
      role="application"
      aria-label={T.IMAGE_AREA}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "photo-card relative aspect-square w-full touch-none bg-inverse select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        !disabled && "cursor-grab active:cursor-grabbing",
        className
      )}
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture(e.pointerId)
        dragRef.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        const last = dragRef.current
        if (!last || frameSize === 0) return
        dragRef.current = { x: e.clientX, y: e.clientY }
        pan((e.clientX - last.x) / frameSize, (e.clientY - last.y) / frameSize)
      }}
      onPointerUp={() => {
        dragRef.current = null
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
      onKeyDown={(e) => {
        if (disabled) return
        const step: Record<string, [number, number]> = {
          ArrowLeft: [-KEY_STEP, 0],
          ArrowRight: [KEY_STEP, 0],
          ArrowUp: [0, -KEY_STEP],
          ArrowDown: [0, KEY_STEP],
        }
        const move = step[e.key]
        if (!move) return
        e.preventDefault()
        pan(move[0], move[1])
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        style={{ filter: cssFilter(edit) }}
        aria-hidden
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%] rounded-md border-2 border-[var(--neutral-0)] shadow-[0_0_0_100vmax_color-mix(in_srgb,var(--neutral-900)_55%,transparent)]"
      />
    </div>
  )
}

/** Card "Chỉnh ảnh" (S3): xoay, phóng to, độ sáng, độ tương phản, chụp lại. */
export function EditTools({
  edit,
  onChange,
  image,
  onRetake,
}: {
  edit: EditState
  onChange: SetEdit
  image: ImageBitmap
  onRetake: () => void
}) {
  return (
    <Card className="grid gap-4">
      <h3 className="m-0 type-h3">{T.EDIT_TITLE}</h3>
      <div className="flex flex-wrap gap-2 lg:contents">
        <Button
          variant="secondary"
          className="lg:justify-self-start"
          onClick={() => onChange(rotateEdit)}
        >
          <RotateCw aria-hidden />
          {T.ROTATE}
        </Button>
        <Button
          variant="secondary"
          className="lg:order-last lg:w-full"
          onClick={onRetake}
        >
          {T.RETAKE}
        </Button>
      </div>
      <RangeField
        label={T.ZOOM}
        value={edit.zoom}
        limits={EDIT_LIMITS.zoom}
        format={(v) => `${v.toFixed(1)}×`}
        onValue={(zoom) =>
          onChange((prev) => normalizeEdit({ ...prev, zoom }, image))
        }
      />
      <RangeField
        label={T.BRIGHTNESS}
        value={edit.brightness}
        limits={EDIT_LIMITS.brightness}
        format={(v) => `${v}%`}
        onValue={(brightness) => onChange((prev) => ({ ...prev, brightness }))}
      />
      <RangeField
        label={T.CONTRAST}
        value={edit.contrast}
        limits={EDIT_LIMITS.contrast}
        format={(v) => `${v}%`}
        onValue={(contrast) => onChange((prev) => ({ ...prev, contrast }))}
      />
    </Card>
  )
}

/** Thanh trượt có nhãn và số; `input type="range"` nên dùng được bằng bàn phím. */
function RangeField({
  label,
  value,
  limits,
  format,
  onValue,
}: {
  label: string
  value: number
  limits: { min: number; max: number; step: number }
  format: (value: number) => string
  onValue: (value: number) => void
}) {
  const id = React.useId()
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="type-label">
          {label}
        </label>
        <output htmlFor={id} className="text-ink-secondary type-num-sm">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onValue(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-[var(--olive-400)]"
      />
    </div>
  )
}

"use client"

import * as React from "react"
import { CameraOff, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DIAGNOSIS_TEXT as T } from "@/lib/diagnosis/text"
import { CameraError, device, type CameraSession } from "@/lib/device"

type CameraState =
  | { status: "starting" }
  | { status: "ready" }
  | { status: "capturing" }
  | { status: "error"; denied: boolean }

interface CameraViewProps {
  /** Ảnh vừa chụp (camera đã tắt). */
  onCapture: (image: Blob) => void
  /** Chuyển sang chọn tệp. Gọi ngay trong sự kiện bấm để trình duyệt cho mở hộp chọn tệp. */
  onUpload: () => void
  onClose: () => void
}

/**
 * S2 Máy ảnh (BR-02, BR-05; design/05 "Màn chụp ảnh"): phủ toàn màn, nền đen, không dock,
 * khung ngắm vuông. Camera chỉ gọi qua `lib/device`.
 */
export function CameraView({ onCapture, onUpload, onClose }: CameraViewProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const sessionRef = React.useRef<CameraSession | null>(null)
  const [state, setState] = React.useState<CameraState>(() =>
    device.camera.isSupported()
      ? { status: "starting" }
      : { status: "error", denied: false }
  )

  React.useEffect(() => {
    const video = videoRef.current
    if (!video || !device.camera.isSupported()) return
    let cancelled = false
    device.camera.start(video).then(
      (session) => {
        if (cancelled) {
          session.stop()
          return
        }
        sessionRef.current = session
        setState({ status: "ready" })
      },
      (error: unknown) => {
        if (cancelled) return
        const denied =
          error instanceof CameraError && error.kind === "permission_denied"
        setState({ status: "error", denied })
      }
    )
    return () => {
      cancelled = true
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function capture() {
    const session = sessionRef.current
    if (!session || state.status !== "ready") return
    setState({ status: "capturing" })
    try {
      const image = await session.capture()
      session.stop()
      sessionRef.current = null
      onCapture(image)
    } catch {
      setState({ status: "error", denied: false })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T.TAKE_PHOTO}
      className="fixed inset-0 z-[var(--z-sheet)] flex flex-col bg-inverse text-[var(--text-inverse)]"
    >
      {/* Desktop: khung video tối đa 720 × 720 ở giữa; mobile: video phủ kín. */}
      <div className="absolute inset-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:aspect-square lg:w-[min(720px,calc(100dvh-2*var(--s-8)))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:overflow-hidden lg:rounded-xl">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
          aria-hidden
        />
      </div>

      <header className="relative flex items-center justify-between px-[var(--gutter-mobile)] pt-[calc(var(--s-3)+env(safe-area-inset-top,0px))] lg:px-8 lg:pt-5">
        <button
          type="button"
          className="icon-btn bg-surface text-ink"
          aria-label={T.CLOSE_CAMERA}
          onClick={onClose}
          autoFocus
        >
          <X size={24} aria-hidden />
        </button>
        <h2 className="m-0 type-title">{T.TAKE_PHOTO}</h2>
        <span className="size-[var(--ctl-md)]" aria-hidden />
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-[var(--gutter-mobile)]">
        {state.status === "error" ? (
          <div
            role="alert"
            className="card grid max-w-[400px] justify-items-center gap-4 text-center text-ink"
          >
            <span className="icon-tile icon-tile--neutral" aria-hidden>
              <CameraOff size={28} />
            </span>
            <p className="m-0 type-body">
              {state.denied ? T.CAMERA_DENIED : T.CAMERA_UNAVAILABLE}
            </p>
            <div className="grid w-full gap-2">
              <Button onClick={onUpload}>{T.UPLOAD}</Button>
              <Button variant="secondary" onClick={onClose}>
                {T.CLOSE}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="aspect-square w-[min(80vw,80dvh)] rounded-xl border-2 border-[var(--neutral-0)] lg:w-[min(576px,calc(80dvh-2*var(--s-8)))]"
              aria-hidden
            />
            <p className="m-0 type-body-sm" aria-live="polite">
              {state.status === "starting" ? T.CAMERA_STARTING : T.FRAME_HINT}
            </p>
          </>
        )}
      </div>

      {state.status !== "error" && (
        <footer className="relative flex items-center justify-center gap-10 pt-4 pb-[calc(var(--s-8)+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            className="icon-btn icon-btn--dark"
            aria-label={T.UPLOAD}
            onClick={onUpload}
          >
            <Upload size={24} aria-hidden />
          </button>
          <button
            type="button"
            className="size-[var(--ctl-lg)] rounded-full bg-surface ring-4 ring-[var(--neutral-0)]/40 ring-offset-4 ring-offset-[var(--neutral-900)] transition-transform outline-none focus-visible:ring-[var(--olive-400)] active:scale-95 disabled:opacity-60"
            aria-label={T.SHUTTER}
            onClick={capture}
            disabled={state.status !== "ready"}
          />
          <span className="size-[var(--ctl-md)]" aria-hidden />
        </footer>
      )}
    </div>
  )
}

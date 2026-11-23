"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"

import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  /** Đang thực hiện: khoá hai nút, không cho đóng. */
  busy?: boolean
}

/**
 * Hộp thoại xác nhận (design/05 "Hộp thoại"): desktop là card giữa màn rộng tối đa 440
 * (giá trị của `.dialog`, viết bằng tiện ích để dùng được tiền tố `lg:`),
 * mobile là sheet trượt từ đáy. Tiêu điểm vào nút huỷ khi mở; `Esc` hoặc bấm nền phủ thì
 * đóng. Nút xác nhận dùng kiểu nguy hiểm (`.btn--danger`).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  busy = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-sheet)] bg-[color-mix(in_srgb,var(--neutral-900)_40%,transparent)] transition-opacity duration-[var(--dur-base)] data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          role="alertdialog"
          initialFocus={cancelRef}
          className="sheet fixed inset-x-0 bottom-0 z-[var(--z-sheet)] transition-[transform,opacity] duration-[var(--dur-base)] outline-none data-ending-style:translate-y-full data-starting-style:translate-y-full lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[min(440px,calc(100vw-2*var(--gutter-mobile)))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl lg:p-8 lg:shadow-none lg:data-ending-style:-translate-y-1/2 lg:data-ending-style:opacity-0 lg:data-starting-style:-translate-y-1/2 lg:data-starting-style:opacity-0"
        >
          <Dialog.Title className="m-0 type-h3">{title}</Dialog.Title>
          <Dialog.Description
            render={<div />}
            className="mt-3 grid gap-2 text-ink-secondary type-body"
          >
            {description}
          </Dialog.Description>
          <div className="mt-6 grid gap-2 sm:flex sm:justify-end">
            <Button
              ref={cancelRef}
              variant="secondary"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button variant="destructive" disabled={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

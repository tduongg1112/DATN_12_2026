"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  /** Hàng nút cuối. */
  footer?: React.ReactNode
  /** "alertdialog" cho hộp thoại xác nhận. */
  role?: "dialog" | "alertdialog"
  /** Phần tử nhận tiêu điểm khi mở (mặc định phần tử đầu tiên). */
  initialFocus?: React.RefObject<HTMLElement | null>
  /** Đang thực hiện: không cho đóng. */
  busy?: boolean
  className?: string
}

/**
 * Khung hộp thoại chung (design/05 "Hộp thoại"): mobile là `.sheet` trượt từ đáy, desktop
 * là card giữa màn rộng tối đa 440 (giá trị của `.dialog`, viết bằng tiện ích để dùng được
 * tiền tố `lg:`). Giữ tiêu điểm bên trong; `Esc` hoặc bấm nền phủ thì đóng.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  role = "dialog",
  initialFocus,
  busy = false,
  className,
}: SheetProps) {
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
          role={role}
          initialFocus={initialFocus}
          className={cn(
            "sheet fixed inset-x-0 bottom-0 z-[var(--z-sheet)] max-h-[90dvh] overflow-y-auto transition-[transform,opacity] duration-[var(--dur-base)] outline-none data-ending-style:translate-y-full data-starting-style:translate-y-full lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[min(440px,calc(100vw-2*var(--gutter-mobile)))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl lg:p-8 lg:shadow-none lg:data-ending-style:-translate-y-1/2 lg:data-ending-style:opacity-0 lg:data-starting-style:-translate-y-1/2 lg:data-starting-style:opacity-0",
            className
          )}
        >
          <Dialog.Title className="m-0 type-h3">{title}</Dialog.Title>
          {description && (
            <Dialog.Description
              render={<div />}
              className="mt-3 grid gap-2 text-ink-secondary type-body"
            >
              {description}
            </Dialog.Description>
          )}
          {children && <div className="mt-5 grid gap-4">{children}</div>}
          {footer && (
            <div className="mt-6 grid gap-2 sm:flex sm:justify-end">
              {footer}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

import { Sheet } from "./sheet"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  /** "destructive" (mặc định, `.btn--danger`) cho xoá; "default" cho xác nhận thường. */
  confirmVariant?: "destructive" | "default"
  /** Đang thực hiện: khoá hai nút, không cho đóng. */
  busy?: boolean
}

/**
 * Hộp thoại xác nhận (design/05 "Hộp thoại"), dựng trên `Sheet`. Tiêu điểm vào nút huỷ khi
 * mở để tránh bấm nhầm.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmVariant = "destructive",
  busy = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      role="alertdialog"
      initialFocus={cancelRef}
      busy={busy}
      footer={
        <>
          <Button
            ref={cancelRef}
            variant="secondary"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}

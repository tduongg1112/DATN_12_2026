"use client"

import * as React from "react"
import { Toast } from "@base-ui/react/toast"

/**
 * Thông báo nổi (design/05 `.toast`): viên thuốc đen, hiện 3 giây, ở trên cùng.
 * Trình quản lý dùng chung toàn app, nên toast vẫn hiện sau khi chuyển trang
 * (vd "Tạo tài khoản thành công" rồi chuyển về trang chủ, BR-06).
 */
const toastManager = Toast.createToastManager()

const TOAST_TIMEOUT_MS = 3000

export function notify(message: string): void {
  toastManager.add({ description: message, timeout: TOAST_TIMEOUT_MS })
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider
      toastManager={toastManager}
      timeout={TOAST_TIMEOUT_MS}
      limit={3}
    >
      {children}
      <Toast.Portal>
        <Toast.Viewport className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-toast)] flex flex-col items-center gap-2 px-[var(--gutter-mobile)] pt-[calc(var(--s-3)+env(safe-area-inset-top,0px))]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection="up"
      className="toast pointer-events-auto max-w-[440px] transition-[transform,opacity] duration-[var(--dur-base)] ease-[var(--ease-standard)] data-ending-style:opacity-0 data-limited:hidden data-starting-style:-translate-y-2 data-starting-style:opacity-0"
    >
      <Toast.Content>
        <Toast.Description className="m-0" />
      </Toast.Content>
    </Toast.Root>
  ))
}

"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useBackNavigation } from "@/lib/navigation-history"

interface AppTopbarProps {
  title?: string
  /** Đường quay lại. App đóng gói không có nút Back của trình duyệt (design/06). */
  backHref?: string
  /**
   * "link" (mặc định): luôn về `backHref`. "history": về trang trước trong app (giữ bộ
   * lọc của trang trước); mở thẳng bằng đường dẫn thì về `backHref`.
   */
  backBehavior?: "link" | "history"
  /** Phần tử đầu bên trái khi không có nút quay lại, vd avatar (design/05). */
  leading?: React.ReactNode
  /** Nút tròn bên phải (thông báo, tuỳ chọn…). */
  actions?: React.ReactNode
}

const BACK_LABEL = "Quay lại"

function HistoryBackButton({ fallback }: { fallback: string }) {
  const goBack = useBackNavigation(fallback)
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={BACK_LABEL}
      onClick={goBack}
    >
      <ArrowLeft size={24} aria-hidden />
    </button>
  )
}

/** Thanh đầu trang (design/05 `.app-topbar`). */
export function AppTopbar({
  title,
  backHref,
  backBehavior = "link",
  leading,
  actions,
}: AppTopbarProps) {
  let start: React.ReactNode = leading
  if (backHref && backBehavior === "history") {
    start = <HistoryBackButton fallback={backHref} />
  } else if (backHref) {
    start = (
      <Link href={backHref} className="icon-btn" aria-label={BACK_LABEL}>
        <ArrowLeft size={24} aria-hidden />
      </Link>
    )
  }

  return (
    <header className="app-topbar min-h-[var(--ctl-md)]">
      {start}
      {title && <h1 className="m-0 min-w-0 truncate type-h2">{title}</h1>}
      <span className="app-topbar__spacer" />
      {actions}
    </header>
  )
}

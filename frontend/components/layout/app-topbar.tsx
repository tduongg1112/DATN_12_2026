import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface AppTopbarProps {
  title?: string
  /** Đường quay lại. App đóng gói không có nút Back của trình duyệt (design/06). */
  backHref?: string
  /** Nút tròn bên phải (thông báo, tuỳ chọn…). */
  actions?: React.ReactNode
}

/** Thanh đầu trang (design/05 `.app-topbar`). */
export function AppTopbar({ title, backHref, actions }: AppTopbarProps) {
  return (
    <header className="app-topbar min-h-[var(--ctl-md)]">
      {backHref && (
        <Link href={backHref} className="icon-btn" aria-label="Quay lại">
          <ArrowLeft size={24} aria-hidden />
        </Link>
      )}
      {title && <h1 className="m-0 min-w-0 truncate type-h2">{title}</h1>}
      <span className="app-topbar__spacer" />
      {actions}
    </header>
  )
}

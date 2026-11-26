import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyAction =
  { label: string; href: string } | { label: string; onClick: () => void }

interface EmptyStateProps {
  icon: LucideIcon
  /** Một câu (design/07). Lấy từ phần ngoại lệ của UC trong specs. */
  message: string
  action?: EmptyAction
  /** Lựa chọn thứ hai, nút phụ (vd C4 UC04 2.1: "Thêm cây" và "Chẩn đoán ngay"). */
  secondaryAction?: EmptyAction
  className?: string
}

function ActionButton({
  action,
  secondary,
}: {
  action: EmptyAction
  secondary?: boolean
}) {
  const variant = secondary ? "secondary" : "default"
  return "href" in action ? (
    <Button
      variant={variant}
      nativeButton={false}
      render={<Link href={action.href} />}
    >
      {action.label}
    </Button>
  ) : (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

/** Trạng thái rỗng (design/05 `.empty`): icon trong khối tròn, một câu, một nút. */
export function EmptyState({
  icon: Icon,
  message,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("empty", className)}>
      <span className="icon-tile icon-tile--neutral" aria-hidden>
        <Icon size={28} />
      </span>
      <p className="m-0 max-w-sm text-ink-secondary type-body">{message}</p>
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {action && <ActionButton action={action} />}
          {secondaryAction && (
            <ActionButton action={secondaryAction} secondary />
          )}
        </div>
      )}
    </div>
  )
}

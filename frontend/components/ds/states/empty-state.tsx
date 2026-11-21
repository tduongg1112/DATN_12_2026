import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  /** Một câu (design/07). Lấy từ phần ngoại lệ của UC trong specs. */
  message: string
  action?:
    { label: string; href: string } | { label: string; onClick: () => void }
  className?: string
}

/** Trạng thái rỗng (design/05 `.empty`): icon trong khối tròn, một câu, một nút. */
export function EmptyState({
  icon: Icon,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("empty", className)}>
      <span className="icon-tile icon-tile--neutral" aria-hidden>
        <Icon size={28} />
      </span>
      <p className="m-0 max-w-sm text-ink-secondary type-body">{message}</p>
      {action &&
        ("href" in action ? (
          <Button
            className="mt-2"
            nativeButton={false}
            render={<Link href={action.href} />}
          >
            {action.label}
          </Button>
        ) : (
          <Button className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  )
}

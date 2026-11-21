import { cn } from "@/lib/utils"

/** Khối chờ đúng hình nội dung (design/07). Không dùng vòng quay toàn màn. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />
}

/** Khung chờ chung cho một trang: tiêu đề và vài card. */
export function PageSkeleton({ label = "Đang tải" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-2 lg:gap-5">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-1/2 max-w-80 rounded-full" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  )
}

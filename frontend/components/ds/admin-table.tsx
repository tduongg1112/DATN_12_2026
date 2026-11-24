import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Bảng quản trị (design/05 `.table` trong `.table-wrap`): không kẻ ô, hàng lẻ `#FAFAFA`,
 * tiêu đề cột 12px màu phụ. Bảng rộng cuộn ngang trong khung, không làm tràn trang.
 */
export function AdminTable({
  caption,
  children,
  className,
}: {
  /** Tên bảng cho trình đọc màn hình. */
  caption: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("table-wrap", className)}>
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

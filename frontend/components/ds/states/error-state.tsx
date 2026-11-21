import { RefreshCw } from "lucide-react"

import { Card } from "@/components/ds/card-stack"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  /** Câu tiếng Việt, thường là `ApiError.message` từ backend. */
  message: string
  onRetry?: () => void
  retryLabel?: string
}

/** Lỗi tải (design/07): giữ khung trang, thông báo trong card, nút thử lại. */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Thử lại",
}: ErrorStateProps) {
  return (
    <Card role="alert" className="flex flex-col items-start gap-3">
      <p className="m-0 type-body">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden />
          {retryLabel}
        </Button>
      )}
    </Card>
  )
}

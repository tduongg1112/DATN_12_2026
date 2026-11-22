"use client"

import * as React from "react"

import { ApiError, CLIENT_ERRORS, isApiError } from "@/lib/api"

export interface ApiRequestState<T> {
  /** Dữ liệu của lần tải thành công gần nhất (có thể của `key` trước khi đang tải lại). */
  data: T | undefined
  /** Lỗi của lần tải ứng với `key` hiện tại. */
  error: ApiError | undefined
  /** Đang tải cho `key` hiện tại. */
  loading: boolean
  /** Tải lại (nút "Thử lại"). */
  reload: () => void
}

interface Settled<T> {
  key: string
  data?: T
  error?: ApiError
}

function toApiError(error: unknown): ApiError {
  return isApiError(error)
    ? error
    : new ApiError({
        statusCode: 0,
        code: "INTERNAL_ERROR",
        message: CLIENT_ERRORS.INTERNAL_ERROR,
      })
}

/**
 * Gọi một API đọc qua `lib/api` mỗi khi `key` đổi; `key = null` thì không gọi. Lần gọi cũ
 * bị huỷ (AbortController) khi `key` đổi hoặc component bị gỡ. Trạng thái `loading` suy ra
 * từ `key`, nên không gọi setState đồng bộ trong effect.
 */
export function useApiRequest<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>
): ApiRequestState<T> {
  const [nonce, setNonce] = React.useState(0)
  const [settled, setSettled] = React.useState<Settled<T> | null>(null)
  const [lastData, setLastData] = React.useState<T | undefined>(undefined)
  const loadRef = React.useRef(load)
  const requestKey = key === null ? null : `${key}#${nonce}`

  React.useEffect(() => {
    loadRef.current = load
  })

  React.useEffect(() => {
    if (requestKey === null) return
    const controller = new AbortController()
    loadRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setSettled({ key: requestKey, data })
        setLastData(data)
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ key: requestKey, error: toApiError(error) })
      }
    )
    return () => controller.abort()
  }, [requestKey])

  const current = settled?.key === requestKey ? settled : null
  const reload = React.useCallback(() => setNonce((n) => n + 1), [])

  return {
    data: current?.data ?? lastData,
    error: current?.error,
    loading: requestKey !== null && current === null,
    reload,
  }
}

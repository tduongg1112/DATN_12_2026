/** Dạng lỗi chuẩn của backend (TD-05). */
export interface FieldError {
  field: string
  message: string
}

export interface ErrorBody {
  statusCode: number
  code: string
  message: string
  errors?: FieldError[]
}

/**
 * Câu cho lỗi phía client, khi backend không trả được câu tiếng Việt.
 * Do Claude soạn (chưa có trong specs), chờ Dương duyệt. Lỗi nghiệp vụ luôn
 * dùng `message` backend trả về, đã đúng câu trong specs.
 */
export const CLIENT_ERRORS = {
  NETWORK_ERROR: "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.",
  INTERNAL_ERROR: "Đã có lỗi xảy ra, vui lòng thử lại sau",
} as const

/** Mọi lỗi từ `lib/api` đều là ApiError. UI hiển thị `message`, rẽ nhánh theo `code`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: FieldError[]

  constructor(body: ErrorBody) {
    super(body.message)
    this.name = "ApiError"
    this.status = body.statusCode
    this.code = body.code
    this.errors = body.errors ?? []
  }

  static network(): ApiError {
    return new ApiError({
      statusCode: 0,
      code: "NETWORK_ERROR",
      message: CLIENT_ERRORS.NETWORK_ERROR,
    })
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** `errors[]` → `{ field: message }` để hiện lỗi ngay dưới từng trường. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error)) return {}
  return Object.fromEntries(error.errors.map((e) => [e.field, e.message]))
}

/** Đọc body lỗi; body sai dạng thì dùng câu dự phòng theo status. */
export function toApiError(status: number, body: unknown): ApiError {
  const b = body as Partial<ErrorBody> | null
  if (b && typeof b.code === "string" && typeof b.message === "string") {
    return new ApiError({
      statusCode: typeof b.statusCode === "number" ? b.statusCode : status,
      code: b.code,
      message: b.message,
      errors: Array.isArray(b.errors) ? b.errors : undefined,
    })
  }
  return new ApiError({
    statusCode: status,
    code: "INTERNAL_ERROR",
    message: CLIENT_ERRORS.INTERNAL_ERROR,
  })
}

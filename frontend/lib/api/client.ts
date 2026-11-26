import { AUTH_ENDPOINTS, parseRefreshResponse } from "./auth-endpoints"
import { ApiError, toApiError } from "./errors"
import { tokenStore } from "./token-store"

/**
 * Lớp DUY NHẤT gọi backend (fe-coding-rules mục 2, 3). Chạy phía client để tương thích
 * cả PWA lẫn Capacitor (TD-02). Base URL lấy từ NEXT_PUBLIC_API_URL, vd
 * http://localhost:4000/api/v1 (TD-05, TD-06).
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL

type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Query
  /** Object → JSON; FormData → multipart (ảnh). */
  body?: unknown
  /** false: không gắn token, không tự refresh (đăng nhập, đăng ký). Mặc định true. */
  auth?: boolean
  signal?: AbortSignal
}

/** URL đầy đủ tới backend, dùng cho điều hướng toàn trang (vd đăng nhập Google). */
export function apiUrl(path: string, query?: Query): string {
  return buildUrl(path, query)
}

function buildUrl(path: string, query?: Query): string {
  if (!BASE_URL) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_API_URL. Chép frontend/.env.example thành .env.local rồi điền."
    )
  }
  const url = new URL(`${BASE_URL.replace(/\/+$/, "")}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" })
  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(options.body)
  }
  const token = tokenStore.get()
  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body,
      // Cookie refresh token (httpOnly, path /api/v1/auth) chỉ đi kèm route /auth/*.
      credentials: "include",
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error
    throw ApiError.network()
  }
}

// --- Làm mới phiên ---------------------------------------------------------

type SessionListener = () => void
const sessionExpiredListeners = new Set<SessionListener>()

/** Đăng ký nhận báo khi phiên hết hạn (refresh thất bại). Trả hàm huỷ đăng ký. */
export function onSessionExpired(listener: SessionListener): () => void {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

let refreshInFlight: Promise<string | null> | null = null

/**
 * Lấy access token mới bằng refresh token trong cookie. Nhiều request cùng gặp 401
 * chỉ chờ chung một lần refresh. Trả null nếu không làm mới được.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await send(AUTH_ENDPOINTS.refresh, {
        method: "POST",
        auth: false,
      })
      const token = res.ok ? parseRefreshResponse(await readBody(res)) : null
      tokenStore.set(token)
      return token
    } catch {
      tokenStore.set(null)
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

// --- Gọi API ------------------------------------------------------------------

/**
 * Gọi backend. Thành công trả thẳng dữ liệu (TD-05). Lỗi ném ApiError có `message`
 * tiếng Việt do backend trả. Gặp 401 thì refresh một lần rồi gửi lại.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  let res = await send(path, options)

  if (res.status === 401 && options.auth !== false) {
    const token = await refreshAccessToken()
    if (token) {
      res = await send(path, options)
    } else {
      sessionExpiredListeners.forEach((listener) => listener())
    }
  }

  const body = await readBody(res)
  if (!res.ok) throw toApiError(res.status, body)
  return body as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(
    path: string,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiRequest<T>(path, { ...options, method: "DELETE" }),
}

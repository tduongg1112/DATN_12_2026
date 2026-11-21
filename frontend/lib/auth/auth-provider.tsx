"use client"

import * as React from "react"

import {
  AUTH_ENDPOINTS,
  api,
  onSessionExpired,
  refreshAccessToken,
  tokenStore,
} from "@/lib/api"

import { decodeAccessToken, type SessionUser } from "./session"

type AuthStatus = "loading" | "authenticated" | "anonymous"

interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  /** Feature auth gọi sau khi đăng nhập hoặc đăng ký thành công. */
  signIn: (accessToken: string) => SessionUser | null
  /** Thu hồi refresh token ở backend (nếu được) và xoá phiên phía client. */
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

/**
 * Giữ phiên đăng nhập phía client (TD-12). Khi mở app, thử refresh để khôi phục phiên
 * từ cookie httpOnly. Phiên hết hạn (refresh lỗi) thì chuyển sang chưa đăng nhập.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading")
  const [user, setUser] = React.useState<SessionUser | null>(null)

  const applyToken = React.useCallback((token: string | null) => {
    const next = token ? decodeAccessToken(token) : null
    tokenStore.set(next ? token : null)
    setUser(next)
    setStatus(next ? "authenticated" : "anonymous")
    return next
  }, [])

  React.useEffect(() => {
    let cancelled = false
    refreshAccessToken().then((token) => {
      if (!cancelled) applyToken(token)
    })
    const unsubscribe = onSessionExpired(() => applyToken(null))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [applyToken])

  const signOut = React.useCallback(async () => {
    try {
      await api.post(AUTH_ENDPOINTS.logout, undefined, { auth: false })
    } catch {
      // Đăng xuất phía client vẫn tiếp tục dù backend không phản hồi.
    }
    applyToken(null)
  }, [applyToken])

  const value = React.useMemo(
    () => ({ status, user, signIn: applyToken, signOut }),
    [status, user, applyToken, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error("useAuth phải nằm trong <AuthProvider>")
  return context
}

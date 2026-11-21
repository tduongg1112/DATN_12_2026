"use client"

import * as React from "react"

import {
  AUTH_ENDPOINTS,
  api,
  onSessionExpired,
  refreshAccessToken,
  tokenStore,
} from "@/lib/api"
import { accountsApi } from "@/lib/api/accounts"
import type { UserProfile } from "@/lib/types/account"

import { decodeAccessToken, type SessionUser } from "./session"

type AuthStatus = "loading" | "authenticated" | "anonymous"
type ProfileStatus = "idle" | "loading" | "ready" | "error"

interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  /** Hồ sơ (U1), tải sau khi có phiên. Dùng cho avatar, menu, trang hồ sơ. */
  profile: UserProfile | null
  profileStatus: ProfileStatus
  reloadProfile: () => Promise<void>
  /** Cập nhật hồ sơ sau khi sửa (U2) mà không cần tải lại. */
  setProfile: (profile: UserProfile) => void
  /** true khi người dùng vừa chủ động đăng xuất: về /login, không nhớ trang cũ (BR-12). */
  signedOut: boolean
  /** Gọi sau khi đăng nhập hoặc đăng ký thành công. */
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
  const [profile, setProfileState] = React.useState<UserProfile | null>(null)
  const [profileStatus, setProfileStatus] =
    React.useState<ProfileStatus>("idle")
  const [signedOut, setSignedOut] = React.useState(false)
  const profileRequest = React.useRef(0)

  const reloadProfile = React.useCallback(async () => {
    const requestId = ++profileRequest.current
    setProfileStatus("loading")
    try {
      const next = await accountsApi.me()
      if (profileRequest.current !== requestId) return
      setProfileState(next)
      setProfileStatus("ready")
    } catch {
      if (profileRequest.current === requestId) setProfileStatus("error")
    }
  }, [])

  const applyToken = React.useCallback(
    (token: string | null) => {
      const next = token ? decodeAccessToken(token) : null
      tokenStore.set(next ? token : null)
      setUser(next)
      setStatus(next ? "authenticated" : "anonymous")
      if (next) {
        void reloadProfile()
      } else {
        profileRequest.current++
        setProfileState(null)
        setProfileStatus("idle")
      }
      return next
    },
    [reloadProfile]
  )

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

  const signIn = React.useCallback(
    (accessToken: string) => {
      setSignedOut(false)
      return applyToken(accessToken)
    },
    [applyToken]
  )

  const signOut = React.useCallback(async () => {
    try {
      await api.post(AUTH_ENDPOINTS.logout, undefined, { auth: false })
    } catch {
      // Đăng xuất phía client vẫn tiếp tục dù backend không phản hồi.
    }
    setSignedOut(true)
    applyToken(null)
  }, [applyToken])

  const setProfile = React.useCallback((next: UserProfile) => {
    profileRequest.current++
    setProfileState(next)
    setProfileStatus("ready")
  }, [])

  const value = React.useMemo(
    () => ({
      status,
      user,
      profile,
      profileStatus,
      reloadProfile,
      setProfile,
      signedOut,
      signIn,
      signOut,
    }),
    [
      status,
      user,
      profile,
      profileStatus,
      reloadProfile,
      setProfile,
      signedOut,
      signIn,
      signOut,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error("useAuth phải nằm trong <AuthProvider>")
  return context
}

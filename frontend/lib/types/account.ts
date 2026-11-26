import type { Role } from "./domain"

/** U1 GET /users/me (docs/auth/api_auth.md). */
export interface UserProfile {
  id: number
  fullName: string
  email: string
  /** URL đọc được ảnh, hoặc null. */
  avatarUrl: string | null
  role: Role
  /** false: tài khoản chỉ dùng Google, ẩn đổi mật khẩu (BR-17, OQ-27). */
  hasPassword: boolean
}

/** A1, A2, A3: body trả về khi có phiên mới. */
export interface AccessTokenResponse {
  accessToken: string
}

export interface RegisterInput {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

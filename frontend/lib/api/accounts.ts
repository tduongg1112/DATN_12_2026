import type {
  AccessTokenResponse,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UserProfile,
} from "@/lib/types/account"

import { AUTH_ENDPOINTS } from "./auth-endpoints"
import { api, apiUrl } from "./client"

/** Lời gọi API của feature `auth` (docs/auth/api_auth.md). */
export const accountsApi = {
  /** A1. Đặt cookie refresh token, trả access token (tự đăng nhập, BR-06). */
  register: (input: RegisterInput) =>
    api.post<AccessTokenResponse>(AUTH_ENDPOINTS.register, input, {
      auth: false,
    }),

  /** A2. */
  login: (input: LoginInput) =>
    api.post<AccessTokenResponse>(AUTH_ENDPOINTS.login, input, {
      auth: false,
    }),

  /** A5. Điều hướng toàn trang tới đây, không gọi bằng fetch. */
  googleLoginUrl: (next: string | null) =>
    apiUrl(AUTH_ENDPOINTS.google, { next: next ?? undefined }),

  /** U1. */
  me: () => api.get<UserProfile>(AUTH_ENDPOINTS.me),

  /** U2. Có ảnh thì gửi multipart, chỉ đổi tên thì gửi JSON. */
  updateProfile: (input: { fullName: string; avatar?: Blob | null }) => {
    if (!input.avatar) {
      return api.patch<UserProfile>(AUTH_ENDPOINTS.me, {
        fullName: input.fullName,
      })
    }
    const form = new FormData()
    form.set("fullName", input.fullName)
    form.set("avatar", input.avatar, "avatar.jpg")
    return api.patch<UserProfile>(AUTH_ENDPOINTS.me, form)
  },

  /** U3. 204. */
  changePassword: (input: ChangePasswordInput) =>
    api.put<void>(AUTH_ENDPOINTS.password, input),
}

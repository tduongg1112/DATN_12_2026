/**
 * Access token chỉ giữ trong bộ nhớ (TD-12): không localStorage, không cookie do JS đặt.
 * Khi đóng gói Capacitor, chỉ đổi file này (sang secure storage).
 */
let accessToken: string | null = null

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token
  },
}

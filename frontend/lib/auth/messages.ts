/**
 * Câu chữ feature auth phía giao diện.
 * - Nguyên văn specs: REGISTER_SUCCESS (BR-06), PASSWORD_HINT (diễn lại BR-05).
 * - Claude soạn, Dương duyệt 21/11: OQ-32 (theo trường, trùng câu backend),
 *   OQ-33 (AUTH-04), OQ-34 (Google).
 * Lỗi nghiệp vụ từ API luôn hiển thị `message` backend trả về, không dùng bản sao ở đây.
 */
export const AUTH_TEXT = {
  REGISTER_SUCCESS: "Tạo tài khoản thành công",
  PASSWORD_HINT: "Ít nhất 8 ký tự, gồm cả chữ và số",
  GOOGLE_FAILED: "Không đăng nhập được bằng Google. Vui lòng thử lại.",
  PROFILE_UPDATED: "Đã cập nhật hồ sơ",
  PASSWORD_CHANGED: "Đã đổi mật khẩu",
} as const

/** OQ-32: cùng câu với backend, để báo lỗi ngay khi bấm mà không cần gọi API. */
export const FIELD_TEXT = {
  FULL_NAME_REQUIRED: "Vui lòng nhập họ tên",
  FULL_NAME_TOO_LONG: "Họ tên tối đa 100 ký tự",
  EMAIL_REQUIRED: "Vui lòng nhập email",
  EMAIL_INVALID: "Email không hợp lệ",
  PASSWORD_REQUIRED: "Vui lòng nhập mật khẩu",
  PASSWORD_WEAK: "Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số",
  PASSWORD_TOO_LONG: "Mật khẩu tối đa 72 ký tự",
  PASSWORD_MISMATCH: "Mật khẩu xác nhận không khớp",
} as const

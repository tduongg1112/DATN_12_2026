/**
 * Thoát ký tự đặc biệt của LIKE / ILIKE để từ khoá người dùng gõ chỉ là chữ thường
 * (`ESCAPE '\'`). Dùng chung cho các ô tìm kiếm (thư viện bệnh, danh mục bệnh, lịch sử).
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

import type { ReminderSuggestion } from "@/lib/types/plants"

/*
 * Gợi ý nhắc vừa nhận khi tạo cây (P2, A2), giữ trong bộ nhớ để chi tiết cây mở sheet "Gợi ý
 * lịch nhắc" ngay sau khi chuyển trang. Chỉ giữ một lần gần nhất. Đọc bằng `pendingSuggestions`
 * (không đổi gì, an toàn khi render chạy hai lần), xoá bằng `clearSuggestions` trong effect.
 */
let pending: { plantId: number; suggestions: ReminderSuggestion[] } | null =
  null

export function rememberSuggestions(
  plantId: number,
  suggestions: ReminderSuggestion[]
): void {
  pending = suggestions.length > 0 ? { plantId, suggestions } : null
}

export function pendingSuggestions(plantId: number): ReminderSuggestion[] {
  return pending?.plantId === plantId ? pending.suggestions : []
}

export function clearSuggestions(plantId: number): void {
  if (pending?.plantId === plantId) pending = null
}

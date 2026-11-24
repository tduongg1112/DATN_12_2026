import type { ReminderSuggestion } from './dto/plant.dto.js';
import type { ReminderType } from './entities/reminder.entity.js';

/*
 * Nhắc việc (my_plants BR-14 → BR-18; docs/my_plants/template_my_plants.md). Hàm thuần để
 * unit test được.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** BR-14: "Nhắc tôi kiểm tra lại" sau 3, 7 hoặc 14 ngày. */
export const RECHECK_DAY_OPTIONS = [3, 7, 14] as const;

/** Tiêu đề lịch nhắc (template mục 1, ✎ OQ-51): không chứa tên cây. */
export const REMINDER_TITLES: Record<ReminderType, string> = {
  RECHECK: 'Kiểm tra lại cây',
  WATERING: 'Tưới nước',
  FERTILIZING: 'Bón phân',
  OTHER: 'Lịch nhắc',
};

/**
 * Thông báo khi nhắc đến hạn (template mục 2, ✎ OQ-51), ghép với tên cây hiện tại lúc gửi.
 * RECHECK theo C4 UC04 10f: nhắc chụp lại cây để theo dõi tiến triển.
 */
export function reminderNotice(
  type: ReminderType,
  plantName: string,
  reminderTitle: string,
): { title: string; content: string } {
  switch (type) {
    case 'RECHECK':
      return {
        title: `Đến lúc kiểm tra lại ${plantName}`,
        content: `Hãy chụp lại ${plantName} để theo dõi tiến triển của cây.`,
      };
    case 'WATERING':
      return {
        title: `Đến lịch tưới nước cho ${plantName}`,
        content: `Đã đến lịch tưới nước cho ${plantName}.`,
      };
    case 'FERTILIZING':
      return {
        title: `Đến lịch bón phân cho ${plantName}`,
        content: `Đã đến lịch bón phân cho ${plantName}.`,
      };
    default:
      return { title: `Lịch nhắc cho ${plantName}`, content: reminderTitle };
  }
}

/** Thời điểm sau `days` ngày tính từ `from`. */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/**
 * Mốc kế tiếp của nhắc lặp (BR-15, TD-28): cộng `repeatDays` cho tới khi sau `now`. Máy
 * tắt lâu, trễ nhiều chu kỳ thì chỉ nhảy tới chu kỳ kế tiếp, không gửi dồn.
 */
export function nextRepeatAfter(
  current: Date,
  repeatDays: number,
  now: Date,
): Date {
  const period = repeatDays * DAY_MS;
  const behind = now.getTime() - current.getTime();
  const steps = behind < 0 ? 1 : Math.floor(behind / period) + 1;
  return new Date(current.getTime() + steps * period);
}

/** Ứng viên gợi ý trước khi lọc trùng. */
export interface SuggestionInput {
  wateringDays?: number | null;
  fertilizingDays?: number | null;
  recheckDays?: number | null;
}

/**
 * Gợi ý nhắc (BR-16, BR-18; diagnosis BR-26): chỉ loại có số ngày, và cây **chưa** có nhắc
 * cùng loại đang bật. Thứ tự: tưới, bón, kiểm tra lại.
 */
export function buildSuggestions(
  input: SuggestionInput,
  activeTypes: ReadonlySet<ReminderType>,
): ReminderSuggestion[] {
  const candidates: [ReminderSuggestion['type'], number | null | undefined][] =
    [
      ['WATERING', input.wateringDays],
      ['FERTILIZING', input.fertilizingDays],
      ['RECHECK', input.recheckDays],
    ];
  return candidates
    .filter(
      (c): c is [ReminderSuggestion['type'], number] =>
        typeof c[1] === 'number' && c[1] > 0 && !activeTypes.has(c[0]),
    )
    .map(([type, days]) => ({ type, days }));
}

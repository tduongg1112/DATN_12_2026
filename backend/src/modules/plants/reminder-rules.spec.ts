import {
  addDays,
  buildSuggestions,
  nextRepeatAfter,
  REMINDER_TITLES,
  reminderNotice,
} from './reminder-rules.js';

const DAY = 24 * 60 * 60 * 1000;

describe('nextRepeatAfter (BR-15, TD-28)', () => {
  const start = new Date('2026-11-01T08:00:00Z');

  it('đến hạn đúng lúc: dời đúng một chu kỳ', () => {
    expect(nextRepeatAfter(start, 2, start)).toEqual(
      new Date(start.getTime() + 2 * DAY),
    );
  });

  it('trễ nhiều chu kỳ (máy tắt lâu): nhảy tới chu kỳ đầu tiên sau hiện tại, không dồn', () => {
    const now = new Date(start.getTime() + 7 * DAY + 1000);
    expect(nextRepeatAfter(start, 2, now)).toEqual(
      new Date(start.getTime() + 8 * DAY),
    );
  });

  it('mốc mới luôn sau hiện tại', () => {
    const now = new Date(start.getTime() + 3 * DAY);
    expect(nextRepeatAfter(start, 3, now).getTime()).toBeGreaterThan(
      now.getTime(),
    );
  });
});

describe('buildSuggestions (BR-16, BR-18; diagnosis BR-26)', () => {
  it('chỉ loại có số ngày; thứ tự tưới, bón, kiểm tra lại', () => {
    expect(
      buildSuggestions(
        { wateringDays: 2, fertilizingDays: 14, recheckDays: 7 },
        new Set(),
      ),
    ).toEqual([
      { type: 'WATERING', days: 2 },
      { type: 'FERTILIZING', days: 14 },
      { type: 'RECHECK', days: 7 },
    ]);
    expect(
      buildSuggestions({ wateringDays: null, fertilizingDays: 20 }, new Set()),
    ).toEqual([{ type: 'FERTILIZING', days: 20 }]);
  });

  it('bỏ loại cây đã có nhắc đang bật', () => {
    expect(
      buildSuggestions(
        { wateringDays: 2, fertilizingDays: 14, recheckDays: 7 },
        new Set(['WATERING', 'RECHECK'] as const),
      ),
    ).toEqual([{ type: 'FERTILIZING', days: 14 }]);
  });
});

describe('Nội dung nhắc (template_my_plants.md)', () => {
  it('tiêu đề nhắc không chứa tên cây', () => {
    expect(REMINDER_TITLES).toMatchObject({
      RECHECK: 'Kiểm tra lại cây',
      WATERING: 'Tưới nước',
      FERTILIZING: 'Bón phân',
    });
  });

  it('thông báo ghép tên cây hiện tại; vừa cột (tiêu đề 150, nội dung 500)', () => {
    expect(reminderNotice('RECHECK', 'Cà chua ban công', 'x')).toEqual({
      title: 'Đến lúc kiểm tra lại Cà chua ban công',
      content: 'Hãy chụp lại Cà chua ban công để theo dõi tiến triển của cây.',
    });
    const longName = 'a'.repeat(100);
    for (const type of [
      'RECHECK',
      'WATERING',
      'FERTILIZING',
      'OTHER',
    ] as const) {
      const n = reminderNotice(type, longName, 'b'.repeat(150));
      expect(n.title.length).toBeLessThanOrEqual(150);
      expect(n.content.length).toBeLessThanOrEqual(500);
    }
  });

  it('addDays cộng đúng số ngày', () => {
    const t = new Date('2026-11-24T00:00:00Z');
    expect(addDays(t, 3).toISOString()).toBe('2026-11-27T00:00:00.000Z');
  });
});

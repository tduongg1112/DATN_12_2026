import {
  allowedStatusChanges,
  canChangeStatus,
  healthFromResult,
  shouldSuggestRecovered,
} from './health-rules.js';

describe('healthFromResult (Bảng 4.8, diagnosis BR-25)', () => {
  it('DISEASE → Đang có bệnh, HEALTHY → Khoẻ mạnh, UNCERTAIN → không đổi', () => {
    expect(healthFromResult('DISEASE')).toBe('DISEASED');
    expect(healthFromResult('HEALTHY')).toBe('HEALTHY');
    expect(healthFromResult('UNCERTAIN')).toBeNull();
  });
});

describe('canChangeStatus, allowedStatusChanges (OQ-47)', () => {
  it.each([
    ['DISEASED', ['TREATING', 'RECOVERED']],
    ['TREATING', ['RECOVERED']],
    ['HEALTHY', ['RECOVERED']],
    ['NOT_DIAGNOSED', []],
    ['RECOVERED', []],
  ] as const)('%s → %o', (current, expected) => {
    expect(allowedStatusChanges(current)).toEqual(expected);
  });

  it('không chuyển "Đang điều trị" khi đang điều trị hoặc đã khoẻ', () => {
    expect(canChangeStatus('TREATING', 'TREATING')).toBe(false);
    expect(canChangeStatus('HEALTHY', 'TREATING')).toBe(false);
  });
});

describe('shouldSuggestRecovered (Bảng 4.8, OQ-48)', () => {
  it.each([
    ['DISEASED', 'HEALTHY', true],
    ['TREATING', 'HEALTHY', true],
    ['HEALTHY', 'HEALTHY', false],
    ['NOT_DIAGNOSED', 'HEALTHY', false],
    ['RECOVERED', 'HEALTHY', false],
    ['DISEASED', 'DISEASE', false],
    ['DISEASED', 'UNCERTAIN', false],
  ] as const)('cây %s, kết quả %s → %s', (before, result, expected) => {
    expect(shouldSuggestRecovered(before, result)).toBe(expected);
  });
});

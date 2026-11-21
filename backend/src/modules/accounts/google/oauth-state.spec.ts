import {
  decodeOAuthState,
  encodeOAuthState,
  newOAuthState,
  safeNext,
  stateMatches,
} from './oauth-state.js';

describe('safeNext (BR-03: chỉ quay về trang nội bộ)', () => {
  it.each(['/', '/history', '/plants/detail?id=3'])('nhận %s', (next) => {
    expect(safeNext(next)).toBe(next);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    'history',
    '',
    `/${'a'.repeat(500)}`,
    42,
    undefined,
  ])('bỏ qua %s', (next) => {
    expect(safeNext(next)).toBeUndefined();
  });
});

describe('state của luồng Google (TD-22)', () => {
  it('mã hoá rồi giải mã giữ nguyên state và next', () => {
    const state = newOAuthState('/history');
    expect(state.state.length).toBeGreaterThanOrEqual(32);
    expect(decodeOAuthState(encodeOAuthState(state))).toEqual(state);
  });

  it('next không an toàn bị bỏ khi tạo và khi đọc lại', () => {
    expect(newOAuthState('//evil.com').next).toBeUndefined();
    const forged = encodeOAuthState({ state: 's', next: '//evil.com' });
    expect(decodeOAuthState(forged)).toEqual({ state: 's', next: undefined });
  });

  it('cookie hỏng hoặc thiếu thì trả null', () => {
    expect(decodeOAuthState(undefined)).toBeNull();
    expect(decodeOAuthState('khong-phai-json')).toBeNull();
    expect(decodeOAuthState(encodeOAuthState({ state: '' }))).toBeNull();
  });

  it('so state', () => {
    expect(stateMatches('abc', 'abc')).toBe(true);
    expect(stateMatches('abc', 'abd')).toBe(false);
    expect(stateMatches('abc', 'ab')).toBe(false);
    expect(stateMatches('abc', undefined)).toBe(false);
  });
});

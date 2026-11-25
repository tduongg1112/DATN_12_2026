import { escapeLike } from './escape-like.js';

describe('escapeLike (ô tìm kiếm)', () => {
  it('thoát %, _ và \\ để chỉ tìm đúng chữ người dùng gõ', () => {
    expect(escapeLike('mốc sương')).toBe('mốc sương');
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });
});

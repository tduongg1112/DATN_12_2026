import { AppException } from '../../../common/exceptions/app.exception.js';
import { parseImageLayout } from './image-layout.js';

function errorsOf(fn: () => unknown): Record<string, string> {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(AppException);
  const body = (caught as AppException).getResponse() as {
    code: string;
    errors: { field: string; message: string }[];
  };
  expect(body.code).toBe('VALIDATION_ERROR');
  return Object.fromEntries(body.errors.map((x) => [x.field, x.message]));
}

const json = (v: unknown) => JSON.stringify(v);

describe('parseImageLayout (B3, B4; TD-32)', () => {
  it('B3 không có ảnh, không gửi layout: danh sách rỗng', () => {
    expect(parseImageLayout(undefined, 0, null)).toEqual([]);
  });

  it('B4 không gửi layout: null = giữ nguyên ảnh cũ', () => {
    expect(parseImageLayout(undefined, 0, [5, 6])).toBeNull();
    expect(parseImageLayout('  ', 0, [5])).toBeNull();
  });

  it('có tệp mà không gửi layout: lỗi', () => {
    expect(errorsOf(() => parseImageLayout(undefined, 1, null))).toEqual({
      imageLayout: 'Dữ liệu không hợp lệ',
    });
  });

  it('giữ đúng thứ tự, cắt chú thích, chú thích rỗng thành null', () => {
    expect(
      parseImageLayout(
        json([
          { upload: 1, caption: '  Lá non ' },
          { id: 5 },
          { upload: 0, caption: '' },
        ]),
        2,
        [5, 6],
      ),
    ).toEqual([
      { kind: 'upload', index: 1, caption: 'Lá non' },
      { kind: 'existing', id: 5, caption: null },
      { kind: 'upload', index: 0, caption: null },
    ]);
  });

  it.each([
    ['không phải JSON', '{', 0, null],
    ['không phải mảng', json({ upload: 0 }), 1, null],
    ['tệp bị bỏ sót', json([{ upload: 0 }]), 2, null],
    ['tệp dùng hai lần', json([{ upload: 0 }, { upload: 0 }]), 1, null],
    ['chỉ số tệp ngoài khoảng', json([{ upload: 1 }]), 1, null],
    ['B3 nhận id ảnh cũ', json([{ id: 5 }]), 0, null],
    ['id không thuộc bệnh', json([{ id: 9 }]), 0, [5]],
    ['id trùng', json([{ id: 5 }, { id: 5 }]), 0, [5]],
    ['vừa upload vừa id', json([{ upload: 0, id: 5 }]), 1, [5]],
    ['chú thích không phải chuỗi', json([{ upload: 0, caption: 3 }]), 1, null],
  ])('%s: lỗi trường imageLayout', (_name, raw, uploads, ids) => {
    expect(
      errorsOf(() =>
        parseImageLayout(raw, uploads, ids as readonly number[] | null),
      ),
    ).toEqual({ imageLayout: 'Dữ liệu không hợp lệ' });
  });

  it('quá 10 ảnh: lỗi trường images ✎', () => {
    const many = json(Array.from({ length: 11 }, (_, i) => ({ id: i + 1 })));
    expect(
      errorsOf(() =>
        parseImageLayout(
          many,
          0,
          Array.from({ length: 11 }, (_, i) => i + 1),
        ),
      ),
    ).toEqual({ images: 'Tối đa 10 ảnh' });
  });

  it('chú thích quá 255 ký tự: lỗi đúng vị trí ✎', () => {
    expect(
      errorsOf(() =>
        parseImageLayout(
          json([{ id: 5 }, { upload: 0, caption: 'x'.repeat(256) }]),
          1,
          [5],
        ),
      ),
    ).toEqual({ 'imageLayout.1.caption': 'Chú thích tối đa 255 ký tự' });
  });
});

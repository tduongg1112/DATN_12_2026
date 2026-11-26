import type { ArgumentMetadata } from '@nestjs/common';
import { AppException } from '../../../../common/exceptions/app.exception.js';
import { createValidationPipe } from '../../../../common/pipes/validation.pipe.js';
import { DiagnosisIdsDto, ListHistoryQuery } from './history.dto.js';

const pipe = createValidationPipe();

async function run<T>(
  cls: new () => T,
  value: unknown,
  type: ArgumentMetadata['type'],
): Promise<T> {
  return (await pipe.transform(value, { type, metatype: cls })) as T;
}

/** Trả danh sách field lỗi; mọi lỗi phải là VALIDATION_ERROR với câu OQ-29. */
async function invalidFields(
  cls: new () => unknown,
  value: unknown,
  type: ArgumentMetadata['type'],
): Promise<string[]> {
  const e = await run(cls, value, type).catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AppException);
  const body = (e as AppException).getResponse() as {
    code: string;
    errors: { field: string; message: string }[];
  };
  expect(body.code).toBe('VALIDATION_ERROR');
  body.errors.forEach((x) => expect(x.message).toBe('Dữ liệu không hợp lệ'));
  return [...new Set(body.errors.map((x) => x.field))];
}

describe('ListHistoryQuery (H1, BR-03)', () => {
  it('mặc định trang 1 cỡ 20; ép kiểu số; cắt khoảng trắng của q', async () => {
    await expect(
      run(
        ListHistoryQuery,
        {
          q: '  mốc sương ',
          cropId: '3',
          resultType: 'DISEASE',
          from: '2026-11-01T00:00:00+07:00',
          to: '2026-11-24T00:00:00.000Z',
        },
        'query',
      ),
    ).resolves.toEqual({
      q: 'mốc sương',
      cropId: 3,
      resultType: 'DISEASE',
      from: '2026-11-01T00:00:00+07:00',
      to: '2026-11-24T00:00:00.000Z',
      page: 1,
      pageSize: 20,
    });
  });

  it('from bằng to vẫn hợp lệ', async () => {
    const t = '2026-11-23T00:00:00Z';
    await expect(
      run(ListHistoryQuery, { from: t, to: t }, 'query'),
    ).resolves.toMatchObject({ from: t, to: t });
  });

  it.each([
    [{ cropId: 'abc' }, 'cropId'],
    [{ resultType: 'FAILED' }, 'resultType'],
    [{ page: '0' }, 'page'],
    [{ pageSize: '51' }, 'pageSize'],
    [{ q: 'a'.repeat(101) }, 'q'],
    // Thiếu múi giờ, chỉ có ngày, hoặc ngày không có thật.
    [{ from: '2026-11-23T00:00:00' }, 'from'],
    [{ from: '2026-11-23' }, 'from'],
    [{ to: '2026-13-01T00:00:00Z' }, 'to'],
    // to trước from.
    [{ from: '2026-11-23T00:00:00Z', to: '2026-11-22T23:59:59Z' }, 'to'],
  ])('%o → lỗi trường %s', async (value, field) => {
    expect(await invalidFields(ListHistoryQuery, value, 'query')).toEqual([
      field,
    ]);
  });
});

describe('DiagnosisIdsDto (H2, H3, TD-27)', () => {
  it('nhận 1 → 100 id nguyên dương', async () => {
    await expect(
      run(DiagnosisIdsDto, { ids: [3, 1, 3] }, 'body'),
    ).resolves.toEqual({ ids: [3, 1, 3] });
    const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
    await expect(
      run(DiagnosisIdsDto, { ids: hundred }, 'body'),
    ).resolves.toEqual({ ids: hundred });
  });

  it.each([
    ['thiếu', {}],
    ['không phải mảng', { ids: 5 }],
    ['mảng rỗng', { ids: [] }],
    ['quá 100 phần tử', { ids: Array.from({ length: 101 }, (_, i) => i + 1) }],
    ['có số 0', { ids: [1, 0] }],
    ['có số thập phân', { ids: [1.5] }],
    ['có chuỗi', { ids: ['2'] }],
  ])('ids %s → lỗi trường ids', async (_, value) => {
    expect(await invalidFields(DiagnosisIdsDto, value, 'body')).toEqual([
      'ids',
    ]);
  });
});

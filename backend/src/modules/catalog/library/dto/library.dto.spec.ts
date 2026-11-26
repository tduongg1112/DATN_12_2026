import type { ArgumentMetadata } from '@nestjs/common';
import { AppException } from '../../../../common/exceptions/app.exception.js';
import { createValidationPipe } from '../../../../common/pipes/validation.pipe.js';
import { DiseaseIdParam, ListDiseasesQuery } from './library.dto.js';

const pipe = createValidationPipe();

async function run<T>(
  cls: new () => T,
  value: unknown,
  type: ArgumentMetadata['type'] = 'query',
): Promise<T> {
  return (await pipe.transform(value, { type, metatype: cls })) as T;
}

/** Trả danh sách field bị lỗi; ném lỗi nếu không phải AppException VALIDATION_ERROR. */
async function invalidFields(
  cls: new () => unknown,
  value: unknown,
  type: ArgumentMetadata['type'] = 'query',
): Promise<string[]> {
  try {
    await run(cls, value, type);
  } catch (e) {
    expect(e).toBeInstanceOf(AppException);
    const body = (e as AppException).getResponse() as {
      code: string;
      message: string;
      errors: { field: string; message: string }[];
    };
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('Dữ liệu không hợp lệ');
    for (const err of body.errors) {
      expect(err.message).toBe('Dữ liệu không hợp lệ');
    }
    return body.errors.map((x) => x.field);
  }
  return [];
}

describe('ListDiseasesQuery (L2; BR-05, TD-05, OQ-37)', () => {
  it('mặc định trang 1, 20 thẻ, không lọc', async () => {
    const q = await run(ListDiseasesQuery, {});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
    expect(q.cropId).toBeUndefined();
    expect(q.q).toBeUndefined();
  });

  it('đổi chuỗi query sang số, trim ô tìm', async () => {
    const q = await run(ListDiseasesQuery, {
      cropId: '3',
      q: '  mốc sương ',
      page: '2',
      pageSize: '6',
    });
    expect(q).toMatchObject({
      cropId: 3,
      q: 'mốc sương',
      page: 2,
      pageSize: 6,
    });
  });

  it('ô tìm chỉ có khoảng trắng thành chuỗi rỗng (bỏ qua khi lọc)', async () => {
    const q = await run(ListDiseasesQuery, { q: '   ' });
    expect(q.q).toBe('');
  });

  it('biên cỡ trang: 50 hợp lệ, 51 và 0 không hợp lệ', async () => {
    expect((await run(ListDiseasesQuery, { pageSize: '50' })).pageSize).toBe(
      50,
    );
    expect(await invalidFields(ListDiseasesQuery, { pageSize: '51' })).toEqual([
      'pageSize',
    ]);
    expect(await invalidFields(ListDiseasesQuery, { pageSize: '0' })).toEqual([
      'pageSize',
    ]);
  });

  it('biên ô tìm: 100 ký tự hợp lệ, 101 không hợp lệ', async () => {
    expect(
      (await run(ListDiseasesQuery, { q: 'a'.repeat(100) })).q,
    ).toHaveLength(100);
    expect(
      await invalidFields(ListDiseasesQuery, { q: 'a'.repeat(101) }),
    ).toEqual(['q']);
  });

  it.each([
    ['cropId', 'abc'],
    ['cropId', '0'],
    ['cropId', '1.5'],
    ['page', '0'],
    ['page', '-1'],
  ])('%s = %s không hợp lệ', async (field, value) => {
    expect(await invalidFields(ListDiseasesQuery, { [field]: value })).toEqual([
      field,
    ]);
  });

  it('tham số lặp lại (mảng) không hợp lệ', async () => {
    expect(
      await invalidFields(ListDiseasesQuery, {
        q: ['a', 'b'],
        page: ['1', '2'],
      }),
    ).toEqual(['q', 'page']);
  });
});

describe('DiseaseIdParam (L3)', () => {
  it('đổi id sang số', async () => {
    expect((await run(DiseaseIdParam, { id: '12' }, 'param')).id).toBe(12);
  });

  it.each(['abc', '0', '-3', '2.5', '99999999999999999999'])(
    'id = %s không hợp lệ',
    async (id) => {
      expect(await invalidFields(DiseaseIdParam, { id }, 'param')).toEqual([
        'id',
      ]);
    },
  );
});

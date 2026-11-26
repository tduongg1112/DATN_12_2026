import type { ArgumentMetadata } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { createValidationPipe } from '../../../common/pipes/validation.pipe.js';
import { CreateDiagnosisDto, DiagnosisIdParam } from './diagnosis.dto.js';

const pipe = createValidationPipe();

async function run<T>(
  cls: new () => T,
  value: unknown,
  type: ArgumentMetadata['type'],
): Promise<T> {
  return (await pipe.transform(value, { type, metatype: cls })) as T;
}

async function errorsOf(
  cls: new () => unknown,
  value: unknown,
  type: ArgumentMetadata['type'],
): Promise<{ field: string; message: string }[]> {
  const e = await run(cls, value, type).catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AppException);
  const body = (e as AppException).getResponse() as {
    code: string;
    message: string;
    errors: { field: string; message: string }[];
  };
  expect(body.code).toBe('VALIDATION_ERROR');
  expect(body.message).toBe('Dữ liệu không hợp lệ');
  return body.errors;
}

describe('CreateDiagnosisDto (D1, BR-07, OQ-05)', () => {
  it('cropId dạng chuỗi của multipart được đổi sang số', async () => {
    await expect(
      run(CreateDiagnosisDto, { cropId: '3' }, 'body'),
    ).resolves.toEqual({ cropId: 3 });
  });

  it.each([
    ['thiếu', {}],
    ['rỗng', { cropId: '' }],
    ['không phải số', { cropId: 'abc' }],
    ['số thập phân', { cropId: '1.5' }],
    ['bằng 0', { cropId: '0' }],
    ['âm', { cropId: '-2' }],
  ])('cropId %s: lỗi trường cropId "Vui lòng chọn loại cây"', async (_, v) => {
    expect(await errorsOf(CreateDiagnosisDto, v, 'body')).toEqual([
      { field: 'cropId', message: 'Vui lòng chọn loại cây' },
    ]);
  });

  it('bỏ trường lạ (whitelist)', async () => {
    await expect(
      run(CreateDiagnosisDto, { cropId: '2', userId: '9' }, 'body'),
    ).resolves.toEqual({ cropId: 2 });
  });
});

describe('DiagnosisIdParam (D2)', () => {
  it('id hợp lệ', async () => {
    await expect(run(DiagnosisIdParam, { id: '15' }, 'param')).resolves.toEqual(
      { id: 15 },
    );
  });

  it.each(['abc', '0', '1.5'])(
    'id %s: 400 "Dữ liệu không hợp lệ"',
    async (id) => {
      expect(await errorsOf(DiagnosisIdParam, { id }, 'param')).toEqual([
        { field: 'id', message: 'Dữ liệu không hợp lệ' },
      ]);
    },
  );
});

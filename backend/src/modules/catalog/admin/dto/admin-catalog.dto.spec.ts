import type { ArgumentMetadata } from '@nestjs/common';
import { AppException } from '../../../../common/exceptions/app.exception.js';
import { createValidationPipe } from '../../../../common/pipes/validation.pipe.js';
import {
  CreateDiseaseDto,
  CropFormDto,
  DiseaseStatusDto,
  ListAdminDiseasesQuery,
  UpdateDiseaseDto,
} from './admin-catalog.dto.js';

const pipe = createValidationPipe();
const REQUIRED = 'Vui lòng nhập đầy đủ thông tin bắt buộc';

async function run<T>(
  cls: new () => T,
  value: unknown,
  type: ArgumentMetadata['type'] = 'body',
): Promise<T> {
  return (await pipe.transform(value, { type, metatype: cls })) as T;
}

async function errorsOf(
  cls: new () => unknown,
  value: unknown,
  type: ArgumentMetadata['type'] = 'body',
): Promise<Record<string, string>> {
  const e = await run(cls, value, type).catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AppException);
  const body = (e as AppException).getResponse() as {
    code: string;
    errors: { field: string; message: string }[];
  };
  expect(body.code).toBe('VALIDATION_ERROR');
  return Object.fromEntries(body.errors.map((x) => [x.field, x.message]));
}

/** Form bệnh tối thiểu hợp lệ, dạng multipart (mọi giá trị là chuỗi). */
const disease = (extra: Record<string, string> = {}) => ({
  cropId: '3',
  name: '  Bệnh mốc sương ',
  pathogenGroup: 'FUNGUS',
  severity: 'HIGH',
  status: 'DRAFT',
  ...extra,
});

describe('ListAdminDiseasesQuery (B1)', () => {
  it('mặc định trang 1, 20 bệnh (OQ-60); nhận lọc loại cây, trạng thái', async () => {
    const q = await run(
      ListAdminDiseasesQuery,
      { q: ' mốc ', cropId: '2', status: 'HIDDEN' },
      'query',
    );
    expect(q).toMatchObject({
      q: 'mốc',
      cropId: 2,
      status: 'HIDDEN',
      page: 1,
      pageSize: 20,
    });
  });

  it('từ chối trạng thái lạ, cỡ trang quá 50', async () => {
    const errors = await errorsOf(
      ListAdminDiseasesQuery,
      { status: 'DELETED', pageSize: '51' },
      'query',
    );
    expect(Object.keys(errors).sort()).toEqual(['pageSize', 'status']);
  });
});

describe('CreateDiseaseDto (B3; C4 6.1, BR-06, OQ-53)', () => {
  it('nháp chỉ cần loại cây, tên, nhóm tác nhân, mức độ; ô trống thành null', async () => {
    const dto = await run(
      CreateDiseaseDto,
      disease({ summary: '  ', classCode: '', recheckDays: '' }),
    );
    expect(dto).toMatchObject({
      cropId: 3,
      name: 'Bệnh mốc sương',
      summary: null,
      classCode: null,
      recheckDays: null,
      isFeatured: false,
      status: 'DRAFT',
    });
  });

  it('thiếu trường bắt buộc: mỗi trường một câu C4 6.1', async () => {
    const errors = await errorsOf(CreateDiseaseDto, { name: ' ' });
    expect(errors).toEqual({
      cropId: REQUIRED,
      name: REQUIRED,
      pathogenGroup: REQUIRED,
      severity: REQUIRED,
      status: REQUIRED,
    });
  });

  it('chọn "Công khai" thì bắt buộc mô tả ngắn, triệu chứng, biện pháp xử lý (BR-06)', async () => {
    const errors = await errorsOf(
      CreateDiseaseDto,
      disease({ status: 'PUBLISHED', symptoms: 'Lá úa' }),
    );
    expect(errors).toEqual({ summary: REQUIRED, treatment: REQUIRED });
  });

  it('quá dài, số ngày ngoài khoảng: câu riêng ✎', async () => {
    const errors = await errorsOf(
      CreateDiseaseDto,
      disease({
        name: 'x'.repeat(151),
        summary: 'x'.repeat(501),
        causes: 'x'.repeat(5001),
        recheckDays: '0',
      }),
    );
    expect(errors).toEqual({
      name: 'Tên bệnh tối đa 150 ký tự',
      summary: 'Mô tả ngắn tối đa 500 ký tự',
      causes: 'Nội dung tối đa 5000 ký tự',
      recheckDays: 'Số ngày từ 1 đến 365',
    });
  });

  it('isFeatured nhận "true"/"false"; giá trị khác bị từ chối', async () => {
    expect(
      (await run(CreateDiseaseDto, disease({ isFeatured: 'true' }))).isFeatured,
    ).toBe(true);
    const errors = await errorsOf(
      CreateDiseaseDto,
      disease({ isFeatured: 'có' }),
    );
    expect(Object.keys(errors)).toEqual(['isFeatured']);
  });

  it('không nhận trạng thái "Ẩn" khi thêm', async () => {
    const errors = await errorsOf(
      CreateDiseaseDto,
      disease({ status: 'HIDDEN' }),
    );
    expect(errors).toEqual({ status: REQUIRED });
  });
});

describe('UpdateDiseaseDto (B4, OQ-54)', () => {
  it('không gửi status cũng hợp lệ (bệnh đã công khai, service kiểm tra)', async () => {
    const { status: _status, ...rest } = disease({ treatment: 'Phun thuốc' });
    const dto = await run(UpdateDiseaseDto, rest);
    expect(dto.status).toBeUndefined();
    expect(dto.treatment).toBe('Phun thuốc');
  });
});

describe('DiseaseStatusDto (B5)', () => {
  it('chỉ nhận PUBLISHED hoặc HIDDEN', async () => {
    expect((await run(DiseaseStatusDto, { status: 'HIDDEN' })).status).toBe(
      'HIDDEN',
    );
    await expect(run(DiseaseStatusDto, { status: 'DRAFT' })).rejects.toThrow(
      AppException,
    );
  });
});

describe('CropFormDto (C3, C4; OQ-53)', () => {
  const crop = (extra: Record<string, string> = {}) => ({
    code: 'TOMATO',
    name: 'Cà chua',
    ...extra,
  });

  it('chỉ bắt buộc mã và tên; số ngày trống là null', async () => {
    const dto = await run(
      CropFormDto,
      crop({ wateringIntervalDays: '', fertilizingIntervalDays: '14' }),
    );
    expect(dto).toMatchObject({
      code: 'TOMATO',
      wateringIntervalDays: null,
      fertilizingIntervalDays: 14,
      healthyClassCode: null,
      removeImage: false,
    });
  });

  it('thiếu mã, tên: câu C4 6.1; mã sai dạng: câu định dạng ✎', async () => {
    expect(await errorsOf(CropFormDto, { code: '', name: '' })).toEqual({
      code: REQUIRED,
      name: REQUIRED,
    });
    for (const code of ['tomato', '1RICE', 'CÀ', 'A', 'A'.repeat(31)]) {
      expect(await errorsOf(CropFormDto, crop({ code }))).toEqual({
        code: 'Mã loại cây chỉ gồm chữ in hoa, số và dấu gạch dưới',
      });
    }
  });

  it('giới hạn độ dài và khoảng số ngày ✎', async () => {
    const errors = await errorsOf(
      CropFormDto,
      crop({
        name: 'x'.repeat(101),
        description: 'x'.repeat(2001),
        careGuide: 'x'.repeat(5001),
        wateringIntervalDays: '366',
        fertilizingIntervalDays: 'abc',
      }),
    );
    expect(errors).toEqual({
      name: 'Tên loại cây tối đa 100 ký tự',
      description: 'Mô tả tối đa 2000 ký tự',
      careGuide: 'Nội dung tối đa 5000 ký tự',
      wateringIntervalDays: 'Số ngày từ 1 đến 365',
      fertilizingIntervalDays: 'Số ngày từ 1 đến 365',
    });
  });
});

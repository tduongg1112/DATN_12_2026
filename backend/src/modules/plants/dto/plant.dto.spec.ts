import type { ArgumentMetadata } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { createValidationPipe } from '../../../common/pipes/validation.pipe.js';
import {
  CreatePlantDto,
  CreatePlantLogDto,
  ListPlantsQuery,
  UpdatePlantDto,
  UpdatePlantStatusDto,
} from './plant.dto.js';

const pipe = createValidationPipe();
const REQUIRED = 'Vui lòng nhập tên gọi và chọn loại cây';

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

/** Ngày `yyyy-MM-dd` cách hôm nay (UTC) `days` ngày. */
const dayFromToday = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('ListPlantsQuery (P1, OQ-45)', () => {
  it('mặc định trang 1, 10 cây; tối đa 50', async () => {
    await expect(run(ListPlantsQuery, {}, 'query')).resolves.toEqual({
      page: 1,
      pageSize: 10,
    });
    expect(
      await errorsOf(ListPlantsQuery, { pageSize: '51' }, 'query'),
    ).toEqual({ pageSize: 'Dữ liệu không hợp lệ' });
  });
});

describe('CreatePlantDto (P2, BR-02)', () => {
  it('cắt khoảng trắng, ép kiểu cropId, ô trống coi như không gửi', async () => {
    await expect(
      run(CreatePlantDto, {
        name: '  Cà chua ban công ',
        cropId: '3',
        plantedDate: '',
        note: '  ',
      }),
    ).resolves.toEqual({ name: 'Cà chua ban công', cropId: 3 });
  });

  it('thiếu tên gọi và loại cây: câu C4 6.1 ở cả hai trường', async () => {
    expect(await errorsOf(CreatePlantDto, { name: '   ' })).toEqual({
      name: REQUIRED,
      cropId: REQUIRED,
    });
  });

  it('tên quá 100 ký tự, ghi chú quá 255 ký tự: câu riêng', async () => {
    expect(
      await errorsOf(CreatePlantDto, {
        name: 'a'.repeat(101),
        cropId: '1',
        note: 'b'.repeat(256),
      }),
    ).toEqual({
      name: 'Tên gọi tối đa 100 ký tự',
      note: 'Vị trí hoặc ghi chú tối đa 255 ký tự',
    });
  });

  it('ngày trồng: nhận hôm nay; sau hôm nay quá một ngày thì báo; ngày không có thật thì 400', async () => {
    await expect(
      run(CreatePlantDto, {
        name: 'A',
        cropId: '1',
        plantedDate: dayFromToday(0),
      }),
    ).resolves.toMatchObject({ plantedDate: dayFromToday(0) });
    expect(
      await errorsOf(CreatePlantDto, {
        name: 'A',
        cropId: '1',
        plantedDate: dayFromToday(3),
      }),
    ).toEqual({ plantedDate: 'Ngày trồng không được sau hôm nay' });
    expect(
      await errorsOf(CreatePlantDto, {
        name: 'A',
        cropId: '1',
        plantedDate: '2026-02-30',
      }),
    ).toEqual({ plantedDate: 'Dữ liệu không hợp lệ' });
  });
});

describe('UpdatePlantDto (P4, BR-10)', () => {
  it('mọi trường tuỳ chọn; chuỗi rỗng ở ngày trồng, ghi chú nghĩa là xoá', async () => {
    await expect(run(UpdatePlantDto, {})).resolves.toEqual({});
    await expect(
      run(UpdatePlantDto, { plantedDate: '', note: '' }),
    ).resolves.toEqual({ plantedDate: null, note: null });
  });

  it('gửi tên rỗng: câu C4 6.1', async () => {
    expect(await errorsOf(UpdatePlantDto, { name: ' ' })).toEqual({
      name: REQUIRED,
    });
  });
});

describe('UpdatePlantStatusDto (P6)', () => {
  it('chỉ nhận TREATING, RECOVERED', async () => {
    await expect(
      run(UpdatePlantStatusDto, { status: 'TREATING' }),
    ).resolves.toEqual({ status: 'TREATING' });
    expect(await errorsOf(UpdatePlantStatusDto, { status: 'HEALTHY' })).toEqual(
      { status: 'Dữ liệu không hợp lệ' },
    );
  });
});

describe('CreatePlantLogDto (P7, BR-09)', () => {
  it('thiếu nội dung, nội dung quá 1000 ký tự, ngày sau hôm nay: câu riêng', async () => {
    expect(await errorsOf(CreatePlantLogDto, { content: '  ' })).toEqual({
      content: 'Vui lòng nhập nội dung ghi chú',
    });
    expect(
      await errorsOf(CreatePlantLogDto, {
        content: 'x'.repeat(1001),
        actionDate: dayFromToday(5),
      }),
    ).toEqual({
      content: 'Nội dung tối đa 1000 ký tự',
      actionDate: 'Ngày thực hiện không được sau hôm nay',
    });
  });
});

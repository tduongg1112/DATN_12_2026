import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength, ValidateNested } from 'class-validator';
import { AppException } from '../exceptions/app.exception.js';
import { createValidationPipe } from './validation.pipe.js';

class AddressDto {
  @IsString({ message: 'Vui lòng nhập tên đường' })
  street: string;
}

class SampleDto {
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;

  @IsInt()
  age: number;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

describe('ValidationPipe toàn cục', () => {
  const pipe = createValidationPipe();
  const meta = { type: 'body' as const, metatype: SampleDto };

  it('trả AppException VALIDATION_ERROR kèm errors[{field, message}] (cả trường lồng)', async () => {
    const err = await pipe
      .transform({ password: '123', age: 'x', address: {} }, meta)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppException);
    const body = (err as AppException).getResponse() as Record<string, unknown>;
    expect(body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(body.errors).toEqual(
      expect.arrayContaining([
        { field: 'password', message: 'Mật khẩu tối thiểu 8 ký tự' },
        { field: 'address.street', message: 'Vui lòng nhập tên đường' },
        expect.objectContaining({ field: 'age' }),
      ]),
    );
  });

  it('whitelist: bỏ trường không khai báo trong DTO', async () => {
    const out = (await pipe.transform(
      { password: '12345678', age: 3, address: { street: 'a' }, role: 'ADMIN' },
      meta,
    )) as Record<string, unknown>;
    expect(out.role).toBeUndefined();
  });
});

import type { ArgumentMetadata } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { createValidationPipe } from '../../../common/pipes/validation.pipe.js';
import { FIELD_MESSAGES as M } from '../account-messages.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { ChangePasswordDto, UpdateProfileDto } from './profile.dto.js';

const pipe = createValidationPipe();

async function run<T>(cls: new () => T, body: unknown): Promise<T> {
  const meta: ArgumentMetadata = { type: 'body', metatype: cls };
  return (await pipe.transform(body, meta)) as T;
}

/** Trả `{ field: message }` của lỗi validation. */
async function fieldErrors(
  cls: new () => unknown,
  body: unknown,
): Promise<Record<string, string>> {
  try {
    await run(cls, body);
  } catch (e) {
    expect(e).toBeInstanceOf(AppException);
    const res = (e as AppException).getResponse() as {
      errors: { field: string; message: string }[];
    };
    return Object.fromEntries(res.errors.map((x) => [x.field, x.message]));
  }
  return {};
}

const valid = {
  fullName: '  Nguyễn Văn An  ',
  email: '  An@Example.COM ',
  password: 'matkhau1',
  confirmPassword: 'matkhau1',
};

describe('RegisterDto (BR-05, BR-11, OQ-32)', () => {
  it('hợp lệ: trim họ tên, email về chữ thường', async () => {
    const dto = await run(RegisterDto, valid);
    expect(dto.fullName).toBe('Nguyễn Văn An');
    expect(dto.email).toBe('an@example.com');
  });

  it('trường trống: chỉ báo câu "Vui lòng nhập …"', async () => {
    expect(
      await fieldErrors(RegisterDto, {
        fullName: ' ',
        email: '',
        password: '',
        confirmPassword: '',
      }),
    ).toEqual({
      fullName: M.FULL_NAME_REQUIRED,
      email: M.EMAIL_REQUIRED,
      password: M.PASSWORD_REQUIRED,
    });
  });

  it('thiếu hẳn trường cũng báo "Vui lòng nhập …"', async () => {
    const errors = await fieldErrors(RegisterDto, {});
    expect(errors.fullName).toBe(M.FULL_NAME_REQUIRED);
    expect(errors.email).toBe(M.EMAIL_REQUIRED);
    expect(errors.password).toBe(M.PASSWORD_REQUIRED);
  });

  it('email sai định dạng, họ tên quá 100 ký tự', async () => {
    expect(
      await fieldErrors(RegisterDto, {
        ...valid,
        email: 'khong-phai-email',
        fullName: 'a'.repeat(101),
      }),
    ).toEqual({ email: M.EMAIL_INVALID, fullName: M.FULL_NAME_TOO_LONG });
  });

  it.each([
    ['7 ký tự', 'abcdef1'],
    ['không có số', 'abcdefgh'],
    ['không có chữ', '12345678'],
  ])('mật khẩu yếu (%s)', async (_label, password) => {
    expect(
      await fieldErrors(RegisterDto, {
        ...valid,
        password,
        confirmPassword: password,
      }),
    ).toEqual({ password: M.PASSWORD_WEAK });
  });

  it('biên: 8 ký tự có chữ và số là đạt; chữ có dấu được tính là chữ', async () => {
    await expect(
      run(RegisterDto, {
        ...valid,
        password: 'abcdefg1',
        confirmPassword: 'abcdefg1',
      }),
    ).resolves.toBeDefined();
    await expect(
      run(RegisterDto, {
        ...valid,
        password: 'đườngđi1',
        confirmPassword: 'đườngđi1',
      }),
    ).resolves.toBeDefined();
  });

  it('mật khẩu quá 72 ký tự', async () => {
    const password = 'a1'.repeat(37);
    expect(
      await fieldErrors(RegisterDto, {
        ...valid,
        password,
        confirmPassword: password,
      }),
    ).toEqual({ password: M.PASSWORD_TOO_LONG });
  });

  it('xác nhận mật khẩu không khớp', async () => {
    expect(
      await fieldErrors(RegisterDto, { ...valid, confirmPassword: 'matkhau2' }),
    ).toEqual({ confirmPassword: M.PASSWORD_MISMATCH });
  });
});

describe('LoginDto', () => {
  it('không áp quy tắc mật khẩu khi đăng nhập', async () => {
    const dto = await run(LoginDto, { email: 'A@b.vn', password: 'x' });
    expect(dto).toMatchObject({ email: 'a@b.vn', password: 'x' });
  });

  it('trống email, mật khẩu', async () => {
    expect(await fieldErrors(LoginDto, { email: '', password: '' })).toEqual({
      email: M.EMAIL_REQUIRED,
      password: M.PASSWORD_REQUIRED,
    });
  });
});

describe('UpdateProfileDto, ChangePasswordDto', () => {
  it('fullName tuỳ chọn, nhưng gửi chuỗi trắng thì báo trống', async () => {
    await expect(run(UpdateProfileDto, {})).resolves.toEqual({});
    expect(await fieldErrors(UpdateProfileDto, { fullName: '   ' })).toEqual({
      fullName: M.FULL_NAME_REQUIRED,
    });
  });

  it('đổi mật khẩu: mật khẩu mới theo BR-05, xác nhận phải khớp', async () => {
    expect(
      await fieldErrors(ChangePasswordDto, {
        currentPassword: '',
        newPassword: 'abc',
        confirmNewPassword: 'abd',
      }),
    ).toEqual({
      currentPassword: M.PASSWORD_REQUIRED,
      newPassword: M.PASSWORD_WEAK,
      confirmNewPassword: M.PASSWORD_MISMATCH,
    });
  });
});

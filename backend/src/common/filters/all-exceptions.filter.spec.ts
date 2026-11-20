import { HttpStatus, NotFoundException } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter (TD-05)', () => {
  const filter = new AllExceptionsFilter();

  it('giữ nguyên code, message, errors của AppException', () => {
    const body = filter.toBody(
      new AppException(
        HttpStatus.CONFLICT,
        'AUTH_EMAIL_TAKEN',
        'Email này đã có tài khoản',
        [{ field: 'email', message: 'Email này đã có tài khoản' }],
      ),
    );
    expect(body).toEqual({
      statusCode: 409,
      code: 'AUTH_EMAIL_TAKEN',
      message: 'Email này đã có tài khoản',
      errors: [{ field: 'email', message: 'Email này đã có tài khoản' }],
    });
  });

  it('HttpException của Nest: dùng câu dự phòng tiếng Việt theo status', () => {
    expect(filter.toBody(new NotFoundException('Cannot GET /x'))).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Không tìm thấy dữ liệu',
    });
  });

  it('lỗi lạ: 500 INTERNAL_ERROR, không lộ nội dung lỗi gốc', () => {
    const body = filter.toBody(new Error('relation "users" does not exist'));
    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    });
  });

  it('ghi đúng status và body ra response', () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => res }) };
    filter.catch(new NotFoundException(), host as never);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });
});

import {
  HttpStatus,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { AppException, type FieldError } from '../exceptions/app.exception.js';
import { VALIDATION_ERROR } from '../exceptions/default-errors.js';

/** Trải lỗi lồng nhau thành `errors[{ field, message }]`, field dạng `a.b.0.c`. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {})
      .slice(0, 1)
      .map((message) => ({ field, message }));
    return [...own, ...flattenValidationErrors(e.children ?? [], field)];
  });
}

/**
 * ValidationPipe toàn cục (be-coding-rules.md mục 5). Câu lỗi từng trường lấy từ
 * `message` khai báo trong DTO; DTO của feature phải đặt câu tiếng Việt đúng specs.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        VALIDATION_ERROR.code,
        VALIDATION_ERROR.message,
        flattenValidationErrors(errors),
      ),
  });
}

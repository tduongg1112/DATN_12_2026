import { HttpException, HttpStatus } from '@nestjs/common';

/** Lỗi theo từng trường, để frontend hiện ngay dưới trường đó (TD-05). */
export interface FieldError {
  field: string;
  message: string;
}

/** Dạng lỗi chuẩn của API (TD-05). */
export interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  errors?: FieldError[];
}

/**
 * Lỗi nghiệp vụ. `code` là mã máy tiếng Anh UPPER_SNAKE; `message` là câu tiếng Việt
 * chép đúng từ specs (be-coding-rules.md mục 5).
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    readonly errors?: FieldError[],
  ) {
    const body: ErrorBody = { statusCode: status, code, message };
    if (errors?.length) body.errors = errors;
    super(body, status);
  }
}

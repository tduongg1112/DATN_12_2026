import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException, type ErrorBody } from '../exceptions/app.exception.js';
import { defaultErrorFor } from '../exceptions/default-errors.js';

/**
 * Đưa mọi lỗi về dạng `{ statusCode, code, message, errors? }` (TD-05).
 * Không để lộ stack trace hay câu SQL ra ngoài; lỗi 5xx được ghi log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    res.status(body.statusCode).json(body);
  }

  toBody(exception: unknown): ErrorBody {
    if (exception instanceof AppException) {
      return exception.getResponse() as ErrorBody;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { statusCode: status, ...defaultErrorFor(status) };
    }
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return { statusCode: status, ...defaultErrorFor(status) };
  }
}

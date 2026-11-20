import { Controller, Get, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator.js';
import { AppException } from '../common/exceptions/app.exception.js';

/** Endpoint hạ tầng (không phải nghiệp vụ): kiểm tra app chạy và kết nối được CSDL. */
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'DATABASE_UNAVAILABLE',
        'Hệ thống đang bận, vui lòng thử lại sau',
      );
    }
    return { status: 'ok', database: 'up' };
  }
}

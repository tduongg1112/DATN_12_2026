import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type {
  ModelLabelItem,
  StaleLabelItem,
} from '../../catalog/admin/dto/admin-catalog.dto.js';
import { ModelLabelsAdminService } from './model-labels.service.js';

/** Nhãn mô hình (docs/catalog/api_catalog.md M1, M2; TD-31 A). Chỉ ADMIN. */
@Controller('admin/labels')
@Roles('ADMIN')
export class ModelLabelsController {
  constructor(private readonly labels: ModelLabelsAdminService) {}

  /** M1 (US-07; BR-15, 18). */
  @Get('model')
  overview(): Promise<{ items: ModelLabelItem[]; stale: StaleLabelItem[] }> {
    return this.labels.overview();
  }

  /** M2 (BR-19). */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(): Promise<{ deactivated: number }> {
    return this.labels.sync();
  }
}

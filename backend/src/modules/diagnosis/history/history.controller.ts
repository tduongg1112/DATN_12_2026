import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  DiagnosisIdsDto,
  ListHistoryQuery,
  type HistoryPage,
} from './dto/history.dto.js';
import { HistoryService } from './history.service.js';

/**
 * Lịch sử tra cứu (docs/history/api_history.md H1 → H3). Chi tiết một lượt dùng D2 của
 * DiagnosisController. USER và ADMIN (OQ-22); chỉ lượt của chính mình (BR-01).
 */
@Controller('diagnoses')
@Roles('USER')
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  /** H1 (US-01, US-02). */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListHistoryQuery,
  ): Promise<HistoryPage> {
    return this.history.list(user.id, query);
  }

  /** H2 (US-06). */
  @Post('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Body() dto: DiagnosisIdsDto,
  ): Promise<void> {
    return this.history.remove(user.id, dto.ids);
  }

  /** H3 (US-06): hoàn tác. */
  @Post('restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  restore(
    @CurrentUser() user: AuthUser,
    @Body() dto: DiagnosisIdsDto,
  ): Promise<void> {
    return this.history.restore(user.id, dto.ids);
  }
}

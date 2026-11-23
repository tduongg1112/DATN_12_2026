import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  DiagnosisUploadInterceptor,
  type DiagnosisUploadFiles,
} from './diagnosis-upload.interceptor.js';
import { DiagnosisService } from './diagnosis.service.js';
import {
  CreateDiagnosisDto,
  DiagnosisIdParam,
  type DiagnosisResult,
} from './dto/diagnosis.dto.js';

/**
 * Chẩn đoán (docs/diagnosis/api_diagnosis.md D1, D2). USER và ADMIN (OQ-22); mỗi người
 * chỉ xem được lượt của chính mình (BR-G03).
 */
@Controller('diagnoses')
@Roles('USER')
export class DiagnosisController {
  constructor(private readonly diagnosis: DiagnosisService) {}

  /** D1 (US-01 → US-05). */
  @Post()
  @UseInterceptors(DiagnosisUploadInterceptor)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDiagnosisDto,
    @UploadedFiles() files?: DiagnosisUploadFiles,
  ): Promise<DiagnosisResult> {
    return this.diagnosis.create(user.id, dto, files);
  }

  /** D2 (US-05, US-08). */
  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param() params: DiagnosisIdParam,
  ): Promise<DiagnosisResult> {
    return this.diagnosis.getOwn(user.id, params.id);
  }
}

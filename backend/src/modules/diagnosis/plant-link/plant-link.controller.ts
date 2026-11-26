import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  CreatePlantDto,
  PlantIdDto,
  type PlantLink,
} from '../../plants/dto/plant.dto.js';
import { PlantAvatarInterceptor } from '../../plants/plant-upload.interceptor.js';
import type { UploadedImageFile } from '../../../common/storage/image-upload.interceptor.js';
import { DiagnosisIdParam } from '../dto/diagnosis.dto.js';
import { PlantLinkService } from './plant-link.service.js';

/**
 * "Lưu vào cây trồng của tôi" (docs/my_plants/api_my_plants.md A1, A2). USER và ADMIN
 * (OQ-22); chỉ lượt và cây của chính mình.
 */
@Controller('diagnoses')
@Roles('USER')
export class PlantLinkController {
  constructor(private readonly links: PlantLinkService) {}

  /** A1: gắn vào cây đã có. */
  @Post(':id/plant')
  @HttpCode(HttpStatus.OK)
  attach(
    @CurrentUser() user: AuthUser,
    @Param() params: DiagnosisIdParam,
    @Body() dto: PlantIdDto,
  ): Promise<PlantLink> {
    return this.links.attach(user.id, params.id, dto.plantId);
  }

  /** A2: tạo cây mới từ kết quả rồi gắn. */
  @Post(':id/new-plant')
  @UseInterceptors(PlantAvatarInterceptor)
  createPlant(
    @CurrentUser() user: AuthUser,
    @Param() params: DiagnosisIdParam,
    @Body() dto: CreatePlantDto,
    @UploadedFile() avatar?: UploadedImageFile,
  ): Promise<PlantLink> {
    return this.links.createPlant(user.id, params.id, dto, avatar?.buffer);
  }
}

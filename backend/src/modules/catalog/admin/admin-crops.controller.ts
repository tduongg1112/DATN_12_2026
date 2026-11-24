import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { AdminCropsService } from './admin-crops.service.js';
import {
  CropImageInterceptor,
  type UploadedImageFile,
} from './catalog-upload.interceptor.js';
import {
  CatalogIdParam,
  CropFormDto,
  CropStatusDto,
  type AdminCrop,
  type AdminCropItem,
} from './dto/admin-catalog.dto.js';

/** Quản trị loại cây (docs/catalog/api_catalog.md C1 → C5). Chỉ ADMIN. */
@Controller('admin/crops')
@Roles('ADMIN')
export class AdminCropsController {
  constructor(private readonly crops: AdminCropsService) {}

  /** C1 (US-06, BR-11). */
  @Get()
  list(): Promise<AdminCropItem[]> {
    return this.crops.list();
  }

  /** C2. */
  @Get(':id')
  get(@Param() params: CatalogIdParam): Promise<AdminCrop> {
    return this.crops.get(params.id);
  }

  /** C3 (US-06, 07). */
  @Post()
  @UseInterceptors(CropImageInterceptor)
  create(
    @Body() dto: CropFormDto,
    @UploadedFile() image?: UploadedImageFile,
  ): Promise<AdminCrop> {
    return this.crops.create(dto, image?.buffer);
  }

  /** C4 (US-06, 07). */
  @Put(':id')
  @UseInterceptors(CropImageInterceptor)
  update(
    @Param() params: CatalogIdParam,
    @Body() dto: CropFormDto,
    @UploadedFile() image?: UploadedImageFile,
  ): Promise<AdminCrop> {
    return this.crops.update(params.id, dto, image?.buffer);
  }

  /** C5 (BR-12). */
  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param() params: CatalogIdParam,
    @Body() dto: CropStatusDto,
  ): Promise<{ crop: AdminCrop; hiddenDiseases: number }> {
    return this.crops.changeStatus(params.id, dto.status);
  }
}

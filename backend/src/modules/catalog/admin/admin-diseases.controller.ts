import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { DiseaseCard } from '../library/dto/library.dto.js';
import { LibraryService } from '../library/library.service.js';
import { AdminDiseasesService } from './admin-diseases.service.js';
import { DiseaseImagesInterceptor } from './catalog-upload.interceptor.js';
import type { UploadedImageFile } from '../../../common/storage/image-upload.interceptor.js';
import {
  CatalogIdParam,
  CreateDiseaseDto,
  DiseaseStatusDto,
  ListAdminDiseasesQuery,
  RelatedDiseasesQuery,
  UpdateDiseaseDto,
  type AdminDisease,
  type AdminDiseaseItem,
  type AdminPage,
} from './dto/admin-catalog.dto.js';

/** Quản trị bệnh (docs/catalog/api_catalog.md B1 → B7). Chỉ ADMIN. */
@Controller('admin/diseases')
@Roles('ADMIN')
export class AdminDiseasesController {
  constructor(
    private readonly diseases: AdminDiseasesService,
    private readonly library: LibraryService,
  ) {}

  /** B1 (US-01, BR-01). */
  @Get()
  list(
    @Query() query: ListAdminDiseasesQuery,
  ): Promise<AdminPage<AdminDiseaseItem>> {
    return this.diseases.list(query);
  }

  /** B7 (OQ-58): khai báo trước `:id` để `related` không bị hiểu là id. */
  @Get('related')
  related(@Query() query: RelatedDiseasesQuery): Promise<DiseaseCard[]> {
    return this.library.relatedFor(query);
  }

  /** B2 (US-03, 04). */
  @Get(':id')
  get(@Param() params: CatalogIdParam): Promise<AdminDisease> {
    return this.diseases.get(params.id);
  }

  /** B3 (US-02, 07). */
  @Post()
  @UseInterceptors(DiseaseImagesInterceptor)
  create(
    @Body() dto: CreateDiseaseDto,
    @UploadedFiles() images: UploadedImageFile[] = [],
  ): Promise<AdminDisease> {
    return this.diseases.create(
      dto,
      images.map((f) => f.buffer),
    );
  }

  /** B4 (US-03, 07). */
  @Put(':id')
  @UseInterceptors(DiseaseImagesInterceptor)
  update(
    @Param() params: CatalogIdParam,
    @Body() dto: UpdateDiseaseDto,
    @UploadedFiles() images: UploadedImageFile[] = [],
  ): Promise<AdminDisease> {
    return this.diseases.update(
      params.id,
      dto,
      images.map((f) => f.buffer),
    );
  }

  /** B5 (US-05, C4 3c). */
  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param() params: CatalogIdParam,
    @Body() dto: DiseaseStatusDto,
  ): Promise<AdminDisease> {
    return this.diseases.changeStatus(params.id, dto.status);
  }

  /** B6 (BR-09, OQ-57). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: CatalogIdParam): Promise<void> {
    return this.diseases.remove(params.id);
  }
}

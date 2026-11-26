import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  DiseaseIdParam,
  ListDiseasesQuery,
  type CropSummary,
  type DiseaseCard,
  type DiseaseDetail,
  type Page,
} from './dto/library.dto.js';
import { LibraryService } from './library.service.js';

/**
 * Thư viện bệnh, chỉ đọc (docs/disease_library/api_disease_library.md, L1 → L3).
 * USER và ADMIN (ADMIN kế thừa USER, OQ-22). Dữ liệu danh mục dùng chung, không có
 * kiểm tra sở hữu.
 */
@Controller()
@Roles('USER')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  /** L1 (BR-05). */
  @Get('crops')
  listCrops(): Promise<CropSummary[]> {
    return this.library.listCrops();
  }

  /** L2 (US-01, US-02). */
  @Get('diseases')
  listDiseases(@Query() query: ListDiseasesQuery): Promise<Page<DiseaseCard>> {
    return this.library.listDiseases(query);
  }

  /** L3 (US-03). */
  @Get('diseases/:id')
  getDisease(@Param() params: DiseaseIdParam): Promise<DiseaseDetail> {
    return this.library.getDisease(params.id);
  }
}

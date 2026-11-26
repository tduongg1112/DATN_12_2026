import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCropsController } from './admin/admin-crops.controller.js';
import { AdminCropsService } from './admin/admin-crops.service.js';
import { AdminDiseasesController } from './admin/admin-diseases.controller.js';
import { AdminDiseasesService } from './admin/admin-diseases.service.js';
import { CropService } from './crop.service.js';
import { Crop } from './entities/crop.entity.js';
import { DiseaseImage } from './entities/disease-image.entity.js';
import { Disease } from './entities/disease.entity.js';
import { ModelLabel } from './entities/model-label.entity.js';
import { DiseaseTrendsQuery } from './library/disease-trends.query.js';
import { LibraryController } from './library/library.controller.js';
import { LibraryService } from './library/library.service.js';
import { ModelLabelService } from './model-label.service.js';

/**
 * Mô-đun Danh mục & nhãn mô hình. Thư viện bệnh chỉ đọc ở `library/` (feature
 * `disease_library`); quản trị danh mục ở `admin/` (feature `catalog`). Phần nhãn mô hình
 * cần gọi AI service (M1, M2) đặt ở mô-đun `diagnosis` (TD-31 A), gọi qua `ModelLabelService`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Crop, Disease, DiseaseImage, ModelLabel]),
  ],
  controllers: [
    LibraryController,
    AdminCropsController,
    AdminDiseasesController,
  ],
  providers: [
    ModelLabelService,
    CropService,
    LibraryService,
    DiseaseTrendsQuery,
    AdminCropsService,
    AdminDiseasesService,
  ],
  exports: [ModelLabelService, CropService],
})
export class CatalogModule {}

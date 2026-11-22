import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
 * `disease_library`); quản trị danh mục làm ở feature `catalog`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Crop, Disease, DiseaseImage, ModelLabel]),
  ],
  controllers: [LibraryController],
  providers: [ModelLabelService, LibraryService, DiseaseTrendsQuery],
  exports: [ModelLabelService],
})
export class CatalogModule {}

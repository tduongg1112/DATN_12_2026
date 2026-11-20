import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crop } from './entities/crop.entity.js';
import { DiseaseImage } from './entities/disease-image.entity.js';
import { Disease } from './entities/disease.entity.js';
import { ModelLabel } from './entities/model-label.entity.js';
import { ModelLabelService } from './model-label.service.js';

/** Mô-đun Danh mục & nhãn mô hình. Nghiệp vụ làm ở feature `catalog`. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Crop, Disease, DiseaseImage, ModelLabel]),
  ],
  providers: [ModelLabelService],
  exports: [ModelLabelService],
})
export class CatalogModule {}

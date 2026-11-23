import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { ModelLabelService } from '../catalog/model-label.service.js';
import { PlantsModule } from '../plants/plants.module.js';
import { AiClient } from './ai/ai-client.js';
import { HttpAiClient } from './ai/http-ai-client.js';
import { MockAiClient } from './ai/mock-ai-client.js';
import { DiagnosisController } from './diagnosis.controller.js';
import { DiagnosisService } from './diagnosis.service.js';
import { HistoryController } from './history/history.controller.js';
import { HistoryService } from './history/history.service.js';
import { DiagnosisPrediction } from './entities/diagnosis-prediction.entity.js';
import { Diagnosis } from './entities/diagnosis.entity.js';

/**
 * Mô-đun Chẩn đoán (feature `diagnosis`) và lịch sử tra cứu (feature `history`, thư mục
 * `history/`). Mọi lời gọi AI qua AiClient.
 * TD-25: `diagnosis` → `catalog`, `plants`; không mô-đun nào import ngược `diagnosis`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Diagnosis, DiagnosisPrediction]),
    CatalogModule,
    PlantsModule,
  ],
  controllers: [DiagnosisController, HistoryController],
  providers: [
    DiagnosisService,
    HistoryService,
    {
      provide: AiClient,
      inject: [ConfigService, ModelLabelService],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        labels: ModelLabelService,
      ): AiClient => {
        const timeoutMs = config.get('AI_TIMEOUT_MS', { infer: true });
        const defaultTopK = config.get('AI_TOP_K', { infer: true });
        if (config.get('AI_MODE', { infer: true }) === 'http') {
          return new HttpAiClient({
            baseUrl: config.get('AI_SERVICE_URL', { infer: true }),
            timeoutMs,
            defaultTopK,
          });
        }
        return new MockAiClient(() => labels.findActive(), {
          timeoutMs,
          defaultTopK,
          scenario: config.get('AI_MOCK_SCENARIO', { infer: true }),
        });
      },
    },
  ],
  exports: [AiClient],
})
export class DiagnosisModule {}

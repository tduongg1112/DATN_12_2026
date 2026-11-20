import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { ModelLabelService } from '../catalog/model-label.service.js';
import { AiClient } from './ai/ai-client.js';
import { HttpAiClient } from './ai/http-ai-client.js';
import { MockAiClient } from './ai/mock-ai-client.js';
import { DiagnosisPrediction } from './entities/diagnosis-prediction.entity.js';
import { Diagnosis } from './entities/diagnosis.entity.js';

/** Mô-đun Chẩn đoán. Nghiệp vụ làm ở feature `diagnosis`; mọi lời gọi AI qua AiClient. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Diagnosis, DiagnosisPrediction]),
    CatalogModule,
  ],
  providers: [
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

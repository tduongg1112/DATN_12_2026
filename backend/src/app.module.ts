import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module.js';
import { StorageModule } from './common/storage/storage.module.js';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { DiagnosisModule } from './modules/diagnosis/diagnosis.module.js';
import { PlantsModule } from './modules/plants/plants.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Job nhắc việc đăng ký ở feature my_plants (be-coding-rules.md mục 8).
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonModule,
    StorageModule,
    AccountsModule,
    CatalogModule,
    DiagnosisModule,
    PlantsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { Notification } from './entities/notification.entity.js';
import { PlantLog } from './entities/plant-log.entity.js';
import { Plant } from './entities/plant.entity.js';
import { Reminder } from './entities/reminder.entity.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { PlantReadsQuery } from './plant-reads.query.js';
import { PlantsController } from './plants.controller.js';
import { PlantsService } from './plants.service.js';
import { ReminderJob } from './reminder.job.js';

/**
 * Mô-đun Cây trồng & nhắc việc (feature `my_plants`).
 * TD-25: `plants` → `accounts`, `catalog`; `plants` không import `diagnosis`. Đọc lượt
 * chẩn đoán bằng truy vấn chỉ đọc `PlantReadsQuery` (TD-29). Job gửi nhắc: `ReminderJob`
 * (TD-28).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Plant, PlantLog, Reminder, Notification]),
    AccountsModule,
    CatalogModule,
  ],
  controllers: [PlantsController, NotificationsController],
  providers: [
    NotificationsService,
    PlantsService,
    PlantReadsQuery,
    ReminderJob,
  ],
  exports: [NotificationsService, PlantsService],
})
export class PlantsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module.js';
import { Notification } from './entities/notification.entity.js';
import { PlantLog } from './entities/plant-log.entity.js';
import { Plant } from './entities/plant.entity.js';
import { Reminder } from './entities/reminder.entity.js';
import { NotificationsService } from './notifications.service.js';

/**
 * Mô-đun Cây trồng & nhắc việc. Nghiệp vụ và job nhắc làm ở feature `my_plants`.
 * TD-25: `plants` → `accounts`; `plants` không import `diagnosis`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Plant, PlantLog, Reminder, Notification]),
    AccountsModule,
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class PlantsModule {}

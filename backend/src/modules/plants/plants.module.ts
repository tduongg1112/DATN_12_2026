import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity.js';
import { PlantLog } from './entities/plant-log.entity.js';
import { Plant } from './entities/plant.entity.js';
import { Reminder } from './entities/reminder.entity.js';

/** Mô-đun Cây trồng & nhắc việc. Nghiệp vụ và job nhắc làm ở feature `my_plants`. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Plant, PlantLog, Reminder, Notification]),
  ],
})
export class PlantsModule {}

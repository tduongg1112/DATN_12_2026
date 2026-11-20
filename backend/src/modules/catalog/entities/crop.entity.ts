import { Check, Column, Entity, Unique } from 'typeorm';
import {
  CreatedAtColumn,
  IdColumn,
  UpdatedAtColumn,
} from '../../../database/columns.js';

export const CROP_STATUSES = ['ACTIVE', 'HIDDEN'] as const;
export type CropStatus = (typeof CROP_STATUSES)[number];

/** Loại cây (data_model.md: crops). */
@Entity('crops')
@Unique('uq_crops_code', ['code'])
@Unique('uq_crops_name', ['name'])
@Check('ck_crops_watering_interval', `watering_interval_days > 0`)
@Check('ck_crops_fertilizing_interval', `fertilizing_interval_days > 0`)
@Check('ck_crops_status', `status IN ('ACTIVE', 'HIDDEN')`)
export class Crop {
  @IdColumn('crops')
  id: number;

  /** RICE, CORN, TOMATO, CHILI, POTATO */
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'care_guide', type: 'text', nullable: true })
  careGuide: string | null;

  /** DC-02, OQ-15 */
  @Column({ name: 'watering_interval_days', type: 'smallint', nullable: true })
  wateringIntervalDays: number | null;

  @Column({
    name: 'fertilizing_interval_days',
    type: 'smallint',
    nullable: true,
  })
  fertilizingIntervalDays: number | null;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' })
  status: CropStatus;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;
}

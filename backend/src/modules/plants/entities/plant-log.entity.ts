import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { CreatedAtColumn, IdColumn } from '../../../database/columns.js';
import { Plant } from './plant.entity.js';

export const LOG_TYPES = ['CARE_NOTE', 'STATUS_CHANGE'] as const;
export type LogType = (typeof LOG_TYPES)[number];

/** Nhật ký cây (data_model.md: plant_logs). */
@Entity('plant_logs')
@Index('ix_plant_logs_plant', ['plantId', 'actionDate'])
@Check('ck_plant_logs_log_type', `log_type IN ('CARE_NOTE', 'STATUS_CHANGE')`)
@Check(
  'ck_plant_logs_content_by_type',
  `(log_type = 'CARE_NOTE' AND content IS NOT NULL AND status_after IS NULL) OR (log_type = 'STATUS_CHANGE' AND status_after IN ('TREATING', 'RECOVERED'))`,
)
export class PlantLog {
  @IdColumn('plant_logs')
  id: number;

  @Column({ name: 'plant_id', type: 'bigint' })
  plantId: number;

  @ManyToOne(() => Plant, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'plant_id',
    foreignKeyConstraintName: 'fk_plant_logs_plant',
  })
  plant?: Relation<Plant>;

  @Column({ name: 'log_type', type: 'varchar', length: 20 })
  logType: LogType;

  /** Bắt buộc với CARE_NOTE. */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /** TREATING hoặc RECOVERED, chỉ với STATUS_CHANGE. */
  @Column({ name: 'status_after', type: 'varchar', length: 20, nullable: true })
  statusAfter: 'TREATING' | 'RECOVERED' | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  /** DATE: chuỗi 'YYYY-MM-DD'. */
  @Column({ name: 'action_date', type: 'date', default: () => 'CURRENT_DATE' })
  actionDate: string;

  @CreatedAtColumn()
  createdAt: Date;
}

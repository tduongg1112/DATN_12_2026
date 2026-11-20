import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import {
  CreatedAtColumn,
  IdColumn,
  UpdatedAtColumn,
} from '../../../database/columns.js';
import { User } from '../../accounts/entities/user.entity.js';
import { Crop } from '../../catalog/entities/crop.entity.js';

export const HEALTH_STATUSES = [
  'NOT_DIAGNOSED',
  'HEALTHY',
  'DISEASED',
  'TREATING',
  'RECOVERED',
] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

/** Cây trồng của người dùng (data_model.md: plants). */
@Entity('plants')
@Index('ix_plants_user', ['userId'])
@Check(
  'ck_plants_health_status',
  `health_status IN ('NOT_DIAGNOSED', 'HEALTHY', 'DISEASED', 'TREATING', 'RECOVERED')`,
)
export class Plant {
  @IdColumn('plants')
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_plants_user' })
  user?: Relation<User>;

  @Column({ name: 'crop_id', type: 'bigint' })
  cropId: number;

  @ManyToOne(() => Crop, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'crop_id', foreignKeyConstraintName: 'fk_plants_crop' })
  crop?: Relation<Crop>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** DATE: chuỗi 'YYYY-MM-DD'. */
  @Column({ name: 'planted_date', type: 'date', nullable: true })
  plantedDate: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  /** Vị trí hoặc ghi chú (DC-10: tên cột `note`). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({
    name: 'health_status',
    type: 'varchar',
    length: 20,
    default: 'NOT_DIAGNOSED',
  })
  healthStatus: HealthStatus;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;
}

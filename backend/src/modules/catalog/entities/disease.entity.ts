import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
  type Relation,
} from 'typeorm';
import {
  CreatedAtColumn,
  IdColumn,
  UpdatedAtColumn,
} from '../../../database/columns.js';
import { Crop } from './crop.entity.js';

export const PATHOGEN_GROUPS = [
  'FUNGUS',
  'BACTERIA',
  'VIRUS',
  'PEST',
  'PHYSIOLOGICAL',
] as const;
export type PathogenGroup = (typeof PATHOGEN_GROUPS)[number];

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'HIDDEN'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/** Bệnh cây (data_model.md: diseases). Không có source_refs (DC-04). */
@Entity('diseases')
@Unique('uq_diseases_crop_name', ['cropId', 'name'])
@Unique('uq_diseases_id_crop', ['id', 'cropId'])
@Index('ix_diseases_crop_status', ['cropId', 'status'])
@Check(
  'ck_diseases_pathogen_group',
  `pathogen_group IN ('FUNGUS', 'BACTERIA', 'VIRUS', 'PEST', 'PHYSIOLOGICAL')`,
)
@Check('ck_diseases_severity', `severity IN ('LOW', 'MEDIUM', 'HIGH')`)
@Check('ck_diseases_recheck_days', `recheck_days > 0`)
@Check('ck_diseases_status', `status IN ('DRAFT', 'PUBLISHED', 'HIDDEN')`)
export class Disease {
  @IdColumn('diseases')
  id: number;

  @Column({ name: 'crop_id', type: 'bigint' })
  cropId: number;

  @ManyToOne(() => Crop, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'crop_id', foreignKeyConstraintName: 'fk_diseases_crop' })
  crop?: Relation<Crop>;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  pathogen: string | null;

  @Column({ name: 'pathogen_group', type: 'varchar', length: 20 })
  pathogenGroup: PathogenGroup;

  @Column({ type: 'varchar', length: 10 })
  severity: Severity;

  /** Mô tả ngắn trên thẻ tin; bắt buộc trước khi công khai (DC-03). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  symptoms: string | null;

  @Column({ type: 'text', nullable: true })
  causes: string | null;

  @Column({ type: 'text', nullable: true })
  prevention: string | null;

  @Column({ type: 'text', nullable: true })
  treatment: string | null;

  @Column({ name: 'recheck_days', type: 'smallint', nullable: true })
  recheckDays: number | null;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'varchar', length: 10, default: 'DRAFT' })
  status: PublishStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;
}

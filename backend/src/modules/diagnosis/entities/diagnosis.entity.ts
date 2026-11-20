import {
  Check,
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { CreatedAtColumn, IdColumn } from '../../../database/columns.js';
import { User } from '../../accounts/entities/user.entity.js';
import { Crop } from '../../catalog/entities/crop.entity.js';
import { Plant } from '../../plants/entities/plant.entity.js';

export const DIAGNOSIS_STATUSES = [
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;
export type DiagnosisStatus = (typeof DIAGNOSIS_STATUSES)[number];

export const RESULT_TYPES = ['DISEASE', 'HEALTHY', 'UNCERTAIN'] as const;
export type ResultType = (typeof RESULT_TYPES)[number];

/**
 * Lượt chẩn đoán (data_model.md: diagnoses). Bệnh kết luận và độ tin cậy
 * không lưu ở đây, lấy từ dự đoán rank_no = 1. Xoá mềm bằng deleted_at.
 */
@Entity('diagnoses')
@Index('ix_diagnoses_user_created', ['userId', 'createdAt'], {
  where: 'deleted_at IS NULL',
})
@Index('ix_diagnoses_plant', ['plantId'], { where: 'plant_id IS NOT NULL' })
@Index('ix_diagnoses_created', ['createdAt'])
@Check('ck_diagnoses_status', `status IN ('PROCESSING', 'COMPLETED', 'FAILED')`)
@Check(
  'ck_diagnoses_result_type',
  `result_type IN ('DISEASE', 'HEALTHY', 'UNCERTAIN')`,
)
@Check('ck_diagnoses_inference_ms', `inference_ms >= 0`)
@Check(
  'ck_diagnoses_result_when_completed',
  `(status = 'COMPLETED') = (result_type IS NOT NULL)`,
)
@Check(
  'ck_diagnoses_completed_at',
  `(status = 'PROCESSING') = (completed_at IS NULL)`,
)
export class Diagnosis {
  @IdColumn('diagnoses')
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_diagnoses_user',
  })
  user?: Relation<User>;

  @Column({ name: 'plant_id', type: 'bigint', nullable: true })
  plantId: number | null;

  @ManyToOne(() => Plant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'plant_id',
    foreignKeyConstraintName: 'fk_diagnoses_plant',
  })
  plant?: Relation<Plant> | null;

  /** Tuỳ chọn (OQ-05). NULL thì loại cây lấy theo nhãn hạng 1. */
  @Column({ name: 'crop_id', type: 'bigint', nullable: true })
  cropId: number | null;

  @ManyToOne(() => Crop, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({
    name: 'crop_id',
    foreignKeyConstraintName: 'fk_diagnoses_crop',
  })
  crop?: Relation<Crop> | null;

  @Column({ name: 'original_image_url', type: 'varchar', length: 500 })
  originalImageUrl: string;

  /** Ảnh đã chỉnh, là ảnh gửi AI. */
  @Column({ name: 'processed_image_url', type: 'varchar', length: 500 })
  processedImageUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'PROCESSING' })
  status: DiagnosisStatus;

  /** Chỉ có khi COMPLETED. */
  @Column({ name: 'result_type', type: 'varchar', length: 20, nullable: true })
  resultType: ResultType | null;

  @Column({
    name: 'model_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  modelVersion: string | null;

  @Column({ name: 'inference_ms', type: 'int', nullable: true })
  inferenceMs: number | null;

  /** Lúc gửi ảnh. */
  @CreatedAtColumn()
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}

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
import { Disease } from './disease.entity.js';

export const LABEL_TYPES = ['HEALTHY', 'DISEASE'] as const;
export type LabelType = (typeof LABEL_TYPES)[number];

/**
 * Nhãn mô hình (data_model.md: model_labels). Nhãn DISEASE trỏ tới bệnh cùng loại cây
 * qua khoá ngoại kép (disease_id, crop_id) → diseases (id, crop_id).
 */
@Entity('model_labels')
@Unique('uq_model_labels_class_code', ['classCode'])
@Index('ix_model_labels_crop', ['cropId'])
@Index('ux_model_labels_disease_id_active', ['diseaseId'], {
  unique: true,
  where: 'is_active',
})
@Index('ux_model_labels_healthy_per_crop', ['cropId'], {
  unique: true,
  where: `label_type = 'HEALTHY' AND is_active`,
})
@Check('ck_model_labels_label_type', `label_type IN ('HEALTHY', 'DISEASE')`)
@Check(
  'ck_model_labels_disease_matches_type',
  `(label_type = 'DISEASE') = (disease_id IS NOT NULL)`,
)
export class ModelLabel {
  @IdColumn('model_labels')
  id: number;

  /** Nhãn đầu ra của mô hình, vd Tomato___Late_blight. */
  @Column({ name: 'class_code', type: 'varchar', length: 100 })
  classCode: string;

  @Column({ name: 'label_type', type: 'varchar', length: 10 })
  labelType: LabelType;

  @Column({ name: 'crop_id', type: 'bigint' })
  cropId: number;

  @ManyToOne(() => Crop, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'crop_id',
    foreignKeyConstraintName: 'fk_model_labels_crop',
  })
  crop?: Relation<Crop>;

  /** Bắt buộc khi DISEASE, NULL khi HEALTHY. */
  @Column({ name: 'disease_id', type: 'bigint', nullable: true })
  diseaseId: number | null;

  @ManyToOne(() => Disease, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn([
    {
      name: 'disease_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_model_labels_disease_crop',
    },
    {
      name: 'crop_id',
      referencedColumnName: 'cropId',
      foreignKeyConstraintName: 'fk_model_labels_disease_crop',
    },
  ])
  disease?: Relation<Disease> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;
}

import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { decimalTransformer } from '../../../database/transformers.js';
import { ModelLabel } from '../../catalog/entities/model-label.entity.js';
import { Diagnosis } from './diagnosis.entity.js';

/** Kết quả dự đoán top-k (data_model.md: diagnosis_predictions). */
@Entity('diagnosis_predictions')
@Unique('uq_diagnosis_predictions_rank', ['diagnosisId', 'rankNo'])
@Index('ix_predictions_label', ['labelId'])
@Check('ck_diagnosis_predictions_probability', `probability BETWEEN 0 AND 1`)
@Check('ck_diagnosis_predictions_rank_no', `rank_no >= 1`)
export class DiagnosisPrediction {
  @PrimaryColumn({
    name: 'diagnosis_id',
    type: 'bigint',
    primaryKeyConstraintName: 'pk_diagnosis_predictions',
  })
  diagnosisId: number;

  @PrimaryColumn({
    name: 'label_id',
    type: 'bigint',
    primaryKeyConstraintName: 'pk_diagnosis_predictions',
  })
  labelId: number;

  @ManyToOne(() => Diagnosis, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'diagnosis_id',
    foreignKeyConstraintName: 'fk_diagnosis_predictions_diagnosis',
  })
  diagnosis?: Relation<Diagnosis>;

  @ManyToOne(() => ModelLabel, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'label_id',
    foreignKeyConstraintName: 'fk_diagnosis_predictions_label',
  })
  label?: Relation<ModelLabel>;

  /** DECIMAL(5,4) trong [0,1]; transformer đổi sang number. */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    transformer: decimalTransformer,
  })
  probability: number;

  /** 1 là kết luận. */
  @Column({ name: 'rank_no', type: 'smallint' })
  rankNo: number;
}

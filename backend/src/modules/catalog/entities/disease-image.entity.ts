import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { CreatedAtColumn, IdColumn } from '../../../database/columns.js';
import { Disease } from './disease.entity.js';

/** Ảnh minh hoạ bệnh (data_model.md: disease_images). */
@Entity('disease_images')
export class DiseaseImage {
  @IdColumn('disease_images')
  id: number;

  @Column({ name: 'disease_id', type: 'bigint' })
  diseaseId: number;

  @ManyToOne(() => Disease, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'disease_id',
    foreignKeyConstraintName: 'fk_disease_images_disease',
  })
  disease?: Relation<Disease>;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  caption: string | null;

  /** Nhỏ nhất làm ảnh bìa. */
  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;

  @CreatedAtColumn()
  createdAt: Date;
}

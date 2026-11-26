import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type {
  ModelLabelItem,
  StaleLabelItem,
} from './admin/dto/admin-catalog.dto.js';
import type { PublishStatus } from './entities/disease.entity.js';
import { ModelLabel, type LabelType } from './entities/model-label.entity.js';

interface MappingRow {
  class_code: string;
  label_type: LabelType;
  is_active: boolean;
  crop_id: number;
  crop_name: string;
  disease_id: number | null;
  disease_name: string | null;
  disease_status: PublishStatus | null;
}

export interface ActiveLabel {
  classCode: string;
  cropCode: string;
}

/** Nhãn đang dùng, tra theo `class_code` AI trả về (diagnosis BR-11). */
export interface LabelMatch {
  id: number;
  classCode: string;
  labelType: LabelType;
  diseaseId: number | null;
}

/** Đọc nhãn mô hình đang dùng. Mô-đun khác dùng service này, không inject repository. */
@Injectable()
export class ModelLabelService {
  constructor(
    @InjectRepository(ModelLabel)
    private readonly labels: Repository<ModelLabel>,
  ) {}

  async findActive(): Promise<ActiveLabel[]> {
    const rows = await this.labels.find({
      where: { isActive: true },
      relations: { crop: true },
      order: { id: 'ASC' },
    });
    return rows.map((l) => ({
      classCode: l.classCode,
      cropCode: l.crop!.code,
    }));
  }

  /** Nhãn đang dùng có `class_code` trong danh sách; mã không khớp thì không có trong kết quả (Q2). */
  async findActiveByCodes(codes: string[]): Promise<LabelMatch[]> {
    if (codes.length === 0) return [];
    const rows = await this.labels.find({
      select: { id: true, classCode: true, labelType: true, diseaseId: true },
      where: { classCode: In(codes), isActive: true },
    });
    return rows.map((l) => ({
      id: l.id,
      classCode: l.classCode,
      labelType: l.labelType,
      diseaseId: l.diseaseId,
    }));
  }

  /**
   * catalog M1 (Q9; TD-31 A): đối chiếu danh sách mã của mô hình đang dùng với danh mục.
   * `items` theo `classCode`; `stale` là nhãn đang gán mà mô hình không còn (BR-19).
   */
  async modelMapping(
    modelCodes: string[],
  ): Promise<{ items: ModelLabelItem[]; stale: StaleLabelItem[] }> {
    const codes = [...new Set(modelCodes)].sort();
    const rows = await this.labels.query<MappingRow[]>(
      `SELECT l.class_code, l.label_type, l.is_active,
              c.id AS crop_id, c.name AS crop_name,
              d.id AS disease_id, d.name AS disease_name, d.status AS disease_status
         FROM model_labels l
         JOIN crops c ON c.id = l.crop_id
         LEFT JOIN diseases d ON d.id = l.disease_id
        WHERE l.is_active OR l.class_code = ANY($1)`,
      [codes],
    );
    const active = new Map(
      rows.filter((r) => r.is_active).map((r) => [r.class_code, r]),
    );
    const inModel = new Set(codes);
    const disease = (r: MappingRow) =>
      r.disease_id === null
        ? null
        : {
            id: Number(r.disease_id),
            name: r.disease_name!,
            status: r.disease_status!,
          };
    return {
      items: codes.map((classCode) => {
        const r = active.get(classCode);
        return r
          ? {
              classCode,
              assigned: true,
              labelType: r.label_type,
              crop: { id: Number(r.crop_id), name: r.crop_name },
              disease: disease(r),
            }
          : {
              classCode,
              assigned: false,
              labelType: null,
              crop: null,
              disease: null,
            };
      }),
      stale: [...active.values()]
        .filter((r) => !inModel.has(r.class_code))
        .sort((a, b) => a.class_code.localeCompare(b.class_code))
        .map((r) => ({
          classCode: r.class_code,
          labelType: r.label_type,
          crop: { id: Number(r.crop_id), name: r.crop_name },
          disease: disease(r),
        })),
    };
  }

  /** catalog M2 (Q10, BR-19): tắt nhãn đang gán không còn trong mô hình. Trả số nhãn đã tắt. */
  async deactivateMissing(modelCodes: string[]): Promise<number> {
    const result = await this.labels
      .createQueryBuilder()
      .update(ModelLabel)
      .set({ isActive: false })
      .where('is_active')
      .andWhere('NOT (class_code = ANY(:codes))', { codes: modelCodes })
      .execute();
    return result.affected ?? 0;
  }
}

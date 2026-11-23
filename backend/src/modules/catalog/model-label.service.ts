import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ModelLabel, type LabelType } from './entities/model-label.entity.js';

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
}

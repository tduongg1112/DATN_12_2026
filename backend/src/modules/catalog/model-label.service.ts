import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelLabel } from './entities/model-label.entity.js';

export interface ActiveLabel {
  classCode: string;
  cropCode: string;
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
}

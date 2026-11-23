import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crop } from './entities/crop.entity.js';

/** Loại cây đang hiển thị, đủ cho mô-đun khác dùng (vd chẩn đoán gửi `crop_code` cho AI). */
export interface ActiveCrop {
  id: number;
  code: string;
  name: string;
  careGuide: string | null;
}

/** Đọc loại cây. Mô-đun khác dùng service này, không inject repository (be-coding-rules mục 2). */
@Injectable()
export class CropService {
  constructor(
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
  ) {}

  /** Loại cây `ACTIVE` theo id; không có hoặc đang ẩn thì `null` (diagnosis Q1). */
  async findActive(id: number): Promise<ActiveCrop | null> {
    const crop = await this.crops.findOne({
      select: { id: true, code: true, name: true, careGuide: true },
      where: { id, status: 'ACTIVE' },
    });
    return crop
      ? {
          id: crop.id,
          code: crop.code,
          name: crop.name,
          careGuide: crop.careGuide,
        }
      : null;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { StorageService } from '../../../common/storage/storage.service.js';
import { Crop, type CropStatus } from '../entities/crop.entity.js';
import { Disease } from '../entities/disease.entity.js';
import {
  CATALOG_MESSAGES as M,
  PG_UNIQUE_VIOLATION,
  conflict,
  cropNotFound,
  pgError,
} from './catalog-messages.js';
import type {
  AdminCrop,
  AdminCropItem,
  CropFormDto,
} from './dto/admin-catalog.dto.js';
import { assignLabel } from './label-assignment.js';

interface CropRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  image_url: string | null;
  care_guide: string | null;
  watering_interval_days: number | null;
  fertilizing_interval_days: number | null;
  status: CropStatus;
  created_at: Date;
  updated_at: Date;
  disease_count: number;
  published_count: number;
  healthy_class_code: string | null;
}

/** Q1 của database_design_catalog.md: loại cây kèm số bệnh và mã lớp khoẻ mạnh đang gán. */
const CROPS_SQL = `
  SELECT c.id, c.code, c.name, c.description, c.image_url, c.care_guide,
         c.watering_interval_days, c.fertilizing_interval_days, c.status,
         c.created_at, c.updated_at,
         COALESCE(d.total, 0)::int AS disease_count,
         COALESCE(d.published, 0)::int AS published_count,
         l.class_code AS healthy_class_code
    FROM crops c
    LEFT JOIN (
      SELECT crop_id, COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS published
        FROM diseases GROUP BY crop_id
    ) d ON d.crop_id = c.id
    LEFT JOIN model_labels l
      ON l.crop_id = c.id AND l.label_type = 'HEALTHY' AND l.is_active`;

/**
 * Quản trị loại cây (docs/catalog/api_catalog.md C1 → C5). Không có xoá loại cây (C4 3d,
 * ERD-doc 7.3).
 */
@Injectable()
export class AdminCropsService {
  private readonly logger = new Logger(AdminCropsService.name);

  constructor(
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
    private readonly storage: StorageService,
  ) {}

  /** C1 (BR-11, C4 2d). */
  async list(): Promise<AdminCropItem[]> {
    const rows = await this.crops.query<CropRow[]>(
      `${CROPS_SQL} ORDER BY c.id`,
    );
    return Promise.all(
      rows.map(async (r) => {
        const { id, code, name, status, healthyClassCode, ...rest } =
          await this.toView(r);
        return {
          id,
          code,
          name,
          imageUrl: rest.imageUrl,
          status,
          diseaseCount: rest.diseaseCount,
          publishedDiseaseCount: rest.publishedDiseaseCount,
          healthyClassCode,
        };
      }),
    );
  }

  /** C2. */
  async get(id: number): Promise<AdminCrop> {
    const [row] = await this.crops.query<CropRow[]>(
      `${CROPS_SQL} WHERE c.id = $1`,
      [id],
    );
    if (!row) throw cropNotFound();
    return this.toView(row);
  }

  /** C3 (BR-11, BR-16 → 18): tạo loại cây `ACTIVE` và gán mã lớp khoẻ mạnh trong một giao dịch. */
  async create(dto: CropFormDto, image?: Buffer): Promise<AdminCrop> {
    const saved = image
      ? await this.storage.saveImage(image, 'crops')
      : undefined;
    let id: number;
    try {
      id = await this.crops.manager.transaction(async (manager) => {
        await this.assertUnique(manager, dto, null);
        const result = await manager.insert(Crop, {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          careGuide: dto.careGuide,
          wateringIntervalDays: dto.wateringIntervalDays,
          fertilizingIntervalDays: dto.fertilizingIntervalDays,
          imageUrl: saved?.key ?? null,
          status: 'ACTIVE',
        });
        const cropId = Number(result.identifiers[0].id);
        await assignLabel(
          manager,
          { kind: 'HEALTHY', cropId },
          dto.healthyClassCode,
          'healthyClassCode',
        );
        return cropId;
      });
    } catch (error) {
      await this.deleteQuietly(saved?.key);
      throw this.mapUniqueViolation(error);
    }
    return this.get(id);
  }

  /** C4. Có ảnh mới thì thay; `removeImage` thì bỏ; ảnh cũ xoá sau khi lưu. */
  async update(
    id: number,
    dto: CropFormDto,
    image?: Buffer,
  ): Promise<AdminCrop> {
    if (!(await this.crops.existsBy({ id }))) throw cropNotFound();
    const saved = image
      ? await this.storage.saveImage(image, 'crops')
      : undefined;
    let oldImage: string | null = null;
    try {
      await this.crops.manager.transaction(async (manager) => {
        const crop = await manager
          .getRepository(Crop)
          .createQueryBuilder('c')
          .setLock('pessimistic_write')
          .where('c.id = :id', { id })
          .getOne();
        if (!crop) throw cropNotFound();
        await this.assertUnique(manager, dto, id);
        const imageUrl = saved
          ? saved.key
          : dto.removeImage
            ? null
            : crop.imageUrl;
        if (imageUrl !== crop.imageUrl) oldImage = crop.imageUrl;
        await manager.update(Crop, id, {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          careGuide: dto.careGuide,
          wateringIntervalDays: dto.wateringIntervalDays,
          fertilizingIntervalDays: dto.fertilizingIntervalDays,
          imageUrl,
        });
        await assignLabel(
          manager,
          { kind: 'HEALTHY', cropId: id },
          dto.healthyClassCode,
          'healthyClassCode',
        );
      });
    } catch (error) {
      await this.deleteQuietly(saved?.key);
      throw this.mapUniqueViolation(error);
    }
    await this.deleteQuietly(oldImage);
    return this.get(id);
  }

  /**
   * C5. Ẩn (BR-12, C4 3d1): ẩn kèm các bệnh đang công khai, bệnh nháp giữ nguyên. Hiện: không
   * tự hiện lại bệnh (OQ-56). Đã ở trạng thái đích thì không đổi gì.
   */
  async changeStatus(
    id: number,
    status: CropStatus,
  ): Promise<{ crop: AdminCrop; hiddenDiseases: number }> {
    const hiddenDiseases = await this.crops.manager.transaction(
      async (manager) => {
        const crop = await manager
          .getRepository(Crop)
          .createQueryBuilder('c')
          .setLock('pessimistic_write')
          .where('c.id = :id', { id })
          .getOne();
        if (!crop) throw cropNotFound();
        if (crop.status === status) return 0;
        await manager.update(Crop, id, { status });
        if (status === 'ACTIVE') return 0;
        const result = await manager.update(
          Disease,
          { cropId: id, status: 'PUBLISHED' },
          { status: 'HIDDEN' },
        );
        return result.affected ?? 0;
      },
    );
    return { crop: await this.get(id), hiddenDiseases };
  }

  /** Mã, tên không trùng loại cây khác (tên không phân biệt hoa thường, OQ-60). */
  private async assertUnique(
    manager: EntityManager,
    dto: CropFormDto,
    selfId: number | null,
  ): Promise<void> {
    const rows = await manager.query<{ code: string; name: string }[]>(
      `SELECT code, name FROM crops
        WHERE (code = $1 OR LOWER(name) = LOWER($2)) AND id <> $3`,
      [dto.code, dto.name, selfId ?? 0],
    );
    if (rows.some((r) => r.code === dto.code)) {
      throw conflict('CROP_CODE_TAKEN', M.CROP_CODE_TAKEN, 'code');
    }
    if (rows.length > 0) {
      throw conflict('CROP_NAME_TAKEN', M.CROP_NAME_TAKEN, 'name');
    }
  }

  /** Hai yêu cầu cùng lúc vượt qua kiểm tra trước: ràng buộc duy nhất của CSDL chặn. */
  private mapUniqueViolation(error: unknown): unknown {
    const pg = pgError(error);
    if (pg?.code !== PG_UNIQUE_VIOLATION) return error;
    if (pg.constraint === 'uq_crops_code') {
      return conflict('CROP_CODE_TAKEN', M.CROP_CODE_TAKEN, 'code');
    }
    if (pg.constraint === 'uq_crops_name') {
      return conflict('CROP_NAME_TAKEN', M.CROP_NAME_TAKEN, 'name');
    }
    return error;
  }

  private async toView(r: CropRow): Promise<AdminCrop> {
    return {
      id: Number(r.id),
      code: r.code,
      name: r.name,
      imageUrl: await this.storage.resolveUrl(r.image_url),
      status: r.status,
      diseaseCount: Number(r.disease_count),
      publishedDiseaseCount: Number(r.published_count),
      healthyClassCode: r.healthy_class_code,
      description: r.description,
      careGuide: r.care_guide,
      wateringIntervalDays: r.watering_interval_days,
      fertilizingIntervalDays: r.fertilizing_interval_days,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private async deleteQuietly(
    stored: string | null | undefined,
  ): Promise<void> {
    await this.storage
      .deleteStored(stored)
      .catch((e: unknown) =>
        this.logger.warn(`Không xoá được ảnh ${stored}: ${String(e)}`),
      );
  }
}

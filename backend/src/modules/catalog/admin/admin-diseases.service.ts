import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { AppException } from '../../../common/exceptions/app.exception.js';
import {
  StorageService,
  type StoredFile,
} from '../../../common/storage/storage.service.js';
import { Crop } from '../entities/crop.entity.js';
import { DiseaseImage } from '../entities/disease-image.entity.js';
import { Disease, type PublishStatus } from '../entities/disease.entity.js';
import { ModelLabel } from '../entities/model-label.entity.js';
import { escapeLike } from '../../../common/sql/escape-like.js';
import {
  CATALOG_MESSAGES as M,
  PG_DELETE_BLOCKED_CODES,
  PG_UNIQUE_VIOLATION,
  conflict,
  contentRequired,
  diseaseCropMissing,
  diseaseNotFound,
  fieldErrors,
  pgError,
  statusNotAllowed,
} from './catalog-messages.js';
import type {
  AdminDisease,
  AdminDiseaseItem,
  AdminPage,
  CreateDiseaseDto,
  ListAdminDiseasesQuery,
  UpdateDiseaseDto,
} from './dto/admin-catalog.dto.js';
import { parseImageLayout, type LayoutEntry } from './image-layout.js';
import { assignLabel } from './label-assignment.js';

/** BR-06: ba trường phải có trước khi công khai. */
const PUBLISH_FIELDS = ['summary', 'symptoms', 'treatment'] as const;

/** Trường nội dung bắt buộc còn thiếu nếu bệnh ở trạng thái `PUBLISHED` (BR-06). */
export function missingPublishFields(content: {
  summary: string | null;
  symptoms: string | null;
  treatment: string | null;
}): string[] {
  return PUBLISH_FIELDS.filter((f) => !content[f]?.trim());
}

interface ListRow {
  id: number;
  name: string;
  status: PublishStatus;
  is_featured: boolean;
  updated_at: Date;
  crop_id: number;
  crop_code: string;
  crop_name: string;
  crop_status: Crop['status'];
  class_code: string | null;
}

/**
 * Quản trị bệnh (docs/catalog/api_catalog.md B1 → B6). Mọi thao tác ghi bệnh, ảnh và nhãn
 * nằm trong một giao dịch (BR-10); ảnh lưu trước giao dịch, lỗi thì xoá, ảnh bị gỡ xoá sau.
 */
@Injectable()
export class AdminDiseasesService {
  private readonly logger = new Logger(AdminDiseasesService.name);

  constructor(
    @InjectRepository(Disease) private readonly diseases: Repository<Disease>,
    @InjectRepository(DiseaseImage)
    private readonly images: Repository<DiseaseImage>,
    private readonly storage: StorageService,
  ) {}

  /** B1 (BR-01): Q2, mới cập nhật trước. */
  async list(
    query: ListAdminDiseasesQuery,
  ): Promise<AdminPage<AdminDiseaseItem>> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.q) {
      params.push(`%${escapeLike(query.q)}%`);
      where.push(`d.name ILIKE $${params.length} ESCAPE '\\'`);
    }
    if (query.cropId !== undefined) {
      params.push(query.cropId);
      where.push(`d.crop_id = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      where.push(`d.status = $${params.length}`);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [countRow] = await this.diseases.query<{ total: number }[]>(
      `SELECT COUNT(*)::int AS total FROM diseases d ${filter}`,
      params,
    );
    const rows = await this.diseases.query<ListRow[]>(
      `SELECT d.id, d.name, d.status, d.is_featured, d.updated_at,
              c.id AS crop_id, c.code AS crop_code, c.name AS crop_name,
              c.status AS crop_status, l.class_code
         FROM diseases d
         JOIN crops c ON c.id = d.crop_id
         LEFT JOIN model_labels l ON l.disease_id = d.id AND l.is_active
         ${filter}
        ORDER BY d.updated_at DESC, d.id DESC
        OFFSET $${params.length + 1} LIMIT $${params.length + 2}`,
      [...params, (query.page - 1) * query.pageSize, query.pageSize],
    );
    return {
      items: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        crop: {
          id: Number(r.crop_id),
          code: r.crop_code,
          name: r.crop_name,
          status: r.crop_status,
        },
        classCode: r.class_code,
        status: r.status,
        isFeatured: r.is_featured,
        updatedAt: r.updated_at,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: Number(countRow.total),
    };
  }

  /** B2: mọi trạng thái (Q3). */
  async get(id: number): Promise<AdminDisease> {
    const disease = await this.diseases.findOne({
      where: { id },
      relations: { crop: true },
    });
    if (!disease?.crop) throw diseaseNotFound();
    const manager = this.diseases.manager;
    const [images, active, labelCount] = await Promise.all([
      this.images.find({
        where: { diseaseId: id },
        order: { sortOrder: 'ASC', id: 'ASC' },
      }),
      manager.findOne(ModelLabel, {
        select: { id: true, classCode: true },
        where: { diseaseId: id, isActive: true },
      }),
      manager.count(ModelLabel, { where: { diseaseId: id } }),
    ]);
    return {
      id: disease.id,
      crop: {
        id: disease.crop.id,
        code: disease.crop.code,
        name: disease.crop.name,
        status: disease.crop.status,
      },
      name: disease.name,
      pathogen: disease.pathogen,
      pathogenGroup: disease.pathogenGroup,
      severity: disease.severity,
      classCode: active?.classCode ?? null,
      cropLocked: labelCount > 0,
      summary: disease.summary,
      symptoms: disease.symptoms,
      causes: disease.causes,
      prevention: disease.prevention,
      treatment: disease.treatment,
      recheckDays: disease.recheckDays,
      isFeatured: disease.isFeatured,
      status: disease.status,
      publishedAt: disease.publishedAt,
      images: await Promise.all(
        images.map(async (img) => ({
          id: img.id,
          url: (await this.storage.resolveUrl(img.imageUrl)) ?? img.imageUrl,
          caption: img.caption,
        })),
      ),
      createdAt: disease.createdAt,
      updatedAt: disease.updatedAt,
    };
  }

  /** B3 (US-02, BR-02 → 06, 10). */
  async create(dto: CreateDiseaseDto, files: Buffer[]): Promise<AdminDisease> {
    const layout = parseImageLayout(dto.imageLayout, files.length, null) ?? [];
    await this.requireCrop(dto.cropId);
    const saved = await this.saveAll(files);
    let id: number;
    try {
      id = await this.diseases.manager.transaction(async (manager) => {
        await this.assertNameFree(manager, dto.cropId, dto.name, null);
        const result = await manager.insert(Disease, {
          ...this.contentOf(dto),
          status: dto.status,
          publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
        });
        const diseaseId = Number(result.identifiers[0].id);
        await this.syncImages(manager, diseaseId, layout, saved);
        await assignLabel(
          manager,
          { kind: 'DISEASE', diseaseId, cropId: dto.cropId },
          dto.classCode,
          'classCode',
        );
        return diseaseId;
      });
    } catch (error) {
      await this.deleteAllQuietly(saved.map((f) => f.key));
      throw this.mapUniqueViolation(error);
    }
    return this.get(id);
  }

  /**
   * B4 (US-03; OQ-54, OQ-55). Khoá dòng bệnh, kiểm tra trạng thái, khoá loại cây, trùng tên
   * trong giao dịch; đồng bộ ảnh theo `imageLayout`; luôn đặt lại `updated_at`.
   */
  async update(
    id: number,
    dto: UpdateDiseaseDto,
    files: Buffer[],
  ): Promise<AdminDisease> {
    if (!(await this.diseases.existsBy({ id }))) throw diseaseNotFound();
    const existingIds = (
      await this.images.find({ select: { id: true }, where: { diseaseId: id } })
    ).map((img) => img.id);
    const layout = parseImageLayout(dto.imageLayout, files.length, existingIds);
    await this.requireCrop(dto.cropId);
    const saved = await this.saveAll(files);
    let removedKeys: string[] = [];
    try {
      await this.diseases.manager.transaction(async (manager) => {
        const disease = await manager
          .getRepository(Disease)
          .createQueryBuilder('d')
          .setLock('pessimistic_write')
          .where('d.id = :id', { id })
          .getOne();
        if (!disease) throw diseaseNotFound();

        if (dto.status !== undefined && disease.status !== 'DRAFT') {
          throw statusNotAllowed();
        }
        const status = dto.status ?? disease.status;
        const content = this.contentOf(dto);
        if (status === 'PUBLISHED') this.assertPublishable(content);

        if (dto.cropId !== disease.cropId) {
          const labels = await manager.count(ModelLabel, {
            where: { diseaseId: id },
          });
          if (labels > 0) {
            throw conflict('DISEASE_CROP_LOCKED', M.CROP_LOCKED, 'cropId');
          }
        }
        await this.assertNameFree(manager, dto.cropId, dto.name, id);

        await manager.update(Disease, id, {
          ...content,
          status,
          publishedAt:
            status === 'PUBLISHED' && !disease.publishedAt
              ? new Date()
              : disease.publishedAt,
          updatedAt: new Date(),
        });
        if (layout !== null) {
          removedKeys = await this.syncImages(manager, id, layout, saved);
        }
        await assignLabel(
          manager,
          { kind: 'DISEASE', diseaseId: id, cropId: dto.cropId },
          dto.classCode,
          'classCode',
        );
      });
    } catch (error) {
      await this.deleteAllQuietly(saved.map((f) => f.key));
      throw this.mapUniqueViolation(error);
    }
    await this.deleteAllQuietly(removedKeys);
    return this.get(id);
  }

  /**
   * B5 (C4 3c; BR-06, 08): `PUBLISHED` ↔ `HIDDEN`. Sang `PUBLISHED` phải đủ nội dung. Đã ở
   * trạng thái đích thì không đổi gì.
   */
  async changeStatus(
    id: number,
    status: 'PUBLISHED' | 'HIDDEN',
  ): Promise<AdminDisease> {
    await this.diseases.manager.transaction(async (manager) => {
      const disease = await manager
        .getRepository(Disease)
        .createQueryBuilder('d')
        .setLock('pessimistic_write')
        .where('d.id = :id', { id })
        .getOne();
      if (!disease) throw diseaseNotFound();
      if (disease.status === status) return;
      const from = status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN';
      if (disease.status !== from) throw statusNotAllowed();
      if (status === 'PUBLISHED' && missingPublishFields(disease).length > 0) {
        throw contentRequired();
      }
      await manager.update(Disease, id, {
        status,
        publishedAt: disease.publishedAt ?? new Date(),
        updatedAt: new Date(),
      });
    });
    return this.get(id);
  }

  /**
   * B6 (BR-09, 10; OQ-57): xoá nhãn rồi bệnh (ảnh xoá theo, CASCADE). Nhãn đã có dự đoán thì
   * khoá ngoại RESTRICT chặn, nên không phải đọc bảng của `diagnosis`.
   */
  async remove(id: number): Promise<void> {
    const imageKeys = (
      await this.images.find({
        select: { id: true, imageUrl: true },
        where: { diseaseId: id },
      })
    ).map((img) => img.imageUrl);
    try {
      await this.diseases.manager.transaction(async (manager) => {
        const disease = await manager
          .getRepository(Disease)
          .createQueryBuilder('d')
          .setLock('pessimistic_write')
          .where('d.id = :id', { id })
          .getOne();
        if (!disease) throw diseaseNotFound();
        await manager.delete(ModelLabel, { diseaseId: id });
        await manager.delete(Disease, { id });
      });
    } catch (error) {
      const code = pgError(error)?.code;
      if (code && PG_DELETE_BLOCKED_CODES.includes(code)) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'DISEASE_HAS_DIAGNOSES',
          M.HAS_DIAGNOSES,
        );
      }
      throw error;
    }
    await this.deleteAllQuietly(imageKeys);
  }

  /** B3, B4: loại cây phải tồn tại (kể cả đang ẩn). */
  private async requireCrop(cropId: number): Promise<void> {
    const exists = await this.diseases.manager.existsBy(Crop, { id: cropId });
    if (!exists) throw diseaseCropMissing();
  }

  /** BR-05: tên không trùng trong cùng loại cây, không phân biệt hoa thường (OQ-60). */
  private async assertNameFree(
    manager: EntityManager,
    cropId: number,
    name: string,
    selfId: number | null,
  ): Promise<void> {
    const [row] = await manager.query<{ id: number }[]>(
      `SELECT id FROM diseases
        WHERE crop_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3 LIMIT 1`,
      [cropId, name, selfId ?? 0],
    );
    if (row) throw conflict('DISEASE_NAME_TAKEN', M.DISEASE_NAME_TAKEN, 'name');
  }

  private assertPublishable(content: {
    summary: string | null;
    symptoms: string | null;
    treatment: string | null;
  }): void {
    const missing = missingPublishFields(content);
    if (missing.length > 0) {
      throw fieldErrors(
        missing.map((field) => ({ field, message: M.REQUIRED })),
      );
    }
  }

  private contentOf(dto: CreateDiseaseDto | UpdateDiseaseDto) {
    return {
      cropId: dto.cropId,
      name: dto.name,
      pathogen: dto.pathogen,
      pathogenGroup: dto.pathogenGroup,
      severity: dto.severity,
      summary: dto.summary,
      symptoms: dto.symptoms,
      causes: dto.causes,
      prevention: dto.prevention,
      treatment: dto.treatment,
      recheckDays: dto.recheckDays,
      isFeatured: dto.isFeatured,
    };
  }

  /**
   * B3, B4 (Q5): gỡ ảnh không còn trong layout, cập nhật ảnh giữ lại, thêm ảnh mới;
   * `sort_order` = vị trí trong layout, ảnh đầu là ảnh bìa (ERD-doc 4.4). Trả khoá ảnh bị gỡ.
   */
  private async syncImages(
    manager: EntityManager,
    diseaseId: number,
    layout: LayoutEntry[],
    saved: StoredFile[],
  ): Promise<string[]> {
    const current = await manager.find(DiseaseImage, { where: { diseaseId } });
    const kept = new Set(
      layout.flatMap((e) => (e.kind === 'existing' ? [e.id] : [])),
    );
    const removed = current.filter((img) => !kept.has(img.id));
    if (removed.length > 0) {
      await manager.delete(
        DiseaseImage,
        removed.map((img) => img.id),
      );
    }
    for (const [i, entry] of layout.entries()) {
      if (entry.kind === 'existing') {
        await manager.update(DiseaseImage, entry.id, {
          caption: entry.caption,
          sortOrder: i,
        });
      } else {
        await manager.insert(DiseaseImage, {
          diseaseId,
          imageUrl: saved[entry.index].key,
          caption: entry.caption,
          sortOrder: i,
        });
      }
    }
    return removed.map((img) => img.imageUrl);
  }

  /** Lưu lần lượt; một ảnh sai thì xoá các ảnh đã lưu rồi báo lỗi của ảnh đó. */
  private async saveAll(files: Buffer[]): Promise<StoredFile[]> {
    const saved: StoredFile[] = [];
    try {
      for (const file of files) {
        saved.push(await this.storage.saveImage(file, 'diseases'));
      }
    } catch (error) {
      await this.deleteAllQuietly(saved.map((f) => f.key));
      throw error;
    }
    return saved;
  }

  private mapUniqueViolation(error: unknown): unknown {
    const pg = pgError(error);
    if (
      pg?.code === PG_UNIQUE_VIOLATION &&
      pg.constraint === 'uq_diseases_crop_name'
    ) {
      return conflict('DISEASE_NAME_TAKEN', M.DISEASE_NAME_TAKEN, 'name');
    }
    return error;
  }

  private async deleteAllQuietly(keys: (string | null)[]): Promise<void> {
    for (const key of keys) {
      await this.storage
        .deleteStored(key)
        .catch((e: unknown) =>
          this.logger.warn(`Không xoá được ảnh ${key}: ${String(e)}`),
        );
    }
  }
}

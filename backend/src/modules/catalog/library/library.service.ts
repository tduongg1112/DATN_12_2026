import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type SelectQueryBuilder } from 'typeorm';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { DEFAULT_ERRORS } from '../../../common/exceptions/default-errors.js';
import { escapeLike } from '../../../common/sql/escape-like.js';
import { StorageService } from '../../../common/storage/storage.service.js';
import { Crop } from '../entities/crop.entity.js';
import { DiseaseImage } from '../entities/disease-image.entity.js';
import {
  Disease,
  type PathogenGroup,
  type Severity,
} from '../entities/disease.entity.js';
import { DiseaseTrendsQuery } from './disease-trends.query.js';
import type {
  CropSummary,
  DiseaseCard,
  DiseaseDetail,
  ListDiseasesQuery,
  Page,
} from './dto/library.dto.js';

/** OQ-37: tối đa 4 bệnh liên quan. */
export const RELATED_LIMIT = 4;

/** L3: bệnh không có, chưa công khai, bị ẩn, hoặc loại cây bị ẩn (BR-01). Câu dự phòng OQ-29. */
export function diseaseNotFound(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'DISEASE_NOT_FOUND',
    DEFAULT_ERRORS[HttpStatus.NOT_FOUND].message,
  );
}

/** Một dòng thẻ bệnh lấy bằng `getRawMany` (tên cột theo alias trong `selectCards`). */
export interface CardRow {
  id: number | string;
  name: string;
  severity: Severity;
  summary: string | null;
  cropId: number | string;
  cropCode: string;
  cropName: string;
  trending: boolean;
}

/**
 * Thư viện bệnh (docs/disease_library/api_disease_library.md, L1 → L3). Chỉ đọc.
 * Bệnh hiển thị được: `PUBLISHED` và loại cây `ACTIVE` (BR-01; catalog BR-12).
 */
@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
    @InjectRepository(Disease) private readonly diseases: Repository<Disease>,
    @InjectRepository(DiseaseImage)
    private readonly images: Repository<DiseaseImage>,
    private readonly trends: DiseaseTrendsQuery,
    private readonly storage: StorageService,
  ) {}

  /** L1 (BR-05): loại cây đang hiển thị, theo thứ tự seed (Lúa, Ngô, Cà chua, Ớt, Khoai tây). */
  async listCrops(): Promise<CropSummary[]> {
    const rows = await this.crops.find({
      select: { id: true, code: true, name: true },
      where: { status: 'ACTIVE' },
      order: { id: 'ASC' },
    });
    return rows.map(({ id, code, name }) => ({ id, code, name }));
  }

  /**
   * L2 (BR-03, 05, 08): nổi bật trước, rồi "Đang phổ biến", rồi `published_at` giảm dần.
   * Trang chủ và "Xem tất cả" dùng cùng thứ tự (OQ-37).
   */
  async listDiseases(query: ListDiseasesQuery): Promise<Page<DiseaseCard>> {
    const trending = await this.trends.trendingDiseaseIds();
    const filtered = this.visibleDiseases();
    if (query.cropId !== undefined) {
      filtered.andWhere('d.cropId = :cropId', { cropId: query.cropId });
    }
    if (query.q) {
      filtered.andWhere(`d.name ILIKE :pattern ESCAPE '\\'`, {
        pattern: `%${escapeLike(query.q)}%`,
      });
    }

    const [total, rows] = await Promise.all([
      filtered.clone().getCount(),
      this.selectCards(filtered.clone(), trending)
        .orderBy('d.isFeatured', 'DESC')
        .addOrderBy('trending', 'DESC')
        .addOrderBy('d.publishedAt', 'DESC', 'NULLS LAST')
        .addOrderBy('d.id', 'DESC')
        .offset((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .getRawMany<CardRow>(),
    ]);

    return {
      items: await this.toCards(rows),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /** L3 (BR-06, 07, 08). */
  async getDisease(id: number): Promise<DiseaseDetail> {
    const disease = await this.diseases.findOne({
      where: { id, status: 'PUBLISHED', crop: { status: 'ACTIVE' } },
      relations: { crop: true },
    });
    if (!disease?.crop) throw diseaseNotFound();

    const [images, related] = await Promise.all([
      this.images.find({
        where: { diseaseId: id },
        order: { sortOrder: 'ASC', id: 'ASC' },
      }),
      this.relatedFor({
        cropId: disease.cropId,
        pathogenGroup: disease.pathogenGroup,
        excludeId: disease.id,
      }),
    ]);

    return {
      id: disease.id,
      name: disease.name,
      pathogen: disease.pathogen,
      pathogenGroup: disease.pathogenGroup,
      crop: {
        id: disease.crop.id,
        code: disease.crop.code,
        name: disease.crop.name,
      },
      severity: disease.severity,
      summary: disease.summary,
      symptoms: disease.symptoms,
      causes: disease.causes,
      prevention: disease.prevention,
      treatment: disease.treatment,
      images: await Promise.all(
        images.map(async (img) => ({
          url: (await this.storage.resolveUrl(img.imageUrl)) ?? img.imageUrl,
          caption: img.caption,
        })),
      ),
      related,
    };
  }

  /**
   * BR-07: cùng loại cây hoặc cùng nhóm tác nhân; cùng loại cây xếp trước. Dùng cho L3 và
   * trang xem trước của quản trị (catalog B7, OQ-58), nên nhận tiêu chí thay cho bệnh.
   */
  async relatedFor(criteria: {
    cropId: number;
    pathogenGroup: PathogenGroup;
    excludeId?: number;
  }): Promise<DiseaseCard[]> {
    const trending = await this.trends.trendingDiseaseIds();
    const rows = await this.selectCards(this.visibleDiseases(), trending)
      .andWhere('d.id <> :selfId', { selfId: criteria.excludeId ?? 0 })
      .andWhere('(d.cropId = :sameCropId OR d.pathogenGroup = :sameGroup)', {
        sameCropId: criteria.cropId,
        sameGroup: criteria.pathogenGroup,
      })
      .addSelect('d.cropId = :sameCropId', 'sameCrop')
      .orderBy('sameCrop', 'DESC')
      .addOrderBy('d.publishedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('d.id', 'DESC')
      .limit(RELATED_LIMIT)
      .getRawMany<CardRow>();
    return this.toCards(rows);
  }

  /** Bệnh hiển thị được (BR-01): công khai và loại cây không bị ẩn. */
  private visibleDiseases(): SelectQueryBuilder<Disease> {
    return this.diseases
      .createQueryBuilder('d')
      .innerJoin('d.crop', 'c', 'c.status = :activeCrop', {
        activeCrop: 'ACTIVE',
      })
      .where('d.status = :published', { published: 'PUBLISHED' });
  }

  /** Cột của thẻ bệnh, kèm cờ `trending` để vừa trả về vừa sắp xếp được. */
  private selectCards(
    qb: SelectQueryBuilder<Disease>,
    trending: number[],
  ): SelectQueryBuilder<Disease> {
    return qb
      .select('d.id', 'id')
      .addSelect('d.name', 'name')
      .addSelect('d.severity', 'severity')
      .addSelect('d.summary', 'summary')
      .addSelect('c.id', 'cropId')
      .addSelect('c.code', 'cropCode')
      .addSelect('c.name', 'cropName')
      .addSelect('d.id = ANY(:trending)', 'trending')
      .setParameter('trending', trending);
  }

  private async toCards(rows: CardRow[]): Promise<DiseaseCard[]> {
    const covers = await this.coverUrls(rows.map((r) => Number(r.id)));
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      crop: { id: Number(r.cropId), code: r.cropCode, name: r.cropName },
      severity: r.severity,
      summary: r.summary,
      coverImageUrl: covers.get(Number(r.id)) ?? null,
      trending: r.trending === true,
    }));
  }

  /** BR-08: ảnh bìa là ảnh `sort_order` nhỏ nhất (cùng thứ tự thì `id` nhỏ hơn). */
  private async coverUrls(ids: number[]): Promise<Map<number, string | null>> {
    const covers = new Map<number, string | null>();
    if (ids.length === 0) return covers;
    const images = await this.images.find({
      select: { id: true, diseaseId: true, imageUrl: true, sortOrder: true },
      where: { diseaseId: In(ids) },
      order: { diseaseId: 'ASC', sortOrder: 'ASC', id: 'ASC' },
    });
    for (const img of images) {
      const diseaseId = Number(img.diseaseId);
      if (!covers.has(diseaseId)) {
        covers.set(diseaseId, await this.storage.resolveUrl(img.imageUrl));
      }
    }
    return covers;
  }
}

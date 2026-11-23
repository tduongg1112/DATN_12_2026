import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StorageService } from '../../../common/storage/storage.service.js';
import type { Severity } from '../../catalog/entities/disease.entity.js';
import { escapeLike } from '../../catalog/library/library.service.js';
import { diagnosisNotFound } from '../diagnosis-errors.js';
import { DiagnosisPrediction } from '../entities/diagnosis-prediction.entity.js';
import { Diagnosis, type ResultType } from '../entities/diagnosis.entity.js';
import type {
  HistoryItem,
  HistoryPage,
  ListHistoryQuery,
} from './dto/history.dto.js';

/** Một dòng danh sách lấy bằng `getRawMany` (tên cột theo alias trong `list`). */
interface HistoryRow {
  id: number | string;
  resultType: ResultType;
  createdAt: Date;
  processedImageUrl: string;
  cropId: number | string;
  cropCode: string;
  cropName: string;
  plantId: number | string | null;
  plantName: string | null;
  probability: number | string;
  diseaseId: number | string | null;
  diseaseName: string | null;
  diseaseSeverity: Severity | null;
}

/**
 * Lịch sử tra cứu (docs/history/api_history.md H1 → H3; database_design_history.md).
 * Mọi thao tác chỉ trên lượt của chính người gọi (BR-01, BR-G03).
 */
@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(Diagnosis)
    private readonly diagnoses: Repository<Diagnosis>,
    private readonly storage: StorageService,
  ) {}

  /** H1 (Q1, Q2): mới nhất trước; dự đoán hạng 1 cho tên bệnh và độ tin cậy (BR-05). */
  async list(userId: number, query: ListHistoryQuery): Promise<HistoryPage> {
    const filtered = this.diagnoses
      .createQueryBuilder('d')
      .innerJoin('d.crop', 'c')
      .leftJoin('d.plant', 'pl')
      .innerJoin(
        DiagnosisPrediction,
        'p',
        'p.diagnosisId = d.id AND p.rankNo = 1',
      )
      .innerJoin('p.label', 'ml')
      .leftJoin('ml.disease', 'ds')
      .where('d.userId = :userId', { userId })
      .andWhere('d.status = :completed', { completed: 'COMPLETED' })
      .andWhere('d.deletedAt IS NULL');

    if (query.cropId !== undefined) {
      filtered.andWhere('d.cropId = :cropId', { cropId: query.cropId });
    }
    if (query.resultType) {
      filtered.andWhere('d.resultType = :resultType', {
        resultType: query.resultType,
      });
    }
    if (query.from) {
      filtered.andWhere('d.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      filtered.andWhere('d.createdAt < :to', { to: new Date(query.to) });
    }
    if (query.q) {
      // OQ-43: chỉ lượt DISEASE; tên bệnh của lượt UNCERTAIN chưa phải kết luận.
      filtered.andWhere(
        `d.resultType = :disease AND ds.name ILIKE :pattern ESCAPE '\\'`,
        { disease: 'DISEASE', pattern: `%${escapeLike(query.q)}%` },
      );
    }

    const [total, rows] = await Promise.all([
      filtered.clone().getCount(),
      filtered
        .clone()
        .select('d.id', 'id')
        .addSelect('d.resultType', 'resultType')
        .addSelect('d.createdAt', 'createdAt')
        .addSelect('d.processedImageUrl', 'processedImageUrl')
        .addSelect('c.id', 'cropId')
        .addSelect('c.code', 'cropCode')
        .addSelect('c.name', 'cropName')
        .addSelect('pl.id', 'plantId')
        .addSelect('pl.name', 'plantName')
        .addSelect('p.probability', 'probability')
        .addSelect('ds.id', 'diseaseId')
        .addSelect('ds.name', 'diseaseName')
        .addSelect('ds.severity', 'diseaseSeverity')
        .orderBy('d.createdAt', 'DESC')
        .addOrderBy('d.id', 'DESC')
        .offset((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .getRawMany<HistoryRow>(),
    ]);

    return {
      items: await Promise.all(rows.map((r) => this.toItem(r))),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /**
   * H2 (Q4, BR-08, BR-09): xoá mềm trong một giao dịch, tất cả hoặc không (TD-27). Không
   * đổi tình trạng cây (OQ-24).
   */
  async remove(userId: number, ids: number[]): Promise<void> {
    const unique = [...new Set(ids)];
    await this.diagnoses.manager.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(Diagnosis)
        .set({ deletedAt: () => 'now()' })
        .where(
          'id = ANY(:ids) AND user_id = :userId AND status = :completed AND deleted_at IS NULL',
          { ids: unique, userId, completed: 'COMPLETED' },
        )
        .execute();
      // Có id không hợp lệ: ném lỗi để huỷ giao dịch, không mục nào bị xoá.
      if (result.affected !== unique.length) throw diagnosisNotFound();
    });
  }

  /**
   * H3 (Q5, BR-08, BR-09): khôi phục trong một giao dịch, tất cả hoặc không. Id đã được
   * khôi phục rồi thì bỏ qua (bấm "Hoàn tác" hai lần không lỗi).
   */
  async restore(userId: number, ids: number[]): Promise<void> {
    const unique = [...new Set(ids)];
    await this.diagnoses.manager.transaction(async (manager) => {
      const owned = await manager.getRepository(Diagnosis).count({
        where: { id: In(unique), userId, status: 'COMPLETED' },
        withDeleted: true,
      });
      if (owned !== unique.length) throw diagnosisNotFound();
      await manager
        .createQueryBuilder()
        .update(Diagnosis)
        .set({ deletedAt: null })
        .where(
          'id = ANY(:ids) AND user_id = :userId AND deleted_at IS NOT NULL',
          { ids: unique, userId },
        )
        .execute();
    });
  }

  private async toItem(r: HistoryRow): Promise<HistoryItem> {
    return {
      id: Number(r.id),
      resultType: r.resultType,
      createdAt: r.createdAt,
      thumbnailUrl: await this.storage.resolveUrl(r.processedImageUrl),
      crop: { id: Number(r.cropId), code: r.cropCode, name: r.cropName },
      plant:
        r.plantId === null
          ? null
          : { id: Number(r.plantId), name: r.plantName ?? '' },
      probability: Number(r.probability),
      disease:
        r.diseaseId === null
          ? null
          : {
              id: Number(r.diseaseId),
              name: r.diseaseName ?? '',
              severity: r.diseaseSeverity as Severity,
            },
    };
  }
}

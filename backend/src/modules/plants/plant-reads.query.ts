import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { Severity } from '../catalog/entities/disease.entity.js';
import type { HealthStatus } from './entities/plant.entity.js';
import type { DiagnosisResultType } from './health-rules.js';

/** Một dòng danh sách cây (Q1). */
export interface PlantListRow {
  id: number;
  name: string;
  avatar_url: string | null;
  health_status: HealthStatus;
  crop_id: number;
  crop_code: string;
  crop_name: string;
  last_at: Date | null;
}

/** Một lượt chẩn đoán của cây (Q2), kèm thông tin bệnh cho "Bệnh đang mắc" (Q3). */
export interface PlantDiagnosisRow {
  id: number;
  created_at: Date;
  result_type: DiagnosisResultType;
  processed_image_url: string;
  probability: number;
  disease_id: number | null;
  disease_name: string | null;
  disease_severity: Severity | null;
  disease_treatment: string | null;
  disease_available: boolean | null;
}

/** Lượt `COMPLETED`, chưa xoá mềm (BR-06: "lượt còn hiệu lực"). */
const ACTIVE_DIAGNOSIS = `d.status = 'COMPLETED' AND d.deleted_at IS NULL`;

/**
 * TD-29 (chốt 23/11, phương án A): ngoại lệ thứ ba của ranh giới mô-đun (be-coding-rules
 * mục 2), như TD-24. Truy vấn CHỈ ĐỌC `diagnoses`, `diagnosis_predictions`, `model_labels`,
 * `diseases` của mô-đun `diagnosis` qua `DataSource`, vì `diagnosis` đã import `plants`
 * (TD-25) nên `plants` không import ngược được. Không ghi bảng nào.
 */
@Injectable()
export class PlantReadsQuery {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * P1 (Q1, OQ-45): "Đang có bệnh" → "Đang điều trị" → còn lại; trong nhóm theo ngày chẩn
   * đoán gần nhất (chưa chẩn đoán xếp sau) rồi ngày tạo, mới trước.
   */
  async listPage(
    userId: number,
    offset: number,
    limit: number,
  ): Promise<PlantListRow[]> {
    const rows = await this.dataSource.query<PlantListRow[]>(
      `SELECT p.id, p.name, p.avatar_url, p.health_status,
              c.id AS crop_id, c.code AS crop_code, c.name AS crop_name, d.last_at
         FROM plants p
         JOIN crops c ON c.id = p.crop_id
         LEFT JOIN (
           SELECT d.plant_id, MAX(d.created_at) AS last_at
             FROM diagnoses d
            WHERE d.user_id = $1 AND d.plant_id IS NOT NULL AND ${ACTIVE_DIAGNOSIS}
            GROUP BY d.plant_id
         ) d ON d.plant_id = p.id
        WHERE p.user_id = $1
        ORDER BY CASE p.health_status WHEN 'DISEASED' THEN 0 WHEN 'TREATING' THEN 1 ELSE 2 END,
                 d.last_at DESC NULLS LAST, p.created_at DESC, p.id DESC
        OFFSET $2 LIMIT $3`,
      [userId, offset, limit],
    );
    return rows.map((r) => ({
      ...r,
      id: Number(r.id),
      crop_id: Number(r.crop_id),
    }));
  }

  /** P3 (Q2, Q3): lượt còn hiệu lực của cây, mới nhất trước, kèm bệnh hạng 1. */
  async diagnosesOf(plantId: number): Promise<PlantDiagnosisRow[]> {
    const rows = await this.dataSource.query<PlantDiagnosisRow[]>(
      `SELECT d.id, d.created_at, d.result_type, d.processed_image_url,
              p.probability::float8 AS probability,
              ds.id AS disease_id, ds.name AS disease_name, ds.severity AS disease_severity,
              ds.treatment AS disease_treatment,
              (ds.status = 'PUBLISHED' AND dc.status = 'ACTIVE') AS disease_available
         FROM diagnoses d
         JOIN diagnosis_predictions p ON p.diagnosis_id = d.id AND p.rank_no = 1
         JOIN model_labels ml ON ml.id = p.label_id
         LEFT JOIN diseases ds ON ds.id = ml.disease_id
         LEFT JOIN crops dc ON dc.id = ds.crop_id
        WHERE d.plant_id = $1 AND ${ACTIVE_DIAGNOSIS}
        ORDER BY d.created_at DESC, d.id DESC`,
      [plantId],
    );
    return rows.map((r) => ({
      ...r,
      id: Number(r.id),
      disease_id: r.disease_id === null ? null : Number(r.disease_id),
    }));
  }

  /**
   * OQ-48 (Q7): lượt `diagnosisId` có mới hơn mọi lượt khác còn hiệu lực của cây và mới hơn
   * lần "Cập nhật tình trạng" gần nhất không. Chạy trong giao dịch của bên gọi.
   */
  async isLatestForPlant(
    manager: EntityManager,
    plantId: number,
    diagnosisId: number,
    createdAt: Date,
  ): Promise<boolean> {
    const [row] = await manager.query<{ newer: boolean }[]>(
      `SELECT EXISTS (
                SELECT 1 FROM diagnoses d
                 WHERE d.plant_id = $1 AND d.id <> $2 AND ${ACTIVE_DIAGNOSIS}
                   AND d.created_at > $3
              )
           OR EXISTS (
                SELECT 1 FROM plant_logs l
                 WHERE l.plant_id = $1 AND l.log_type = 'STATUS_CHANGE' AND l.created_at > $3
              ) AS newer`,
      [plantId, diagnosisId, createdAt],
    );
    return !row.newer;
  }
}

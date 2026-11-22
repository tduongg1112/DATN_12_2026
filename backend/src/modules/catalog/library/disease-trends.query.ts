import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../../../config/env.validation.js';

/**
 * "Đang phổ biến" (disease_library BR-04, OQ-28, OQ-37): top N bệnh có nhiều lượt
 * chẩn đoán `DISEASE` nhất trong số ngày gần nhất, tính trên mọi người dùng.
 *
 * TD-24 (chốt 22/11): ngoại lệ thứ hai của ranh giới mô-đun (be-coding-rules mục 2).
 * Truy vấn CHỈ ĐỌC `diagnoses`, `diagnosis_predictions` của mô-đun `diagnosis` qua
 * `DataSource`, vì `diagnosis` đã import `catalog` nên không import ngược được.
 * Không ghi, không trả dữ liệu theo người dùng.
 */
@Injectable()
export class DiseaseTrendsQuery {
  private readonly limit: number;
  private readonly days: number;
  private readonly threshold: number | undefined;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.limit = config.get('LIBRARY_TRENDING_LIMIT', { infer: true });
    this.days = config.get('LIBRARY_TRENDING_DAYS', { infer: true });
    this.threshold = config.get('AI_CONFIDENCE_THRESHOLD', { infer: true });
  }

  /**
   * Id các bệnh "Đang phổ biến", nhiều lượt nhất trước.
   * - Chỉ lượt `COMPLETED` + `DISEASE`, dự đoán hạng 1 có xác suất ≥ ngưỡng. Ngưỡng để
   *   trống thì chỉ xét `result_type`, vì dạng kết quả đã tính theo ngưỡng lúc chẩn đoán.
   * - Gồm cả lượt đã xoá mềm: lượt đã xoá vẫn tính trong thống kê (history BR-09).
   * - Chỉ bệnh đang hiển thị được (công khai, loại cây không bị ẩn), có ≥ 1 lượt.
   */
  async trendingDiseaseIds(now: Date = new Date()): Promise<number[]> {
    const params: unknown[] = [now, this.days, this.limit];
    let thresholdFilter = '';
    if (this.threshold !== undefined) {
      params.push(this.threshold);
      thresholdFilter = 'AND p.probability >= $4';
    }
    const rows = await this.dataSource.query<{ disease_id: number | string }[]>(
      `SELECT ml.disease_id
         FROM diagnoses dg
         JOIN diagnosis_predictions p ON p.diagnosis_id = dg.id AND p.rank_no = 1
         JOIN model_labels ml ON ml.id = p.label_id
         JOIN diseases ds ON ds.id = ml.disease_id AND ds.status = 'PUBLISHED'
         JOIN crops c ON c.id = ds.crop_id AND c.status = 'ACTIVE'
        WHERE dg.status = 'COMPLETED'
          AND dg.result_type = 'DISEASE'
          AND dg.created_at >= $1::timestamptz - make_interval(days => $2::int)
          AND dg.created_at <= $1::timestamptz
          ${thresholdFilter}
        GROUP BY ml.disease_id
        ORDER BY COUNT(*) DESC, ml.disease_id
        LIMIT $3`,
      params,
    );
    return rows.map((r) => Number(r.disease_id));
  }
}

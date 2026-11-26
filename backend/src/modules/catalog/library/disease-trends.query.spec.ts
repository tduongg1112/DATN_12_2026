import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../../../config/env.validation.js';
import { DiseaseTrendsQuery } from './disease-trends.query.js';

function setup(env: Partial<EnvironmentVariables>, rows: unknown[] = []) {
  const query = vi.fn().mockResolvedValue(rows);
  const config = {
    get: (key: keyof EnvironmentVariables) => env[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
  const trends = new DiseaseTrendsQuery(
    { query } as unknown as DataSource,
    config,
  );
  return { trends, query };
}

describe('DiseaseTrendsQuery (BR-04, OQ-28, OQ-37, TD-24)', () => {
  const now = new Date('2026-11-22T08:00:00Z');

  it('truyền số ngày, N và ngưỡng từ cấu hình; trả id dạng số theo thứ tự truy vấn', async () => {
    const { trends, query } = setup(
      {
        LIBRARY_TRENDING_DAYS: 30,
        LIBRARY_TRENDING_LIMIT: 3,
        AI_CONFIDENCE_THRESHOLD: 0.6,
      },
      [{ disease_id: '7' }, { disease_id: 2 }],
    );
    await expect(trends.trendingDiseaseIds(now)).resolves.toEqual([7, 2]);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([now, 30, 3, 0.6]);
    expect(sql).toContain('p.probability >= $4');
    expect(sql).toContain("dg.result_type = 'DISEASE'");
    expect(sql).toContain('p.rank_no = 1');
    expect(sql).toContain('LIMIT $3');
    // Lượt đã xoá mềm vẫn được đếm (history BR-09).
    expect(sql).not.toContain('deleted_at');
  });
});

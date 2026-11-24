import type { EntityManager, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { StorageService } from '../../common/storage/storage.service.js';
import type { CropService } from '../catalog/crop.service.js';
import type { PlantLog } from './entities/plant-log.entity.js';
import type { HealthStatus, Plant } from './entities/plant.entity.js';
import type { Reminder } from './entities/reminder.entity.js';
import type { PlantReadsQuery } from './plant-reads.query.js';
import { PlantsService } from './plants.service.js';

function setup(o: { plant?: Partial<Plant> | null; latest?: boolean }) {
  const plant =
    o.plant === null
      ? null
      : { id: 4, name: 'Cây A', healthStatus: 'DISEASED', ...o.plant };
  const repo = { findOne: vi.fn().mockResolvedValue(plant) };
  const manager = {
    getRepository: () => repo,
    update: vi.fn().mockResolvedValue({}),
    insert: vi.fn().mockResolvedValue({}),
  };
  const reads = {
    isLatestForPlant: vi.fn().mockResolvedValue(o.latest ?? true),
  };
  const service = new PlantsService(
    {
      manager: {
        transaction: async (fn: (m: typeof manager) => unknown) => fn(manager),
      },
    } as unknown as Repository<Plant>,
    {} as Repository<PlantLog>,
    {} as Repository<Reminder>,
    reads as unknown as PlantReadsQuery,
    {} as CropService,
    {} as StorageService,
  );
  return { service, manager, reads, repo };
}

const diagnosis = (resultType: 'DISEASE' | 'HEALTHY' | 'UNCERTAIN') => ({
  id: 15,
  userId: 7,
  createdAt: new Date('2026-11-23T09:00:00Z'),
  resultType,
});

describe('PlantsService.applyDiagnosis (diagnosis BR-25, Bảng 4.8, OQ-48)', () => {
  it('khoá cây của chính người gọi trong giao dịch của bên gọi', async () => {
    const s = setup({});
    await s.service.applyDiagnosis(
      s.manager as unknown as EntityManager,
      4,
      diagnosis('DISEASE'),
    );
    expect(s.repo.findOne).toHaveBeenCalledWith({
      where: { id: 4, userId: 7 },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it.each([
    ['NOT_DIAGNOSED', 'DISEASE', 'DISEASED', false],
    ['HEALTHY', 'DISEASE', 'DISEASED', false],
    ['DISEASED', 'HEALTHY', 'HEALTHY', true],
    ['TREATING', 'HEALTHY', 'HEALTHY', true],
    ['RECOVERED', 'HEALTHY', 'HEALTHY', false],
    ['DISEASED', 'UNCERTAIN', 'DISEASED', false],
  ] as const)(
    'cây %s + kết quả %s → %s, gợi ý "Đã khỏi": %s',
    async (before, result, after, suggest) => {
      const s = setup({ plant: { healthStatus: before as HealthStatus } });
      const link = await s.service.applyDiagnosis(
        s.manager as unknown as EntityManager,
        4,
        diagnosis(result),
      );
      expect(link).toEqual({
        plant: { id: 4, name: 'Cây A', healthStatus: after },
        suggestRecovered: suggest,
        suggestions: [],
      });
      if (before === after) expect(s.manager.update).not.toHaveBeenCalled();
      else expect(s.manager.update).toHaveBeenCalled();
    },
  );

  it('lượt không phải mới nhất của cây: không đổi tình trạng, không gợi ý', async () => {
    const s = setup({ plant: { healthStatus: 'DISEASED' }, latest: false });
    const link = await s.service.applyDiagnosis(
      s.manager as unknown as EntityManager,
      4,
      diagnosis('HEALTHY'),
    );
    expect(link).toMatchObject({
      plant: { healthStatus: 'DISEASED' },
      suggestRecovered: false,
    });
    expect(s.manager.update).not.toHaveBeenCalled();
  });

  it('UNCERTAIN không cần kiểm tra lượt mới nhất', async () => {
    const s = setup({});
    await s.service.applyDiagnosis(
      s.manager as unknown as EntityManager,
      4,
      diagnosis('UNCERTAIN'),
    );
    expect(s.reads.isLatestForPlant).not.toHaveBeenCalled();
  });

  it('cây không còn (đã xoá hoặc của người khác): trả null', async () => {
    const s = setup({ plant: null });
    await expect(
      s.service.applyDiagnosis(
        s.manager as unknown as EntityManager,
        4,
        diagnosis('DISEASE'),
      ),
    ).resolves.toBeNull();
  });
});

describe('PlantsService.changeStatus (BR-08, BR-16, OQ-47)', () => {
  it('chuyển không được phép: 400 PLANT_STATUS_NOT_ALLOWED, không ghi gì', async () => {
    const s = setup({ plant: { healthStatus: 'NOT_DIAGNOSED' } });
    const e = await s.service
      .changeStatus(7, 4, 'TREATING')
      .catch((err: unknown) => err);
    expect(e).toBeInstanceOf(AppException);
    expect((e as AppException).code).toBe('PLANT_STATUS_NOT_ALLOWED');
    expect(s.manager.update).not.toHaveBeenCalled();
    expect(s.manager.insert).not.toHaveBeenCalled();
  });

  it('cây không có: 404 PLANT_NOT_FOUND', async () => {
    const s = setup({ plant: null });
    const e = await s.service
      .changeStatus(7, 4, 'RECOVERED')
      .catch((err: unknown) => err);
    expect((e as AppException).code).toBe('PLANT_NOT_FOUND');
  });
});

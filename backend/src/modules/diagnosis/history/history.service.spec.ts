import type { Repository } from 'typeorm';
import { AppException } from '../../../common/exceptions/app.exception.js';
import type { StorageService } from '../../../common/storage/storage.service.js';
import type { Diagnosis } from '../entities/diagnosis.entity.js';
import { HistoryService } from './history.service.js';

function setup(o: { affected?: number; owned?: number } = {}) {
  const update = {
    set: vi.fn(() => update),
    where: vi.fn(() => update),
    execute: vi.fn().mockResolvedValue({ affected: o.affected ?? 0 }),
  };
  const count = vi.fn().mockResolvedValue(o.owned ?? 0);
  const manager = {
    createQueryBuilder: () => ({ update: () => update }),
    getRepository: () => ({ count }),
  };
  const transaction = vi.fn(async (fn: (m: typeof manager) => unknown) =>
    fn(manager),
  );
  const service = new HistoryService(
    { manager: { transaction } } as unknown as Repository<Diagnosis>,
    {} as StorageService,
  );
  return { service, update, count, transaction };
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  const e = await p.catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AppException);
  return (e as AppException).code;
}

describe('HistoryService.remove (H2, BR-08, BR-09, TD-27)', () => {
  it('gộp id trùng, xoá mềm trong một giao dịch, chỉ lượt COMPLETED chưa xoá của chính mình', async () => {
    const s = setup({ affected: 2 });
    await s.service.remove(7, [5, 9, 5]);
    expect(s.transaction).toHaveBeenCalledTimes(1);
    expect(s.update.set).toHaveBeenCalledWith({
      deletedAt: expect.any(Function),
    });
    const [sql, params] = s.update.where.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).toContain('user_id = :userId');
    expect(params).toEqual({ ids: [5, 9], userId: 7, completed: 'COMPLETED' });
  });

  it('số dòng đổi khác số id: 404 DIAGNOSIS_NOT_FOUND (giao dịch bị huỷ)', async () => {
    const s = setup({ affected: 1 });
    expect(await codeOf(s.service.remove(7, [5, 9]))).toBe(
      'DIAGNOSIS_NOT_FOUND',
    );
  });
});

describe('HistoryService.restore (H3, BR-08, BR-09, TD-27)', () => {
  it('mọi id là lượt COMPLETED của mình (kể cả đã xoá): khôi phục lượt đang bị xoá', async () => {
    const s = setup({ owned: 2 });
    await s.service.restore(7, [5, 9, 9]);
    expect(s.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: 7, status: 'COMPLETED' }),
      withDeleted: true,
    });
    expect(s.update.set).toHaveBeenCalledWith({ deletedAt: null });
    const [sql] = s.update.where.mock.calls[0] as unknown as [string];
    expect(sql).toContain('deleted_at IS NOT NULL');
  });

  it('có id không phải của mình hoặc chưa COMPLETED: 404, không khôi phục gì', async () => {
    const s = setup({ owned: 1 });
    expect(await codeOf(s.service.restore(7, [5, 9]))).toBe(
      'DIAGNOSIS_NOT_FOUND',
    );
    expect(s.update.execute).not.toHaveBeenCalled();
  });
});

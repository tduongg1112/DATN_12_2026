import type { Repository } from 'typeorm';
import type { UsersService } from '../accounts/users.service.js';
import type { Notification } from './entities/notification.entity.js';
import { NotificationsService } from './notifications.service.js';

function setup(adminIds: number[], alreadySent = false) {
  const tx = {
    query: vi.fn().mockResolvedValue([]),
    existsBy: vi.fn().mockResolvedValue(alreadySent),
    insert: vi.fn().mockResolvedValue({}),
  };
  const manager = {
    query: tx.query,
    getRepository: () => ({ existsBy: tx.existsBy, insert: tx.insert }),
  };
  const repo = {
    manager: {
      transaction: vi.fn(async (fn: (m: typeof manager) => unknown) =>
        fn(manager),
      ),
    },
  };
  const users = { findAdminIds: vi.fn().mockResolvedValue(adminIds) };
  const service = new NotificationsService(
    repo as unknown as Repository<Notification>,
    users as unknown as UsersService,
  );
  return { service, tx, repo };
}

describe('NotificationsService.notifyAdminsOnce (diagnosis BR-11, OQ-26, TD-25)', () => {
  it('tạo một thông báo cho mỗi ADMIN, reminder_id để trống', async () => {
    const { service, tx } = setup([1, 7]);
    await expect(service.notifyAdminsOnce('Tiêu đề', 'Nội dung')).resolves.toBe(
      2,
    );
    expect(tx.insert).toHaveBeenCalledWith([
      { userId: 1, title: 'Tiêu đề', content: 'Nội dung' },
      { userId: 7, title: 'Tiêu đề', content: 'Nội dung' },
    ]);
  });

  it('khoá theo nội dung trước khi kiểm tra, để hai lượt cùng lúc không tạo trùng', async () => {
    const { service, tx } = setup([1]);
    await service.notifyAdminsOnce('T', 'Nội dung');
    expect(tx.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['notifications:Nội dung'],
    );
    expect(tx.query.mock.invocationCallOrder[0]).toBeLessThan(
      tx.existsBy.mock.invocationCallOrder[0],
    );
  });

  it('ADMIN đã nhận cùng nội dung thì không tạo nữa', async () => {
    const { service, tx } = setup([1, 7], true);
    await expect(service.notifyAdminsOnce('T', 'Nội dung')).resolves.toBe(0);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('chưa có ADMIN nào: không mở giao dịch, trả 0', async () => {
    const { service, repo } = setup([]);
    await expect(service.notifyAdminsOnce('T', 'N')).resolves.toBe(0);
    expect(repo.manager.transaction).not.toHaveBeenCalled();
  });
});

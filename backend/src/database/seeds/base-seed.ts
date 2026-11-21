import type { EntityManager } from 'typeorm';
import { User } from '../../modules/accounts/entities/user.entity.js';
import { hashPassword } from '../../modules/accounts/password.js';
import { Crop } from '../../modules/catalog/entities/crop.entity.js';

/** 5 loại cây trong phạm vi (ERD 4.2, 7.2). Chu kỳ tưới, bón để NULL: nhóm điền sau. */
export const BASE_CROPS = [
  { code: 'RICE', name: 'Lúa' },
  { code: 'CORN', name: 'Ngô' },
  { code: 'TOMATO', name: 'Cà chua' },
  { code: 'CHILI', name: 'Ớt' },
  { code: 'POTATO', name: 'Khoai tây' },
] as const;

export interface BaseSeedResult {
  adminCreated: boolean;
  cropsCreated: number;
}

/**
 * Seed bắt buộc: 1 ADMIN (BR-G02) và 5 loại cây. Chạy lại nhiều lần không tạo trùng;
 * ADMIN đã tồn tại thì giữ nguyên, không ghi đè mật khẩu.
 */
export async function runBaseSeed(
  manager: EntityManager,
  admin: { email: string; password: string },
): Promise<BaseSeedResult> {
  const users = manager.getRepository(User);
  const email = admin.email.trim().toLowerCase();
  let adminCreated = false;
  if (!(await users.existsBy({ email }))) {
    await users.insert({
      fullName: 'Quản trị viên',
      email,
      passwordHash: await hashPassword(admin.password),
      role: 'ADMIN',
    });
    adminCreated = true;
  }

  const crops = manager.getRepository(Crop);
  let cropsCreated = 0;
  for (const crop of BASE_CROPS) {
    if (!(await crops.existsBy({ code: crop.code }))) {
      await crops.insert({ code: crop.code, name: crop.name });
      cropsCreated++;
    }
  }
  return { adminCreated, cropsCreated };
}

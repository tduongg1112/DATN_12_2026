import type { EntityManager } from 'typeorm';
import { Crop } from '../entities/crop.entity.js';
import { Disease } from '../entities/disease.entity.js';
import { ModelLabel } from '../entities/model-label.entity.js';
import { CATALOG_MESSAGES as M, conflict } from './catalog-messages.js';

/** Đích của một mã lớp: bệnh (nhãn `DISEASE`) hoặc lớp khoẻ mạnh của loại cây (`HEALTHY`). */
export type LabelTarget =
  | { kind: 'DISEASE'; diseaseId: number; cropId: number }
  | { kind: 'HEALTHY'; cropId: number };

/**
 * Gán mã lớp `classCode` cho đích, hoặc bỏ gán khi `null` (api_catalog.md "Gán mã lớp mô
 * hình"; OQ-55, chốt 25/11). Chạy trong giao dịch của bên gọi (BR-10).
 *
 * - Mã đang gán (`is_active`) cho chỗ khác: 409 `LABEL_ASSIGNED` (C4 6.2).
 * - Mã đã tắt của loại cây khác: 409 `LABEL_OTHER_CROP`.
 * - Mã cũ của đích bị thay hoặc bỏ: chỉ tắt (`is_active = false`), giữ `disease_id` để lịch
 *   sử chẩn đoán vẫn đọc được (BR-19). Tắt trước rồi mới bật mã mới, để không vướng hai chỉ
 *   mục duy nhất `ux_model_labels_*`.
 */
export async function assignLabel(
  manager: EntityManager,
  target: LabelTarget,
  classCode: string | null,
  field: string,
): Promise<void> {
  const labels = manager.getRepository(ModelLabel);
  const current = await labels
    .createQueryBuilder('l')
    .setLock('pessimistic_write')
    .where('l.isActive = true')
    .andWhere(
      target.kind === 'DISEASE'
        ? 'l.diseaseId = :diseaseId'
        : `l.cropId = :cropId AND l.labelType = 'HEALTHY'`,
      target.kind === 'DISEASE'
        ? { diseaseId: target.diseaseId }
        : { cropId: target.cropId },
    )
    .getOne();

  if (classCode === (current?.classCode ?? null)) return;

  let existing: ModelLabel | null = null;
  if (classCode !== null) {
    existing = await labels
      .createQueryBuilder('l')
      .setLock('pessimistic_write')
      .where('l.classCode = :classCode', { classCode })
      .getOne();
    if (existing?.isActive) {
      if (existing.labelType === 'DISEASE') {
        const disease = await manager.findOneByOrFail(Disease, {
          id: existing.diseaseId!,
        });
        throw conflict(
          'LABEL_ASSIGNED',
          M.LABEL_ASSIGNED_TO_DISEASE(disease.name),
          field,
        );
      }
      const crop = await manager.findOneByOrFail(Crop, {
        id: existing.cropId,
      });
      throw conflict(
        'LABEL_ASSIGNED',
        M.LABEL_ASSIGNED_TO_CROP(crop.name),
        field,
      );
    }
    if (existing && existing.cropId !== target.cropId) {
      const crop = await manager.findOneByOrFail(Crop, {
        id: existing.cropId,
      });
      throw conflict('LABEL_OTHER_CROP', M.LABEL_OTHER_CROP(crop.name), field);
    }
  }

  if (current) await labels.update(current.id, { isActive: false });
  if (classCode === null) return;

  const diseaseId = target.kind === 'DISEASE' ? target.diseaseId : null;
  if (existing) {
    await labels.update(existing.id, {
      labelType: target.kind,
      diseaseId,
      isActive: true,
    });
  } else {
    await labels.insert({
      classCode,
      labelType: target.kind,
      cropId: target.cropId,
      diseaseId,
      isActive: true,
    });
  }
}

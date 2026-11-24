import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { StorageService } from '../../../common/storage/storage.service.js';
import type { CreatePlantDto, PlantLink } from '../../plants/dto/plant.dto.js';
import { healthFromResult } from '../../plants/health-rules.js';
import {
  diagnosisAlreadyLinked,
  plantNotFound,
} from '../../plants/plant-messages.js';
import { PlantsService } from '../../plants/plants.service.js';
import { diagnosisNotFound } from '../diagnosis-errors.js';
import { Diagnosis } from '../entities/diagnosis.entity.js';

/**
 * "Lưu vào cây trồng của tôi" (docs/my_plants/api_my_plants.md A1, A2; diagnosis BR-22 →
 * BR-27; history BR-06). Ở mô-đun `diagnosis` vì ghi `diagnoses.plant_id`; tình trạng cây
 * đổi qua `PlantsService` trong cùng giao dịch (TD-25).
 */
@Injectable()
export class PlantLinkService {
  private readonly logger = new Logger(PlantLinkService.name);

  constructor(
    @InjectRepository(Diagnosis)
    private readonly diagnoses: Repository<Diagnosis>,
    private readonly plants: PlantsService,
    private readonly storage: StorageService,
  ) {}

  /** A1: gắn lượt chưa gắn cây vào cây đã có (BR-22, 23, 25). */
  async attach(
    userId: number,
    diagnosisId: number,
    plantId: number,
  ): Promise<PlantLink> {
    return this.diagnoses.manager.transaction(async (manager) => {
      const diagnosis = await this.lockUnlinked(manager, userId, diagnosisId);
      const link = await this.plants.applyDiagnosis(manager, plantId, {
        id: diagnosis.id,
        userId,
        createdAt: diagnosis.createdAt,
        resultType: diagnosis.resultType!,
      });
      if (!link) throw plantNotFound();
      await manager.update(Diagnosis, diagnosis.id, { plantId });
      return link;
    });
  }

  /**
   * A2: tạo cây mới từ lượt rồi gắn (BR-22, 27). Tình trạng theo kết quả: `DISEASE` →
   * "Đang có bệnh", `HEALTHY` → "Khoẻ mạnh", `UNCERTAIN` → "Chưa chẩn đoán".
   */
  async createPlant(
    userId: number,
    diagnosisId: number,
    dto: CreatePlantDto,
    avatar?: Buffer,
  ): Promise<PlantLink> {
    // Kiểm tra trước khi lưu ảnh, để lỗi thường gặp không để lại ảnh thừa.
    await this.lockUnlinked(this.diagnoses.manager, userId, diagnosisId);
    await this.plants.requireCrop(dto.cropId);
    const saved = avatar
      ? await this.storage.saveImage(avatar, 'plants')
      : undefined;
    try {
      return await this.diagnoses.manager.transaction(async (manager) => {
        const diagnosis = await this.lockUnlinked(manager, userId, diagnosisId);
        const plant = await this.plants.insertPlant(
          manager,
          userId,
          dto,
          saved?.key ?? null,
          healthFromResult(diagnosis.resultType!) ?? 'NOT_DIAGNOSED',
        );
        await manager.update(Diagnosis, diagnosis.id, { plantId: plant.id });
        return {
          plant: {
            id: plant.id,
            name: plant.name,
            healthStatus: plant.healthStatus,
          },
          suggestRecovered: false,
          suggestions: [],
        };
      });
    } catch (error) {
      if (saved) {
        await this.storage
          .delete(saved.key)
          .catch((e: unknown) =>
            this.logger.warn(`Không xoá được ảnh ${saved.key}: ${String(e)}`),
          );
      }
      throw error;
    }
  }

  /**
   * Lượt `COMPLETED`, chưa xoá, của người gọi (404 nếu không) và chưa gắn cây (409 nếu đã
   * gắn, C4 UC03 7a). Trong giao dịch thì khoá dòng để hai yêu cầu cùng lúc không cùng gắn.
   */
  private async lockUnlinked(
    manager: EntityManager,
    userId: number,
    diagnosisId: number,
  ): Promise<Diagnosis> {
    const inTransaction = manager.queryRunner?.isTransactionActive === true;
    const diagnosis = await manager.getRepository(Diagnosis).findOne({
      where: { id: diagnosisId, userId, status: 'COMPLETED' },
      ...(inTransaction
        ? { lock: { mode: 'pessimistic_write' as const } }
        : {}),
    });
    if (!diagnosis?.resultType) throw diagnosisNotFound();
    if (diagnosis.plantId !== null) throw diagnosisAlreadyLinked();
    return diagnosis;
  }
}

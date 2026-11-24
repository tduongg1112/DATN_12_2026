import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import {
  StorageService,
  type StorageFolder,
  type StoredFile,
} from '../../common/storage/storage.service.js';
import { CropService, type ActiveCrop } from '../catalog/crop.service.js';
import type {
  CreatePlantDto,
  CreatePlantLogDto,
  CurrentDisease,
  PlantCard,
  PlantDetail,
  PlantDiagnosisItem,
  PlantLink,
  PlantLogView,
  PlantsPage,
  ReminderSuggestion,
  ReminderView,
  UpdatePlantDto,
} from './dto/plant.dto.js';
import { PlantLog } from './entities/plant-log.entity.js';
import { Plant, type HealthStatus } from './entities/plant.entity.js';
import { Reminder, type ReminderType } from './entities/reminder.entity.js';
import {
  allowedStatusChanges,
  canChangeStatus,
  healthFromResult,
  shouldSuggestRecovered,
  type DiagnosisResultType,
  type ManualStatus,
} from './health-rules.js';
import {
  plantCropNotFound,
  plantNotFound,
  statusNotAllowed,
} from './plant-messages.js';
import { PlantReadsQuery } from './plant-reads.query.js';
import {
  addDays,
  buildSuggestions,
  REMINDER_TITLES,
} from './reminder-rules.js';

/** Thông tin một lượt chẩn đoán cần để áp vào cây (do `diagnosis` truyền vào). */
export interface DiagnosisForPlant {
  id: number;
  userId: number;
  createdAt: Date;
  resultType: DiagnosisResultType;
}

/** Tình trạng "Bệnh đang mắc" chỉ hiện khi cây đang bệnh hoặc đang điều trị (OQ-46). */
const SHOWS_CURRENT_DISEASE: readonly HealthStatus[] = ['DISEASED', 'TREATING'];

/**
 * Hồ sơ cây (docs/my_plants/api_my_plants.md P1 → P7). Mọi thao tác chỉ trên cây của chính
 * người gọi (BR-13). Mô-đun `diagnosis` dùng các hàm `findOwnPlant`, `applyDiagnosis`,
 * `requireCrop`, `insertPlant` để gắn lượt vào cây trong giao dịch của nó (TD-25).
 */
@Injectable()
export class PlantsService {
  private readonly logger = new Logger(PlantsService.name);

  constructor(
    @InjectRepository(Plant) private readonly plants: Repository<Plant>,
    @InjectRepository(PlantLog) private readonly logs: Repository<PlantLog>,
    @InjectRepository(Reminder)
    private readonly reminders: Repository<Reminder>,
    private readonly reads: PlantReadsQuery,
    private readonly crops: CropService,
    private readonly storage: StorageService,
  ) {}

  /** P1. */
  async list(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<PlantsPage> {
    const [total, rows] = await Promise.all([
      this.plants.countBy({ userId }),
      this.reads.listPage(userId, (page - 1) * pageSize, pageSize),
    ]);
    const items: PlantCard[] = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        name: r.name,
        crop: { id: r.crop_id, code: r.crop_code, name: r.crop_name },
        avatarUrl: await this.storage.resolveUrl(r.avatar_url),
        healthStatus: r.health_status,
        lastDiagnosedAt: r.last_at,
      })),
    );
    return { items, page, pageSize, total };
  }

  /** P2 (BR-02, BR-03): cây mới "Chưa chẩn đoán", kèm gợi ý nhắc tưới, bón (BR-18). */
  async create(
    userId: number,
    dto: CreatePlantDto,
    avatar?: Buffer,
  ): Promise<{ plant: PlantDetail; suggestions: ReminderSuggestion[] }> {
    await this.requireCrop(dto.cropId);
    const saved = await this.saveOptional(avatar, 'plants');
    let plant: Plant;
    try {
      plant = await this.insertPlant(
        this.plants.manager,
        userId,
        dto,
        saved?.key ?? null,
        'NOT_DIAGNOSED',
      );
    } catch (error) {
      await this.deleteQuietly(saved?.key);
      throw error;
    }
    const suggestions = await this.suggestionsFor(this.plants.manager, plant, {
      care: true,
    });
    return { plant: await this.getDetail(userId, plant.id), suggestions };
  }

  /** P3 (BR-05, BR-06). */
  async getDetail(userId: number, plantId: number): Promise<PlantDetail> {
    const plant = await this.plants.findOne({
      where: { id: plantId, userId },
      relations: { crop: true },
    });
    if (!plant?.crop) throw plantNotFound();

    const [diagnosisRows, logs, reminders] = await Promise.all([
      this.reads.diagnosesOf(plant.id),
      this.logs.find({
        where: { plantId: plant.id },
        order: { actionDate: 'DESC', createdAt: 'DESC', id: 'DESC' },
      }),
      this.reminders.find({
        where: { plantId: plant.id, isActive: true },
        order: { nextRemindAt: 'ASC', id: 'ASC' },
      }),
    ]);

    const diseaseRow = SHOWS_CURRENT_DISEASE.includes(plant.healthStatus)
      ? diagnosisRows.find(
          (r) => r.result_type === 'DISEASE' && r.disease_id !== null,
        )
      : undefined;
    const currentDisease: CurrentDisease | null = diseaseRow
      ? {
          diagnosisId: diseaseRow.id,
          id: diseaseRow.disease_id!,
          name: diseaseRow.disease_name ?? '',
          severity: diseaseRow.disease_severity!,
          treatment: diseaseRow.disease_treatment,
          detailAvailable: diseaseRow.disease_available === true,
        }
      : null;

    const diagnoses: PlantDiagnosisItem[] = await Promise.all(
      diagnosisRows.map(async (r) => ({
        id: r.id,
        createdAt: r.created_at,
        resultType: r.result_type,
        thumbnailUrl: await this.storage.resolveUrl(r.processed_image_url),
        probability: Number(r.probability),
        disease:
          r.disease_id === null
            ? null
            : {
                id: r.disease_id,
                name: r.disease_name ?? '',
                severity: r.disease_severity!,
              },
      })),
    );

    return {
      id: plant.id,
      name: plant.name,
      crop: { id: plant.crop.id, code: plant.crop.code, name: plant.crop.name },
      plantedDate: plant.plantedDate,
      note: plant.note,
      avatarUrl: await this.storage.resolveUrl(plant.avatarUrl),
      healthStatus: plant.healthStatus,
      allowedStatusChanges: allowedStatusChanges(plant.healthStatus),
      createdAt: plant.createdAt,
      lastDiagnosedAt: diagnosisRows[0]?.created_at ?? null,
      currentDisease,
      diagnoses,
      logs: await Promise.all(logs.map((l) => this.toLogView(l))),
      reminders: reminders.map((r) => this.toReminderView(r)),
    };
  }

  /** P4 (BR-10). Có ảnh mới thì thay, xoá ảnh cũ sau khi lưu. */
  async update(
    userId: number,
    plantId: number,
    dto: UpdatePlantDto,
    avatar?: Buffer,
  ): Promise<PlantDetail> {
    const plant = await this.requireOwn(userId, plantId);
    if (dto.cropId !== undefined) await this.requireCrop(dto.cropId);
    const saved = await this.saveOptional(avatar, 'plants');

    const changes: Partial<Plant> = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.cropId !== undefined) changes.cropId = dto.cropId;
    if (dto.plantedDate !== undefined) changes.plantedDate = dto.plantedDate;
    if (dto.note !== undefined) changes.note = dto.note;
    if (saved) changes.avatarUrl = saved.key;

    if (Object.keys(changes).length > 0) {
      try {
        await this.plants.update(plant.id, changes);
      } catch (error) {
        await this.deleteQuietly(saved?.key);
        throw error;
      }
    }
    if (saved && plant.avatarUrl) await this.deleteQuietly(plant.avatarUrl);
    return this.getDetail(userId, plant.id);
  }

  /**
   * P5 (BR-11). Khoá ngoại tự xoá nhật ký, lịch nhắc; gỡ `plant_id` của lượt chẩn đoán; đặt
   * `reminder_id = NULL` cho thông báo. Ảnh trong kho xoá sau khi xong.
   */
  async remove(userId: number, plantId: number): Promise<void> {
    const plant = await this.requireOwn(userId, plantId);
    const logImages = await this.logs.find({
      select: { id: true, imageUrl: true },
      where: { plantId: plant.id },
    });
    await this.plants.manager.transaction(async (manager) => {
      await manager.delete(Plant, { id: plant.id, userId });
    });
    const keys = [plant.avatarUrl, ...logImages.map((l) => l.imageUrl)];
    for (const key of keys) await this.deleteQuietly(key);
  }

  /**
   * P6 (BR-08, BR-16; OQ-47): một giao dịch đổi tình trạng, ghi `STATUS_CHANGE`; "Đã khỏi"
   * thì tắt các nhắc kiểm tra lại đang bật.
   */
  async changeStatus(
    userId: number,
    plantId: number,
    status: ManualStatus,
  ): Promise<PlantDetail> {
    await this.plants.manager.transaction(async (manager) => {
      const plant = await manager.getRepository(Plant).findOne({
        where: { id: plantId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plant) throw plantNotFound();
      if (!canChangeStatus(plant.healthStatus, status)) {
        throw statusNotAllowed();
      }
      await manager.update(Plant, plant.id, { healthStatus: status });
      await manager.insert(PlantLog, {
        plantId: plant.id,
        logType: 'STATUS_CHANGE',
        statusAfter: status,
      });
      if (status === 'RECOVERED') {
        await manager.update(
          Reminder,
          { plantId: plant.id, reminderType: 'RECHECK', isActive: true },
          { isActive: false },
        );
      }
    });
    return this.getDetail(userId, plantId);
  }

  /** P7 (BR-09): ghi chú chăm sóc; không đổi tình trạng. */
  async addLog(
    userId: number,
    plantId: number,
    dto: CreatePlantLogDto,
    image?: Buffer,
  ): Promise<PlantLogView> {
    const plant = await this.requireOwn(userId, plantId);
    const saved = await this.saveOptional(image, 'plant-logs');
    try {
      const result = await this.logs.insert({
        plantId: plant.id,
        logType: 'CARE_NOTE',
        content: dto.content,
        imageUrl: saved?.key ?? null,
        // Không gửi ngày thì CSDL đặt CURRENT_DATE (giao diện luôn gửi ngày theo giờ máy).
        ...(dto.actionDate ? { actionDate: dto.actionDate } : {}),
      });
      const id = Number(result.identifiers[0].id);
      return this.toLogView(await this.logs.findOneByOrFail({ id }));
    } catch (error) {
      await this.deleteQuietly(saved?.key);
      throw error;
    }
  }

  // --- Dùng bởi mô-đun `diagnosis` (A1, A2, D1) ---------------------------------------

  /** Cây của người gọi, hoặc `null`. */
  async findOwnPlant(
    userId: number,
    plantId: number,
  ): Promise<{ id: number; cropId: number; name: string } | null> {
    const plant = await this.plants.findOne({
      select: { id: true, cropId: true, name: true },
      where: { id: plantId, userId },
    });
    return plant
      ? { id: plant.id, cropId: plant.cropId, name: plant.name }
      : null;
  }

  /** Loại cây đang hiện, không thì 400 CROP_NOT_FOUND (BR-02). */
  async requireCrop(cropId: number): Promise<ActiveCrop> {
    const crop = await this.crops.findActive(cropId);
    if (!crop) throw plantCropNotFound();
    return crop;
  }

  /** Tạo cây trong giao dịch của bên gọi (P2, A2). Ảnh đã lưu trước. */
  async insertPlant(
    manager: EntityManager,
    userId: number,
    dto: CreatePlantDto,
    avatarKey: string | null,
    healthStatus: HealthStatus,
  ): Promise<Plant> {
    return manager.getRepository(Plant).save(
      manager.getRepository(Plant).create({
        userId,
        cropId: dto.cropId,
        name: dto.name,
        plantedDate: dto.plantedDate ?? null,
        note: dto.note ?? null,
        avatarUrl: avatarKey,
        healthStatus,
      }),
    );
  }

  /**
   * Áp kết quả một lượt vào cây, trong giao dịch của bên gọi (diagnosis BR-25; Bảng 4.8;
   * OQ-48). Chỉ đổi tình trạng khi lượt là lượt mới nhất của cây. Cây không còn (đã xoá,
   * của người khác) thì trả `null`.
   */
  async applyDiagnosis(
    manager: EntityManager,
    plantId: number,
    diagnosis: DiagnosisForPlant,
  ): Promise<PlantLink | null> {
    const plant = await manager.getRepository(Plant).findOne({
      where: { id: plantId, userId: diagnosis.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!plant) return null;

    const next = healthFromResult(diagnosis.resultType);
    let suggestRecovered = false;
    let suggestions: ReminderSuggestion[] = [];
    if (
      next &&
      (await this.reads.isLatestForPlant(
        manager,
        plant.id,
        diagnosis.id,
        diagnosis.createdAt,
      ))
    ) {
      // diagnosis BR-26: lượt bệnh được áp vào cây thì gợi ý nhắc kiểm tra lại.
      if (diagnosis.resultType === 'DISEASE') {
        suggestions = await this.suggestionsFor(manager, plant, {
          care: false,
          recheckDiagnosisId: diagnosis.id,
        });
      }
      suggestRecovered = shouldSuggestRecovered(
        plant.healthStatus,
        diagnosis.resultType,
      );
      if (plant.healthStatus !== next) {
        await manager.update(Plant, plant.id, { healthStatus: next });
        plant.healthStatus = next;
      }
    }
    return {
      plant: {
        id: plant.id,
        name: plant.name,
        healthStatus: plant.healthStatus,
      },
      suggestRecovered,
      suggestions,
    };
  }

  // --- Nhắc việc (đợt 2: R1, R2; BR-14, 16, 18) --------------------------------------

  /**
   * Gợi ý nhắc cho một cây, trong giao dịch của bên gọi: tưới, bón theo chu kỳ của loại cây
   * (`care`, BR-18) và kiểm tra lại theo `recheck_days` của bệnh của lượt (diagnosis BR-26).
   * Bỏ loại mà cây đã có nhắc đang bật (BR-16).
   */
  async suggestionsFor(
    manager: EntityManager,
    plant: { id: number; cropId: number },
    opts: { care: boolean; recheckDiagnosisId?: number },
  ): Promise<ReminderSuggestion[]> {
    const care = opts.care
      ? await this.crops.careIntervals(plant.cropId)
      : null;
    const recheckDays =
      opts.recheckDiagnosisId === undefined
        ? null
        : await this.reads.recheckDaysOf(manager, opts.recheckDiagnosisId);
    return buildSuggestions(
      {
        wateringDays: care?.wateringDays,
        fertilizingDays: care?.fertilizingDays,
        recheckDays,
      },
      await this.activeReminderTypes(manager, plant.id),
    );
  }

  /** R1 (BR-14): nhắc kiểm tra lại một lần sau 3, 7 hoặc 14 ngày, `source = USER`. */
  async createRecheckReminder(
    userId: number,
    plantId: number,
    days: number,
  ): Promise<ReminderView> {
    const plant = await this.requireOwn(userId, plantId);
    const saved = await this.reminders.save(
      this.reminders.create({
        plantId: plant.id,
        reminderType: 'RECHECK',
        title: REMINDER_TITLES.RECHECK,
        nextRemindAt: addDays(new Date(), days),
        repeatDays: null,
        source: 'USER',
      }),
    );
    return this.toReminderView(saved);
  }

  /**
   * R2 (BR-16, BR-18; diagnosis BR-26, 27): tính lại gợi ý tại thời điểm gọi và chỉ tạo loại
   * vừa được gợi ý vừa được chọn, `source = SYSTEM`. Khoá dòng cây để bấm hai lần không tạo
   * trùng. "Kiểm tra lại" lấy theo bệnh đang mắc (cây đang bệnh hoặc đang điều trị).
   */
  async createSuggestedReminders(
    userId: number,
    plantId: number,
    types: ReminderSuggestion['type'][],
  ): Promise<ReminderView[]> {
    return this.plants.manager.transaction(async (manager) => {
      const plant = await manager.getRepository(Plant).findOne({
        where: { id: plantId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plant) throw plantNotFound();

      const care = await this.crops.careIntervals(plant.cropId);
      let recheckDays: number | null = null;
      if (SHOWS_CURRENT_DISEASE.includes(plant.healthStatus)) {
        const rows = await this.reads.diagnosesOf(plant.id);
        recheckDays =
          rows.find((r) => r.result_type === 'DISEASE' && r.disease_id !== null)
            ?.disease_recheck_days ?? null;
      }
      const chosen = buildSuggestions(
        {
          wateringDays: care.wateringDays,
          fertilizingDays: care.fertilizingDays,
          recheckDays,
        },
        await this.activeReminderTypes(manager, plant.id),
      ).filter((s) => types.includes(s.type));

      const now = new Date();
      const repo = manager.getRepository(Reminder);
      const created: Reminder[] = [];
      for (const s of chosen) {
        created.push(
          await repo.save(
            repo.create({
              plantId: plant.id,
              reminderType: s.type,
              title: REMINDER_TITLES[s.type],
              nextRemindAt: addDays(now, s.days),
              repeatDays: s.type === 'RECHECK' ? null : s.days,
              source: 'SYSTEM',
            }),
          ),
        );
      }
      return created.map((r) => this.toReminderView(r));
    });
  }

  // --- Nội bộ ---------------------------------------------------------------------------

  private async requireOwn(userId: number, plantId: number): Promise<Plant> {
    const plant = await this.plants.findOneBy({ id: plantId, userId });
    if (!plant) throw plantNotFound();
    return plant;
  }

  private async activeReminderTypes(
    manager: EntityManager,
    plantId: number,
  ): Promise<Set<ReminderType>> {
    const active = await manager.getRepository(Reminder).find({
      select: { id: true, reminderType: true },
      where: { plantId, isActive: true },
    });
    return new Set(active.map((r) => r.reminderType));
  }

  private toReminderView(r: Reminder): ReminderView {
    return {
      id: r.id,
      type: r.reminderType,
      title: r.title,
      nextRemindAt: r.nextRemindAt,
      repeatDays: r.repeatDays,
      source: r.source,
    };
  }

  private async toLogView(log: PlantLog): Promise<PlantLogView> {
    return {
      id: log.id,
      logType: log.logType,
      content: log.content,
      statusAfter: log.statusAfter,
      imageUrl: await this.storage.resolveUrl(log.imageUrl),
      actionDate: log.actionDate,
      createdAt: log.createdAt,
    };
  }

  private async saveOptional(
    image: Buffer | undefined,
    folder: StorageFolder,
  ): Promise<StoredFile | undefined> {
    return image ? this.storage.saveImage(image, folder) : undefined;
  }

  private async deleteQuietly(
    stored: string | null | undefined,
  ): Promise<void> {
    await this.storage
      .deleteStored(stored)
      .catch((e: unknown) =>
        this.logger.warn(`Không xoá được ảnh ${stored}: ${String(e)}`),
      );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertValidImage } from '../../common/storage/image-validation.js';
import {
  StorageService,
  type StoredFile,
} from '../../common/storage/storage.service.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { CropService } from '../catalog/crop.service.js';
import {
  ModelLabelService,
  type LabelMatch,
} from '../catalog/model-label.service.js';
import { NotificationsService } from '../plants/notifications.service.js';
import {
  AiClient,
  AiServiceError,
  type AiPredictResult,
} from './ai/ai-client.js';
import {
  aiErrorToException,
  aiUnavailable,
  cropNotFound,
  diagnosisNotFound,
  missingImage,
} from './diagnosis-errors.js';
import {
  classifyResult,
  roundProbability,
  unknownLabelNotice,
} from './diagnosis-result.js';
import type { DiagnosisUploadFiles } from './diagnosis-upload.interceptor.js';
import type {
  CreateDiagnosisDto,
  DiagnosisResult,
} from './dto/diagnosis.dto.js';
import { DiagnosisPrediction } from './entities/diagnosis-prediction.entity.js';
import { Diagnosis } from './entities/diagnosis.entity.js';

/**
 * Chẩn đoán bệnh qua hình ảnh (docs/diagnosis/api_diagnosis.md D1, D2;
 * database_design_diagnosis.md mục 2, 3).
 */
@Injectable()
export class DiagnosisService {
  private readonly logger = new Logger(DiagnosisService.name);
  private readonly maxImageBytes: number;
  private readonly threshold: number;
  private readonly topK: number;

  constructor(
    @InjectRepository(Diagnosis)
    private readonly diagnoses: Repository<Diagnosis>,
    @InjectRepository(DiagnosisPrediction)
    private readonly predictions: Repository<DiagnosisPrediction>,
    private readonly crops: CropService,
    private readonly labels: ModelLabelService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiClient,
    private readonly storage: StorageService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maxImageBytes = config.get('STORAGE_MAX_BYTES', { infer: true });
    this.threshold = config.get('AI_CONFIDENCE_THRESHOLD', { infer: true });
    this.topK = config.get('AI_TOP_K', { infer: true });
  }

  /**
   * D1. Thứ tự (database_design mục 3): kiểm tra → lưu 2 ảnh → INSERT PROCESSING → gọi
   * AI (ngoài giao dịch) → tra nhãn → một giao dịch ghi dự đoán + COMPLETED.
   */
  async create(
    userId: number,
    dto: CreateDiagnosisDto,
    files: DiagnosisUploadFiles | undefined,
  ): Promise<DiagnosisResult> {
    // 1. Kiểm tra loại cây (BR-07, OQ-05), rồi hai ảnh (BR-04, BR-06). Chưa ghi gì.
    const crop = await this.crops.findActive(dto.cropId);
    if (!crop) throw cropNotFound();
    const original = files?.original?.[0]?.buffer;
    const processed = files?.processed?.[0]?.buffer;
    if (!original || !processed) throw missingImage();
    assertValidImage(original, this.maxImageBytes);
    const processedType = assertValidImage(processed, this.maxImageBytes);

    // 2–3. Lưu ảnh, rồi ghi lượt PROCESSING trước khi gọi AI (BR-07).
    const stored = await this.saveImages(original, processed);
    let diagnosisId: number;
    try {
      const saved = await this.diagnoses.save(
        this.diagnoses.create({
          userId,
          cropId: crop.id,
          originalImageUrl: stored[0].key,
          processedImageUrl: stored[1].key,
          status: 'PROCESSING',
        }),
      );
      diagnosisId = saved.id;
    } catch (error) {
      await this.deleteImages(stored);
      throw error;
    }

    // 4. Gọi AI, chờ tối đa AI_TIMEOUT_MS (BR-10).
    let result: AiPredictResult;
    try {
      result = await this.ai.predict({
        image: processed,
        contentType: processedType,
        cropCode: crop.code,
        topK: this.topK,
      });
    } catch (error) {
      this.logAiError(diagnosisId, error);
      await this.markFailed(diagnosisId);
      throw aiErrorToException(error);
    }

    // 5. Tra nhãn (BR-11). Nhãn lạ: dừng lượt, báo ADMIN.
    const codes = result.predictions.map((p) => p.classCode);
    const byCode = new Map(
      (await this.labels.findActiveByCodes(codes)).map(
        (l) => [l.classCode, l] as const,
      ),
    );
    const unknown = codes.filter((c) => !byCode.has(c));
    if (unknown.length > 0) {
      await this.markFailed(diagnosisId);
      await this.reportUnknownLabels(diagnosisId, unknown);
      throw aiUnavailable();
    }

    // 6. Dạng kết quả (BR-12) và một giao dịch ghi kết quả (BR-13).
    const rows = result.predictions.map((p, i) => ({
      diagnosisId,
      labelId: (byCode.get(p.classCode) as LabelMatch).id,
      probability: roundProbability(p.probability),
      rankNo: i + 1,
    }));
    const top = byCode.get(codes[0]) as LabelMatch;
    const resultType = classifyResult(
      { probability: rows[0].probability, labelType: top.labelType },
      this.threshold,
    );
    try {
      await this.diagnoses.manager.transaction(async (manager) => {
        await manager.insert(DiagnosisPrediction, rows);
        const updated = await manager
          .createQueryBuilder()
          .update(Diagnosis)
          .set({
            status: 'COMPLETED',
            resultType,
            modelVersion: result.modelVersion,
            inferenceMs: result.inferenceMs,
            completedAt: () => 'now()',
          })
          .where('id = :id AND status = :processing', {
            id: diagnosisId,
            processing: 'PROCESSING',
          })
          .execute();
        if (updated.affected !== 1) {
          throw new Error('Lượt chẩn đoán không còn ở trạng thái PROCESSING');
        }
      });
    } catch (error) {
      this.logger.error(
        `Không ghi được kết quả lượt chẩn đoán ${diagnosisId}: ${String(error)}`,
      );
      await this.markFailed(diagnosisId);
      throw aiUnavailable();
    }

    // 7. Trả kết quả như D2.
    return this.getOwn(userId, diagnosisId);
  }

  /** D2 (Q5): chỉ lượt của chính mình, COMPLETED, chưa xoá mềm (BR-G03, OQ-23). */
  async getOwn(userId: number, id: number): Promise<DiagnosisResult> {
    const diagnosis = await this.diagnoses.findOne({
      where: { id, userId, status: 'COMPLETED' },
      relations: { crop: true },
    });
    if (!diagnosis?.crop || !diagnosis.resultType) throw diagnosisNotFound();

    const predictions = await this.predictions.find({
      where: { diagnosisId: id },
      relations: { label: { disease: { crop: true } } },
      order: { rankNo: 'ASC' },
    });
    const [originalImageUrl, processedImageUrl] = await Promise.all([
      this.storage.resolveUrl(diagnosis.originalImageUrl),
      this.storage.resolveUrl(diagnosis.processedImageUrl),
    ]);

    return {
      id: diagnosis.id,
      resultType: diagnosis.resultType,
      createdAt: diagnosis.createdAt,
      crop: {
        id: diagnosis.crop.id,
        code: diagnosis.crop.code,
        name: diagnosis.crop.name,
        careGuide: diagnosis.crop.careGuide,
      },
      originalImageUrl,
      processedImageUrl,
      predictions: predictions.map((p) => {
        const disease = p.label?.disease;
        return {
          rank: p.rankNo,
          probability: p.probability,
          labelType: p.label!.labelType,
          disease: disease
            ? {
                id: disease.id,
                name: disease.name,
                severity: disease.severity,
                pathogenGroup: disease.pathogenGroup,
                summary: disease.summary,
                symptoms: disease.symptoms,
                treatment: disease.treatment,
                detailAvailable:
                  disease.status === 'PUBLISHED' &&
                  disease.crop?.status === 'ACTIVE',
              }
            : null,
        };
      }),
    };
  }

  /** Lưu ảnh gốc rồi ảnh đã chỉnh; ảnh sau lỗi thì xoá ảnh trước. */
  private async saveImages(
    original: Buffer,
    processed: Buffer,
  ): Promise<[StoredFile, StoredFile]> {
    const first = await this.storage.saveImage(original, 'diagnoses');
    try {
      return [first, await this.storage.saveImage(processed, 'diagnoses')];
    } catch (error) {
      await this.deleteImages([first]);
      throw error;
    }
  }

  private async deleteImages(files: StoredFile[]): Promise<void> {
    for (const file of files) {
      await this.storage
        .delete(file.key)
        .catch((e: unknown) =>
          this.logger.warn(`Không xoá được ảnh ${file.key}: ${String(e)}`),
        );
    }
  }

  /** Q4: lượt chuyển FAILED một lần duy nhất. Lỗi ở đây chỉ ghi log. */
  private async markFailed(id: number): Promise<void> {
    try {
      await this.diagnoses
        .createQueryBuilder()
        .update(Diagnosis)
        .set({ status: 'FAILED', completedAt: () => 'now()' })
        .where('id = :id AND status = :processing', {
          id,
          processing: 'PROCESSING',
        })
        .execute();
    } catch (error) {
      this.logger.error(
        `Không chuyển được lượt chẩn đoán ${id} sang FAILED: ${String(error)}`,
      );
    }
  }

  /** BR-11, OQ-26: log ERROR và báo ADMIN một lần cho mỗi `class_code`. */
  private async reportUnknownLabels(
    diagnosisId: number,
    codes: string[],
  ): Promise<void> {
    for (const code of codes) {
      this.logger.error(
        `Lượt chẩn đoán ${diagnosisId}: AI trả nhãn "${code}" chưa có trong model_labels đang dùng`,
      );
      const notice = unknownLabelNotice(code);
      await this.notifications
        .notifyAdminsOnce(notice.title, notice.content)
        .catch((e: unknown) =>
          this.logger.error(
            `Không gửi được thông báo nhãn lạ "${code}" cho ADMIN: ${String(e)}`,
          ),
        );
    }
  }

  private logAiError(diagnosisId: number, error: unknown): void {
    const detail =
      error instanceof AiServiceError
        ? `${error.kind}: ${error.message}`
        : String(error);
    this.logger.warn(`Lượt chẩn đoán ${diagnosisId} lỗi AI (${detail})`);
  }
}

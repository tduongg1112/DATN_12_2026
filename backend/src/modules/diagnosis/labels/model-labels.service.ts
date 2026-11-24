import { Injectable, Logger } from '@nestjs/common';
import type {
  ModelLabelItem,
  StaleLabelItem,
} from '../../catalog/admin/dto/admin-catalog.dto.js';
import { aiLabelsUnavailable } from '../../catalog/admin/catalog-messages.js';
import { ModelLabelService } from '../../catalog/model-label.service.js';
import { AiClient, AiServiceError } from '../ai/ai-client.js';

/**
 * Nhãn mô hình của khu quản trị (docs/catalog/api_catalog.md M1, M2). Đặt ở `diagnosis` vì
 * phải gọi AI service qua `AiClient` (be-coding-rules mục 7) mà `catalog` không import
 * `diagnosis` được (TD-31, phương án A, chốt 25/11). Ghi qua `ModelLabelService` của `catalog`.
 */
@Injectable()
export class ModelLabelsAdminService {
  private readonly logger = new Logger(ModelLabelsAdminService.name);

  constructor(
    private readonly ai: AiClient,
    private readonly labels: ModelLabelService,
  ) {}

  /** M1 (BR-15, 18). */
  async overview(): Promise<{
    items: ModelLabelItem[];
    stale: StaleLabelItem[];
  }> {
    return this.labels.modelMapping(await this.modelCodes());
  }

  /** M2 (BR-19): tắt nhãn không còn trong mô hình; không tự bật lại nhãn nào (OQ-59). */
  async sync(): Promise<{ deactivated: number }> {
    const deactivated = await this.labels.deactivateMissing(
      await this.modelCodes(),
    );
    return { deactivated };
  }

  /**
   * Danh sách mã của mô hình đang dùng (`GET /labels`, TD-19). Danh sách rỗng coi như lỗi: nếu
   * không, M2 sẽ tắt mọi nhãn và mọi lượt chẩn đoán sau đó đều thất bại.
   */
  private async modelCodes(): Promise<string[]> {
    let codes: string[];
    try {
      codes = await this.ai.getLabels();
    } catch (error) {
      if (!(error instanceof AiServiceError)) throw error;
      this.logger.warn(`GET /labels lỗi (${error.kind}): ${error.message}`);
      throw aiLabelsUnavailable();
    }
    if (codes.length === 0) {
      this.logger.warn('GET /labels trả danh sách rỗng');
      throw aiLabelsUnavailable();
    }
    return codes;
  }
}

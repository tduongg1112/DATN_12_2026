import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import type { AiMockScenario } from '../../../config/env.validation.js';
import type { ActiveLabel } from '../../catalog/model-label.service.js';
import {
  AiClient,
  AiServiceError,
  type AiPredictInput,
  type AiPredictResult,
} from './ai-client.js';

export const MOCK_MODEL_VERSION = 'mock-1';
export const MOCK_UNKNOWN_CLASS_CODE = 'MOCK___unknown_label';

/**
 * Danh sách nhãn của "mô hình" giả (`GET /labels`, TD-31 A): 11 mã của seed dev
 * (`SAMPLE_LABELS`) và 3 mã chưa gán để thử màn "Nhãn mô hình" của `catalog`. Là dữ liệu
 * tạm, thay bằng danh sách của nhóm AI (`docs/_shared/real_data_needed.md` A1).
 */
export const MOCK_MODEL_LABELS: readonly string[] = [
  'Tomato___healthy',
  'Tomato___Late_blight',
  'Tomato___Early_blight',
  'Potato___healthy',
  'Potato___Late_blight',
  'Corn_(maize)___healthy',
  'Corn_(maize)___Common_rust_',
  'Pepper,_bell___healthy',
  'Pepper,_bell___Bacterial_spot',
  'Rice___healthy',
  'Rice___Brown_spot',
  'Tomato___Leaf_Mold',
  'Potato___Early_blight',
  'Corn_(maize)___Northern_Leaf_Blight',
];

export interface MockAiClientOptions {
  timeoutMs: number;
  defaultTopK: number;
  scenario: AiMockScenario;
}

/**
 * AI giả khi chưa có AI service (TD-04, AI_MODE=mock). Trả top-k lấy từ model_labels
 * đang dùng của loại cây đã chọn (OQ-05); cùng một ảnh luôn ra cùng kết quả. Kịch bản lỗi chọn bằng AI_MOCK_SCENARIO
 * hoặc tham số `scenario` (dùng trong test):
 * - `error`: như AI trả 503 · `timeout`: chờ hết AI_TIMEOUT_MS rồi báo quá thời gian
 * - `invalid_image`: như AI trả 422 · `unknown_label`: hạng 1 là class_code không có trong danh mục (OQ-26)
 */
export class MockAiClient extends AiClient {
  constructor(
    private readonly loadActiveLabels: () => Promise<ActiveLabel[]>,
    private readonly options: MockAiClientOptions,
  ) {
    super();
  }

  async predict(
    input: AiPredictInput,
    scenario: AiMockScenario = this.options.scenario,
  ): Promise<AiPredictResult> {
    switch (scenario) {
      case 'error':
        throw new AiServiceError(
          'unavailable',
          'Mock: AI service quá tải (503)',
          503,
        );
      case 'timeout':
        await sleep(this.options.timeoutMs);
        throw new AiServiceError(
          'timeout',
          `Mock: AI service quá ${this.options.timeoutMs} ms`,
        );
      case 'invalid_image':
        throw new AiServiceError(
          'bad_request',
          'Mock: ảnh hỏng hoặc sai định dạng (422)',
          422,
        );
    }

    const all = await this.loadActiveLabels();
    if (all.length === 0) {
      throw new AiServiceError(
        'unavailable',
        'Mock: chưa có model_labels đang dùng. Chạy "npm run seed:dev".',
      );
    }
    const pool = all.filter((l) => l.cropCode === input.cropCode);
    if (pool.length === 0) {
      throw new AiServiceError(
        'bad_request',
        `Mock: loại cây ${input.cropCode} không hỗ trợ`,
        422,
      );
    }

    const topK = Math.min(input.topK ?? this.options.defaultTopK, pool.length);
    const rand = seededRandom(input.image);
    const codes = shuffle(
      pool.map((l) => l.classCode),
      rand,
    ).slice(0, topK);
    if (scenario === 'unknown_label') codes[0] = MOCK_UNKNOWN_CLASS_CODE;

    return {
      modelVersion: MOCK_MODEL_VERSION,
      inferenceMs: 20 + Math.floor(rand() * 80),
      predictions: descendingProbabilities(topK, rand).map(
        (probability, i) => ({
          classCode: codes[i],
          probability,
        }),
      ),
    };
  }

  /** Danh sách cố định (TD-31 A); `predict` vẫn chỉ chọn trong các nhãn đang gán. */
  getLabels(): Promise<string[]> {
    return Promise.resolve([...MOCK_MODEL_LABELS]);
  }
}

/** PRNG mulberry32, hạt giống từ sha256 của ảnh. */
function seededRandom(image: Buffer): () => number {
  let a = createHash('sha256').update(image).digest().readUInt32LE(0);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** k xác suất giảm dần, mỗi giá trị 4 chữ số thập phân (DECIMAL(5,4)), tổng ≤ 1. */
function descendingProbabilities(k: number, rand: () => number): number[] {
  const weights = Array.from({ length: k + 1 }, () => 0.05 + rand());
  weights[0] += k; // hạng 1 thường nổi trội; phần dư cuối là "các lớp khác"
  const total = weights.reduce((s, w) => s + w, 0);
  return weights
    .slice(0, k)
    .map((w) => Math.floor((w / total) * 10000) / 10000)
    .sort((x, y) => y - x);
}

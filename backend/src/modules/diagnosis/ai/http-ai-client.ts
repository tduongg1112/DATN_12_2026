import {
  AiClient,
  AiServiceError,
  type AiPrediction,
  type AiPredictInput,
  type AiPredictResult,
} from './ai-client.js';

export interface HttpAiClientOptions {
  baseUrl: string;
  timeoutMs: number;
  defaultTopK: number;
}

/** Gọi AI service thật qua HTTP (POST /predict multipart, GET /labels). */
export class HttpAiClient extends AiClient {
  constructor(
    private readonly options: HttpAiClientOptions,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    super();
  }

  async predict(input: AiPredictInput): Promise<AiPredictResult> {
    const form = new FormData();
    const ext = input.contentType === 'image/png' ? 'png' : 'jpg';
    form.append(
      'image',
      new Blob([new Uint8Array(input.image)], { type: input.contentType }),
      `image.${ext}`,
    );
    if (input.cropCode) form.append('crop_code', input.cropCode);
    form.append('top_k', String(input.topK ?? this.options.defaultTopK));

    const body = await this.request('/predict', { method: 'POST', body: form });
    return parsePredictResponse(body);
  }

  async getLabels(): Promise<string[]> {
    const body = await this.request('/labels', { method: 'GET' });
    // Dạng JSON của GET /labels chưa chốt với nhóm AI: tạm nhận mảng chuỗi.
    if (!Array.isArray(body) || !body.every((x) => typeof x === 'string')) {
      throw new AiServiceError(
        'invalid_response',
        'GET /labels không trả về mảng class_code',
      );
    }
    return body;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const url = `${this.options.baseUrl.replace(/\/+$/, '')}${path}`;
    let res: Response;
    try {
      res = await this.fetchFn(url, {
        ...init,
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new AiServiceError(
          'timeout',
          `AI service quá ${this.options.timeoutMs} ms`,
        );
      }
      throw new AiServiceError(
        'unavailable',
        `Không gọi được AI service: ${String(err)}`,
      );
    }
    if (res.status === 400 || res.status === 422) {
      throw new AiServiceError(
        'bad_request',
        `AI service từ chối yêu cầu (${res.status})`,
        res.status,
      );
    }
    if (!res.ok) {
      throw new AiServiceError(
        'unavailable',
        `AI service lỗi (${res.status})`,
        res.status,
      );
    }
    try {
      return await res.json();
    } catch {
      throw new AiServiceError(
        'invalid_response',
        'AI service trả về không phải JSON',
      );
    }
  }
}

/** Kiểm tra đúng hợp đồng `200 OK` của POST /predict và đổi sang camelCase. */
export function parsePredictResponse(body: unknown): AiPredictResult {
  const b = body as Record<string, unknown> | null;
  const invalid = (why: string) =>
    new AiServiceError('invalid_response', `POST /predict: ${why}`);
  if (!b || typeof b !== 'object') throw invalid('không phải object');
  if (typeof b.model_version !== 'string' || !b.model_version)
    throw invalid('thiếu model_version');
  if (typeof b.inference_ms !== 'number' || b.inference_ms < 0)
    throw invalid('inference_ms sai');
  if (!Array.isArray(b.predictions) || b.predictions.length === 0)
    throw invalid('thiếu predictions');

  const predictions: AiPrediction[] = b.predictions.map((p: unknown) => {
    const item = p as Record<string, unknown> | null;
    if (
      !item ||
      typeof item.class_code !== 'string' ||
      typeof item.probability !== 'number' ||
      item.probability < 0 ||
      item.probability > 1
    ) {
      throw invalid('phần tử predictions sai dạng');
    }
    return { classCode: item.class_code, probability: item.probability };
  });
  for (let i = 1; i < predictions.length; i++) {
    if (predictions[i].probability > predictions[i - 1].probability) {
      throw invalid('predictions chưa sắp giảm dần');
    }
  }
  return {
    modelVersion: b.model_version,
    inferenceMs: Math.round(b.inference_ms),
    predictions,
    ...(typeof b.heatmap_url === 'string' ? { heatmapUrl: b.heatmap_url } : {}),
  };
}

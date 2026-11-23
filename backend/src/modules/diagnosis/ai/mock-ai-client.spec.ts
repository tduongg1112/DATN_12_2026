import type { ActiveLabel } from '../../catalog/model-label.service.js';
import { AiServiceError } from './ai-client.js';
import { MOCK_UNKNOWN_CLASS_CODE, MockAiClient } from './mock-ai-client.js';

const LABELS: ActiveLabel[] = [
  { classCode: 'Tomato___healthy', cropCode: 'TOMATO' },
  { classCode: 'Tomato___Late_blight', cropCode: 'TOMATO' },
  { classCode: 'Tomato___Early_blight', cropCode: 'TOMATO' },
  { classCode: 'Potato___healthy', cropCode: 'POTATO' },
  { classCode: 'Potato___Late_blight', cropCode: 'POTATO' },
  { classCode: 'Rice___healthy', cropCode: 'RICE' },
];
const image = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]);
const input = {
  image,
  contentType: 'image/jpeg' as const,
  cropCode: 'TOMATO',
};

const client = (labels = LABELS, timeoutMs = 30) =>
  new MockAiClient(async () => labels, {
    timeoutMs,
    defaultTopK: 3,
    scenario: 'ok',
  });

async function errorOf(p: Promise<unknown>): Promise<AiServiceError> {
  const e = await p.catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AiServiceError);
  return e as AiServiceError;
}

describe('MockAiClient (TD-04)', () => {
  it('trả đúng top-k mặc định, xác suất giảm dần trong [0,1], 4 chữ số thập phân, tổng ≤ 1', async () => {
    const r = await client().predict(input);
    expect(r.modelVersion).toBe('mock-1');
    expect(r.inferenceMs).toBeGreaterThanOrEqual(0);
    expect(r.predictions).toHaveLength(3);
    const ps = r.predictions.map((p) => p.probability);
    expect([...ps].sort((a, b) => b - a)).toEqual(ps);
    for (const p of ps) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(Math.round(p * 10000) / 10000).toBe(p);
    }
    expect(ps.reduce((s, p) => s + p, 0)).toBeLessThanOrEqual(1);
    const codes = r.predictions.map((p) => p.classCode);
    expect(new Set(codes).size).toBe(3);
    codes.forEach((c) => expect(LABELS.map((l) => l.classCode)).toContain(c));
  });

  it('cùng một ảnh luôn cho cùng kết quả', async () => {
    const c = client();
    expect(await c.predict(input)).toEqual(await c.predict(input));
  });

  it('chỉ trả nhãn của loại cây đã chọn (OQ-05)', async () => {
    const r = await client().predict({ ...input, cropCode: 'POTATO', topK: 5 });
    expect(r.predictions).toHaveLength(2);
    r.predictions.forEach((p) =>
      expect(p.classCode.startsWith('Potato___')).toBe(true),
    );
  });

  it('loại cây không có nhãn nào: bad_request (như AI trả 422)', async () => {
    const e = await errorOf(client().predict({ ...input, cropCode: 'CORN' }));
    expect(e.kind).toBe('bad_request');
  });

  it('chưa có model_labels đang dùng: unavailable, có hướng dẫn chạy seed:dev', async () => {
    const e = await errorOf(client([]).predict(input));
    expect(e.kind).toBe('unavailable');
    expect(e.message).toContain('seed:dev');
  });

  it('kịch bản error: unavailable 503', async () => {
    const e = await errorOf(client().predict(input, 'error'));
    expect(e.kind).toBe('unavailable');
    expect(e.status).toBe(503);
  });

  it('kịch bản timeout: chờ đủ AI_TIMEOUT_MS rồi báo timeout', async () => {
    const start = Date.now();
    const e = await errorOf(client(LABELS, 40).predict(input, 'timeout'));
    expect(e.kind).toBe('timeout');
    expect(Date.now() - start).toBeGreaterThanOrEqual(35);
  });

  it('kịch bản invalid_image: bad_request 422', async () => {
    const e = await errorOf(client().predict(input, 'invalid_image'));
    expect(e).toMatchObject({ kind: 'bad_request', status: 422 });
  });

  it('kịch bản unknown_label: hạng 1 là class_code không có trong danh mục (OQ-26)', async () => {
    const r = await client().predict(input, 'unknown_label');
    expect(r.predictions[0].classCode).toBe(MOCK_UNKNOWN_CLASS_CODE);
  });

  it('kịch bản đặt qua cấu hình (AI_MOCK_SCENARIO) được dùng làm mặc định', async () => {
    const c = new MockAiClient(async () => LABELS, {
      timeoutMs: 10,
      defaultTopK: 3,
      scenario: 'error',
    });
    expect((await errorOf(c.predict(input))).kind).toBe('unavailable');
  });

  it('getLabels trả class_code của các nhãn đang dùng', async () => {
    expect(await client().getLabels()).toEqual(LABELS.map((l) => l.classCode));
  });
});

import { AiServiceError } from './ai-client.js';
import { HttpAiClient } from './http-ai-client.js';

const input = {
  image: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  contentType: 'image/png' as const,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function make(fetchFn: typeof fetch, timeoutMs = 1000) {
  return new HttpAiClient(
    { baseUrl: 'http://ai.local:8000/', timeoutMs, defaultTopK: 3 },
    fetchFn,
  );
}

async function kindOf(p: Promise<unknown>) {
  const e = await p.catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AiServiceError);
  return (e as AiServiceError).kind;
}

describe('HttpAiClient (hợp đồng technical_overview mục 5)', () => {
  it('POST /predict multipart: image, crop_code, top_k; đổi kết quả sang camelCase', async () => {
    const fetchFn = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        json({
          model_version: 'v1.2',
          inference_ms: 87,
          predictions: [
            { class_code: 'Tomato___Late_blight', probability: 0.91 },
            { class_code: 'Tomato___healthy', probability: 0.05 },
          ],
        }),
    );
    const r = await make(fetchFn as typeof fetch).predict({
      ...input,
      cropCode: 'TOMATO',
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://ai.local:8000/predict');
    expect(init?.method).toBe('POST');
    const form = init?.body as FormData;
    expect(form.get('crop_code')).toBe('TOMATO');
    expect(form.get('top_k')).toBe('3');
    expect((form.get('image') as File).type).toBe('image/png');
    expect(r).toEqual({
      modelVersion: 'v1.2',
      inferenceMs: 87,
      predictions: [
        { classCode: 'Tomato___Late_blight', probability: 0.91 },
        { classCode: 'Tomato___healthy', probability: 0.05 },
      ],
    });
  });

  it('không chọn loại cây thì không gửi crop_code', async () => {
    const fetchFn = vi.fn(
      async (_u: string | URL | Request, _i?: RequestInit) =>
        json({
          model_version: 'v',
          inference_ms: 1,
          predictions: [{ class_code: 'a', probability: 1 }],
        }),
    );
    await make(fetchFn as typeof fetch).predict(input);
    const form = fetchFn.mock.calls[0][1]!.body as FormData;
    expect(form.has('crop_code')).toBe(false);
  });

  it.each([
    [400, 'bad_request'],
    [422, 'bad_request'],
    [503, 'unavailable'],
    [500, 'unavailable'],
  ])('HTTP %i → %s', async (status, kind) => {
    const fetchFn = (async () => json({}, status)) as typeof fetch;
    expect(await kindOf(make(fetchFn).predict(input))).toBe(kind);
  });

  it('quá thời gian chờ → timeout', async () => {
    const fetchFn = ((_u: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener('abort', () => reject(signal.reason));
      })) as typeof fetch;
    expect(await kindOf(make(fetchFn, 30).predict(input))).toBe('timeout');
  });

  it('lỗi mạng → unavailable', async () => {
    const fetchFn = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    expect(await kindOf(make(fetchFn).predict(input))).toBe('unavailable');
  });

  it('dữ liệu sai hợp đồng (chưa sắp giảm dần, thiếu model_version) → invalid_response', async () => {
    const unsorted = (async () =>
      json({
        model_version: 'v',
        inference_ms: 1,
        predictions: [
          { class_code: 'a', probability: 0.2 },
          { class_code: 'b', probability: 0.7 },
        ],
      })) as typeof fetch;
    expect(await kindOf(make(unsorted).predict(input))).toBe(
      'invalid_response',
    );
    const noVersion = (async () =>
      json({
        inference_ms: 1,
        predictions: [{ class_code: 'a', probability: 1 }],
      })) as typeof fetch;
    expect(await kindOf(make(noVersion).predict(input))).toBe(
      'invalid_response',
    );
  });
});

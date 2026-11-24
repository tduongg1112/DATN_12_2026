import { AppException } from '../../../common/exceptions/app.exception.js';
import type { ModelLabelService } from '../../catalog/model-label.service.js';
import { AiClient, AiServiceError } from '../ai/ai-client.js';
import { ModelLabelsAdminService } from './model-labels.service.js';

class StubAi extends AiClient {
  constructor(private readonly labels: () => Promise<string[]>) {
    super();
  }
  predict(): never {
    throw new Error('không dùng');
  }
  getLabels(): Promise<string[]> {
    return this.labels();
  }
}

function setup(labels: () => Promise<string[]>) {
  const catalog = {
    modelMapping: vi.fn().mockResolvedValue({ items: [], stale: [] }),
    deactivateMissing: vi.fn().mockResolvedValue(2),
  };
  const service = new ModelLabelsAdminService(
    new StubAi(labels),
    catalog as unknown as ModelLabelService,
  );
  return { service, catalog };
}

async function errorOf(p: Promise<unknown>) {
  const e = await p.catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AppException);
  return (e as AppException).getResponse() as {
    statusCode: number;
    code: string;
    message: string;
  };
}

describe('ModelLabelsAdminService (catalog M1, M2; TD-31 A)', () => {
  it('M1 đối chiếu đúng danh sách AI trả về', async () => {
    const { service, catalog } = setup(() => Promise.resolve(['B', 'A']));
    await service.overview();
    expect(catalog.modelMapping).toHaveBeenCalledWith(['B', 'A']);
  });

  it('M2 tắt nhãn không còn trong mô hình, trả số nhãn đã tắt', async () => {
    const { service, catalog } = setup(() => Promise.resolve(['A']));
    expect(await service.sync()).toEqual({ deactivated: 2 });
    expect(catalog.deactivateMissing).toHaveBeenCalledWith(['A']);
  });

  it('AI lỗi: 503 AI_LABELS_UNAVAILABLE, không ghi gì', async () => {
    const { service, catalog } = setup(() =>
      Promise.reject(new AiServiceError('timeout', 'quá giờ')),
    );
    const body = await errorOf(service.sync());
    expect(body).toMatchObject({
      statusCode: 503,
      code: 'AI_LABELS_UNAVAILABLE',
      message:
        'Không lấy được danh sách nhãn của mô hình. Vui lòng thử lại sau.',
    });
    expect(catalog.deactivateMissing).not.toHaveBeenCalled();
  });

  it('AI trả danh sách rỗng: coi như lỗi, không tắt hết nhãn', async () => {
    const { service, catalog } = setup(() => Promise.resolve([]));
    expect((await errorOf(service.sync())).code).toBe('AI_LABELS_UNAVAILABLE');
    expect(catalog.deactivateMissing).not.toHaveBeenCalled();
  });

  it('lỗi không phải của AI thì ném nguyên', async () => {
    const { service } = setup(() => Promise.reject(new Error('bug')));
    await expect(service.overview()).rejects.toThrow('bug');
  });
});

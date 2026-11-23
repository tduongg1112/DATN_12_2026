import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { StorageService } from '../../common/storage/storage.service.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { CropService } from '../catalog/crop.service.js';
import type { ModelLabelService } from '../catalog/model-label.service.js';
import type { NotificationsService } from '../plants/notifications.service.js';
import { AiServiceError, type AiClient } from './ai/ai-client.js';
import { DiagnosisService } from './diagnosis.service.js';
import type { DiagnosisPrediction } from './entities/diagnosis-prediction.entity.js';
import type { Diagnosis } from './entities/diagnosis.entity.js';

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9]);
const files = {
  original: [{ buffer: JPG, size: JPG.length }],
  processed: [{ buffer: PNG, size: PNG.length }],
};
const CROP = { id: 3, code: 'TOMATO', name: 'Cà chua', careGuide: null };

function setup() {
  const failedUpdate = { execute: vi.fn().mockResolvedValue({ affected: 1 }) };
  const qb = {
    update: () => qb,
    set: vi.fn(() => qb),
    where: () => failedUpdate,
  };
  const diagnoses = {
    create: vi.fn((v: unknown) => v),
    save: vi.fn().mockResolvedValue({ id: 15 }),
    createQueryBuilder: vi.fn(() => qb),
    manager: { transaction: vi.fn() },
  };
  const crops = { findActive: vi.fn().mockResolvedValue(CROP) };
  const labels = { findActiveByCodes: vi.fn().mockResolvedValue([]) };
  const notifications = { notifyAdminsOnce: vi.fn().mockResolvedValue(1) };
  const ai = { predict: vi.fn() };
  let n = 0;
  const storage = {
    saveImage: vi.fn(async () => ({ key: `diagnoses/k${++n}.jpg` })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const env: Partial<EnvironmentVariables> = {
    STORAGE_MAX_BYTES: 10 * 1024 * 1024,
    AI_CONFIDENCE_THRESHOLD: 0.6,
    AI_TOP_K: 3,
  };
  const config = {
    get: (k: keyof EnvironmentVariables) => env[k],
  } as unknown as ConfigService<EnvironmentVariables, true>;
  const service = new DiagnosisService(
    diagnoses as unknown as Repository<Diagnosis>,
    {} as Repository<DiagnosisPrediction>,
    crops as unknown as CropService,
    labels as unknown as ModelLabelService,
    notifications as unknown as NotificationsService,
    ai as unknown as AiClient,
    storage as unknown as StorageService,
    config,
  );
  return { service, diagnoses, crops, labels, notifications, ai, storage, qb };
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  const e = await p.catch((err: unknown) => err);
  expect(e).toBeInstanceOf(AppException);
  return (e as AppException).code;
}

describe('DiagnosisService.create (D1)', () => {
  it('loại cây không hợp lệ: 400 CROP_NOT_FOUND, chưa lưu ảnh, chưa gọi AI', async () => {
    const s = setup();
    s.crops.findActive.mockResolvedValue(null);
    expect(await codeOf(s.service.create(1, { cropId: 9 }, files))).toBe(
      'CROP_NOT_FOUND',
    );
    expect(s.storage.saveImage).not.toHaveBeenCalled();
    expect(s.ai.predict).not.toHaveBeenCalled();
  });

  it('ảnh đã chỉnh không phải JPG/PNG: 400, chưa lưu ảnh gốc', async () => {
    const s = setup();
    const bad = {
      ...files,
      processed: [{ buffer: Buffer.from('GIF89a'), size: 6 }],
    };
    expect(await codeOf(s.service.create(1, { cropId: 3 }, bad))).toBe(
      'INVALID_IMAGE_TYPE',
    );
    expect(s.storage.saveImage).not.toHaveBeenCalled();
  });

  it('lưu ảnh thứ hai lỗi: xoá ảnh thứ nhất, không ghi lượt', async () => {
    const s = setup();
    s.storage.saveImage
      .mockResolvedValueOnce({ key: 'diagnoses/a.jpg' })
      .mockRejectedValueOnce(new Error('disk full'));
    await expect(s.service.create(1, { cropId: 3 }, files)).rejects.toThrow(
      'disk full',
    );
    expect(s.storage.delete).toHaveBeenCalledWith('diagnoses/a.jpg');
    expect(s.diagnoses.save).not.toHaveBeenCalled();
  });

  it('ghi lượt PROCESSING lỗi: xoá cả hai ảnh vừa lưu, không gọi AI', async () => {
    const s = setup();
    s.diagnoses.save.mockRejectedValue(new Error('db down'));
    await expect(s.service.create(1, { cropId: 3 }, files)).rejects.toThrow(
      'db down',
    );
    expect(s.storage.delete.mock.calls).toEqual([
      ['diagnoses/k1.jpg'],
      ['diagnoses/k2.jpg'],
    ]);
    expect(s.ai.predict).not.toHaveBeenCalled();
  });

  it('gửi AI ảnh đã chỉnh, mã loại cây đã chọn và top_k (OQ-05)', async () => {
    const s = setup();
    s.ai.predict.mockRejectedValue(new AiServiceError('timeout', 'x'));
    await s.service.create(1, { cropId: 3 }, files).catch(() => undefined);
    expect(s.ai.predict).toHaveBeenCalledWith({
      image: PNG,
      contentType: 'image/png',
      cropCode: 'TOMATO',
      topK: 3,
    });
    expect(s.diagnoses.create).toHaveBeenCalledWith({
      userId: 1,
      cropId: 3,
      originalImageUrl: 'diagnoses/k1.jpg',
      processedImageUrl: 'diagnoses/k2.jpg',
      status: 'PROCESSING',
    });
  });

  it('AI lỗi: chuyển FAILED (chỉ khi còn PROCESSING) rồi trả 503', async () => {
    const s = setup();
    s.ai.predict.mockRejectedValue(new AiServiceError('unavailable', 'x'));
    expect(await codeOf(s.service.create(1, { cropId: 3 }, files))).toBe(
      'AI_UNAVAILABLE',
    );
    expect(s.qb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('nhãn lạ: báo ADMIN cho từng class_code lạ; gửi thông báo lỗi vẫn trả 503', async () => {
    const s = setup();
    s.ai.predict.mockResolvedValue({
      modelVersion: 'v',
      inferenceMs: 5,
      predictions: [
        { classCode: 'Lạ_1', probability: 0.7 },
        { classCode: 'Tomato___healthy', probability: 0.2 },
        { classCode: 'Lạ_2', probability: 0.1 },
      ],
    });
    s.labels.findActiveByCodes.mockResolvedValue([
      {
        id: 1,
        classCode: 'Tomato___healthy',
        labelType: 'HEALTHY',
        diseaseId: null,
      },
    ]);
    s.notifications.notifyAdminsOnce.mockRejectedValue(new Error('db'));
    expect(await codeOf(s.service.create(1, { cropId: 3 }, files))).toBe(
      'AI_UNAVAILABLE',
    );
    const contents = s.notifications.notifyAdminsOnce.mock.calls.map(
      (c) => c[1] as string,
    );
    expect(contents).toHaveLength(2);
    expect(contents[0]).toContain('Lạ_1');
    expect(contents[1]).toContain('Lạ_2');
    expect(s.diagnoses.manager.transaction).not.toHaveBeenCalled();
  });

  it('ghi kết quả lỗi: chuyển FAILED, trả 503', async () => {
    const s = setup();
    s.ai.predict.mockResolvedValue({
      modelVersion: 'v',
      inferenceMs: 5,
      predictions: [{ classCode: 'Tomato___healthy', probability: 0.9 }],
    });
    s.labels.findActiveByCodes.mockResolvedValue([
      {
        id: 1,
        classCode: 'Tomato___healthy',
        labelType: 'HEALTHY',
        diseaseId: null,
      },
    ]);
    s.diagnoses.manager.transaction.mockRejectedValue(new Error('deadlock'));
    expect(await codeOf(s.service.create(1, { cropId: 3 }, files))).toBe(
      'AI_UNAVAILABLE',
    );
    expect(s.qb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED' }),
    );
  });
});

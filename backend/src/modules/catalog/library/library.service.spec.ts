import type { Repository } from 'typeorm';
import { AppException } from '../../../common/exceptions/app.exception.js';
import type { StorageService } from '../../../common/storage/storage.service.js';
import type { Crop } from '../entities/crop.entity.js';
import type { DiseaseImage } from '../entities/disease-image.entity.js';
import type { Disease } from '../entities/disease.entity.js';
import type { DiseaseTrendsQuery } from './disease-trends.query.js';
import { diseaseNotFound, LibraryService } from './library.service.js';

describe('diseaseNotFound (L3, BR-01)', () => {
  it('404 DISEASE_NOT_FOUND với câu dự phòng OQ-29', () => {
    const e = diseaseNotFound();
    expect(e).toBeInstanceOf(AppException);
    expect(e.getStatus()).toBe(404);
    expect(e.getResponse()).toEqual({
      statusCode: 404,
      code: 'DISEASE_NOT_FOUND',
      message: 'Không tìm thấy dữ liệu',
    });
  });
});

describe('LibraryService', () => {
  function setup() {
    const crops = { find: vi.fn() };
    const diseases = { findOne: vi.fn() };
    const images = { find: vi.fn() };
    const trends = { trendingDiseaseIds: vi.fn().mockResolvedValue([]) };
    const storage = {
      resolveUrl: vi.fn(async (v: string | null) =>
        v ? `http://cdn.test/${v}` : null,
      ),
    };
    const service = new LibraryService(
      crops as unknown as Repository<Crop>,
      diseases as unknown as Repository<Disease>,
      images as unknown as Repository<DiseaseImage>,
      trends as unknown as DiseaseTrendsQuery,
      storage as unknown as StorageService,
    );
    return { service, crops, diseases, images };
  }

  it('L1: chỉ loại cây ACTIVE, sắp theo id, chỉ trả id, code, name (BR-05)', async () => {
    const { service, crops } = setup();
    crops.find.mockResolvedValue([
      { id: 1, code: 'RICE', name: 'Lúa', careGuide: 'không trả' },
    ]);
    await expect(service.listCrops()).resolves.toEqual([
      { id: 1, code: 'RICE', name: 'Lúa' },
    ]);
    expect(crops.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        order: { id: 'ASC' },
      }),
    );
  });

  it('L3: chỉ tìm bệnh PUBLISHED có loại cây ACTIVE; không có thì 404', async () => {
    const { service, diseases } = setup();
    diseases.findOne.mockResolvedValue(null);
    await expect(service.getDisease(5)).rejects.toMatchObject({
      status: 404,
    });
    expect(diseases.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5, status: 'PUBLISHED', crop: { status: 'ACTIVE' } },
      }),
    );
  });
});

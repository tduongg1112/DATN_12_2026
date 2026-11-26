import { AiServiceError } from './ai/ai-client.js';
import {
  aiErrorToException,
  cropNotFound,
  diagnosisNotFound,
  missingImage,
} from './diagnosis-errors.js';

const MSG = {
  BUSY: 'Hệ thống đang bận, vui lòng thử lại sau',
  REJECTED: 'Ảnh chưa phân tích được. Hãy chụp lại một lá rõ nét, đủ sáng.',
};

describe('aiErrorToException (BR-10, api_diagnosis "Tích hợp AI service")', () => {
  it.each(['timeout', 'unavailable', 'invalid_response'] as const)(
    'AI lỗi %s → 503 AI_UNAVAILABLE',
    (kind) => {
      const e = aiErrorToException(new AiServiceError(kind, 'x'));
      expect(e.getStatus()).toBe(503);
      expect(e.getResponse()).toEqual({
        statusCode: 503,
        code: 'AI_UNAVAILABLE',
        message: MSG.BUSY,
      });
    },
  );

  it('AI từ chối ảnh (bad_request) → 422 AI_IMAGE_REJECTED', () => {
    const e = aiErrorToException(new AiServiceError('bad_request', 'x', 422));
    expect(e.getResponse()).toEqual({
      statusCode: 422,
      code: 'AI_IMAGE_REJECTED',
      message: MSG.REJECTED,
    });
  });

  it('lỗi lạ không phải AiServiceError → 503, không lộ chi tiết', () => {
    const e = aiErrorToException(new Error('ECONNRESET 10.0.0.1'));
    expect(e.getResponse()).toEqual({
      statusCode: 503,
      code: 'AI_UNAVAILABLE',
      message: MSG.BUSY,
    });
  });
});

describe('lỗi nghiệp vụ D1, D2', () => {
  it('CROP_NOT_FOUND 400 kèm lỗi trường cropId (BR-07, OQ-05)', () => {
    expect(cropNotFound().getResponse()).toEqual({
      statusCode: 400,
      code: 'CROP_NOT_FOUND',
      message: 'Vui lòng chọn loại cây',
      errors: [{ field: 'cropId', message: 'Vui lòng chọn loại cây' }],
    });
  });

  it('thiếu ảnh: 400 INVALID_IMAGE_TYPE với câu BR-04', () => {
    expect(missingImage().getResponse()).toEqual({
      statusCode: 400,
      code: 'INVALID_IMAGE_TYPE',
      message: 'Chỉ hỗ trợ ảnh JPG, PNG, dung lượng tối đa 10 MB',
    });
  });

  it('DIAGNOSIS_NOT_FOUND 404 với câu OQ-29', () => {
    expect(diagnosisNotFound().getResponse()).toEqual({
      statusCode: 404,
      code: 'DIAGNOSIS_NOT_FOUND',
      message: 'Không tìm thấy dữ liệu',
    });
  });
});

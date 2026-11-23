import {
  classifyResult,
  roundProbability,
  unknownLabelNotice,
} from './diagnosis-result.js';

/** Ngưỡng riêng của test (testing-rules mục 3), trùng giá trị tạm khi dev. */
const THRESHOLD = 0.6;

describe('classifyResult (BR-12, Bảng 4.4)', () => {
  it.each([
    [0.5999, 'DISEASE', 'UNCERTAIN'],
    [0.6, 'DISEASE', 'DISEASE'],
    [0.6001, 'DISEASE', 'DISEASE'],
    [0.5999, 'HEALTHY', 'UNCERTAIN'],
    [0.6, 'HEALTHY', 'HEALTHY'],
    [0.95, 'HEALTHY', 'HEALTHY'],
  ] as const)(
    'xác suất %s, nhãn %s → %s (bằng ngưỡng thì không UNCERTAIN)',
    (probability, labelType, expected) => {
      expect(classifyResult({ probability, labelType }, THRESHOLD)).toBe(
        expected,
      );
    },
  );

  it('ngưỡng 0 thì không bao giờ UNCERTAIN; ngưỡng 1 thì chỉ xác suất 1 mới kết luận', () => {
    expect(classifyResult({ probability: 0, labelType: 'DISEASE' }, 0)).toBe(
      'DISEASE',
    );
    expect(
      classifyResult({ probability: 0.9999, labelType: 'DISEASE' }, 1),
    ).toBe('UNCERTAIN');
    expect(classifyResult({ probability: 1, labelType: 'HEALTHY' }, 1)).toBe(
      'HEALTHY',
    );
  });
});

describe('roundProbability (DECIMAL(5,4))', () => {
  it('làm tròn 4 chữ số; giá trị sát ngưỡng làm tròn trước khi so ngưỡng', () => {
    expect(roundProbability(0.91234)).toBe(0.9123);
    expect(roundProbability(0.59996)).toBe(0.6);
    expect(roundProbability(0.59994)).toBe(0.5999);
    expect(roundProbability(1)).toBe(1);
    expect(roundProbability(0)).toBe(0);
  });
});

describe('unknownLabelNotice (BR-11, OQ-26, OQ-40)', () => {
  it('đúng câu đã duyệt, có class_code', () => {
    expect(unknownLabelNotice('Tomato___Leaf_Mold')).toEqual({
      title: 'Nhãn mô hình chưa có trong danh mục',
      content:
        'Mô hình trả về nhãn Tomato___Leaf_Mold nhưng danh mục chưa có nhãn này. Lượt chẩn đoán đã bị dừng. Vui lòng cập nhật ánh xạ nhãn.',
    });
  });

  it('class_code rất dài vẫn vừa cột content (500 ký tự)', () => {
    const notice = unknownLabelNotice('x'.repeat(2000));
    expect(notice.content.length).toBeLessThanOrEqual(500);
    expect(notice.title.length).toBeLessThanOrEqual(150);
  });
});

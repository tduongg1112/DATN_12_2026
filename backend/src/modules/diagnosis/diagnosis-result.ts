import type { LabelType } from '../catalog/entities/model-label.entity.js';
import type { ResultType } from './entities/diagnosis.entity.js';

/**
 * Làm tròn xác suất về 4 chữ số thập phân, đúng độ chính xác của cột
 * `diagnosis_predictions.probability` (DECIMAL(5,4)). Dạng kết quả tính trên giá trị đã
 * làm tròn, để giá trị lưu và dạng kết quả luôn khớp nhau.
 */
export function roundProbability(probability: number): number {
  return Math.round(probability * 10000) / 10000;
}

/**
 * Dạng kết quả từ dự đoán hạng 1 (BR-12, Bảng 4.4):
 * 1. xác suất < ngưỡng → UNCERTAIN (bằng ngưỡng thì không);
 * 2. nhãn HEALTHY → HEALTHY;
 * 3. còn lại → DISEASE.
 */
export function classifyResult(
  top: { probability: number; labelType: LabelType },
  threshold: number,
): ResultType {
  if (top.probability < threshold) return 'UNCERTAIN';
  return top.labelType === 'HEALTHY' ? 'HEALTHY' : 'DISEASE';
}

/** Độ dài tối đa của `class_code` đưa vào nội dung thông báo (`notifications.content` 500 ký tự). */
const NOTICE_CODE_MAX_LENGTH = 300;

/** ✎ Thông báo cho ADMIN khi AI trả nhãn chưa có trong danh mục (BR-11, OQ-26, OQ-40). */
export function unknownLabelNotice(classCode: string): {
  title: string;
  content: string;
} {
  const code = classCode.slice(0, NOTICE_CODE_MAX_LENGTH);
  return {
    title: 'Nhãn mô hình chưa có trong danh mục',
    content: `Mô hình trả về nhãn ${code} nhưng danh mục chưa có nhãn này. Lượt chẩn đoán đã bị dừng. Vui lòng cập nhật ánh xạ nhãn.`,
  };
}

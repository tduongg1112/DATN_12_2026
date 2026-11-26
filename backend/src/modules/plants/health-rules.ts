import type { HealthStatus } from './entities/plant.entity.js';

/** Tình trạng người dùng tự cập nhật (C4 UC04 9b). */
export type ManualStatus = 'TREATING' | 'RECOVERED';

/** Dạng kết quả chẩn đoán (trùng `diagnoses.result_type`, khai báo lại để `plants` không import `diagnosis`). */
export type DiagnosisResultType = 'DISEASE' | 'HEALTHY' | 'UNCERTAIN';

/**
 * Tình trạng mới khi áp kết quả chẩn đoán vào cây (Bảng 4.8; diagnosis BR-25):
 * `DISEASE` → `DISEASED`, `HEALTHY` → `HEALTHY`, `UNCERTAIN` → không đổi (`null`).
 */
export function healthFromResult(
  resultType: DiagnosisResultType,
): HealthStatus | null {
  if (resultType === 'DISEASE') return 'DISEASED';
  if (resultType === 'HEALTHY') return 'HEALTHY';
  return null;
}

/**
 * OQ-47 (chốt 23/11): "Đang điều trị" từ "Đang có bệnh"; "Đã khỏi" từ "Đang có bệnh",
 * "Đang điều trị", "Khoẻ mạnh" (để xác nhận gợi ý "Đã khỏi" sau lần chẩn đoán khoẻ).
 */
const ALLOWED_FROM: Record<ManualStatus, readonly HealthStatus[]> = {
  TREATING: ['DISEASED'],
  RECOVERED: ['DISEASED', 'TREATING', 'HEALTHY'],
};

export function canChangeStatus(
  current: HealthStatus,
  target: ManualStatus,
): boolean {
  return ALLOWED_FROM[target].includes(current);
}

/** Các lựa chọn của "Cập nhật tình trạng" cho tình trạng hiện tại; rỗng thì ẩn nút. */
export function allowedStatusChanges(current: HealthStatus): ManualStatus[] {
  return (['TREATING', 'RECOVERED'] as const).filter((target) =>
    canChangeStatus(current, target),
  );
}

/**
 * Bảng 4.8: cây đang có bệnh (hoặc đang điều trị) được chẩn đoán lại ra "Cây khoẻ mạnh"
 * thì hệ thống gợi ý "Đã khỏi", người dùng xác nhận (OQ-48).
 */
export function shouldSuggestRecovered(
  before: HealthStatus,
  resultType: DiagnosisResultType,
): boolean {
  return (
    resultType === 'HEALTHY' && (before === 'DISEASED' || before === 'TREATING')
  );
}

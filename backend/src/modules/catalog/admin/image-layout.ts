import { VALIDATION_ERROR } from '../../../common/exceptions/default-errors.js';
import { CATALOG_MESSAGES as M, fieldErrors } from './catalog-messages.js';

/** OQ-60 (chốt 25/11): tối đa 10 ảnh minh hoạ mỗi bệnh. */
export const MAX_DISEASE_IMAGES = 10;
export const CAPTION_MAX = 255;

/** Một ảnh trong danh sách cuối cùng, theo thứ tự hiển thị (phần tử đầu là ảnh bìa). */
export type LayoutEntry =
  | { kind: 'upload'; index: number; caption: string | null }
  | { kind: 'existing'; id: number; caption: string | null };

const invalid = () =>
  fieldErrors([{ field: 'imageLayout', message: VALIDATION_ERROR.message }]);

/**
 * Đọc trường `imageLayout` của B3, B4 (TD-32, chốt 25/11). `raw` là chuỗi JSON: mảng
 * `{ upload: n, caption? }` hoặc `{ id, caption? }` theo thứ tự hiển thị.
 *
 * - Không gửi: B3 chỉ hợp lệ khi không có ảnh (trả `[]`); B4 trả `null` = giữ nguyên ảnh cũ
 *   (khi đó cũng không được gửi ảnh mới).
 * - Mỗi tệp tải lên xuất hiện đúng một lần; `id` phải là ảnh hiện có của bệnh, không trùng.
 * - Quá `MAX_DISEASE_IMAGES` phần tử: lỗi trường `images`.
 */
export function parseImageLayout(
  raw: string | undefined,
  uploadCount: number,
  existingIds: readonly number[] | null,
): LayoutEntry[] | null {
  if (raw === undefined || raw.trim() === '') {
    if (uploadCount > 0) throw invalid();
    return existingIds === null ? [] : null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalid();
  }
  if (!Array.isArray(parsed)) throw invalid();
  if (parsed.length > MAX_DISEASE_IMAGES) {
    throw fieldErrors([{ field: 'images', message: M.TOO_MANY_IMAGES }]);
  }

  const usedUploads = new Set<number>();
  const usedIds = new Set<number>();
  const entries = parsed.map((item: unknown, i): LayoutEntry => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw invalid();
    }
    const { upload, id, caption } = item as Record<string, unknown>;
    const text = readCaption(caption, i);

    if (upload !== undefined && id === undefined) {
      if (
        !Number.isInteger(upload) ||
        (upload as number) < 0 ||
        (upload as number) >= uploadCount ||
        usedUploads.has(upload as number)
      ) {
        throw invalid();
      }
      usedUploads.add(upload as number);
      return { kind: 'upload', index: upload as number, caption: text };
    }
    if (id !== undefined && upload === undefined && existingIds !== null) {
      if (
        !Number.isInteger(id) ||
        !existingIds.includes(id as number) ||
        usedIds.has(id as number)
      ) {
        throw invalid();
      }
      usedIds.add(id as number);
      return { kind: 'existing', id: id as number, caption: text };
    }
    throw invalid();
  });

  if (usedUploads.size !== uploadCount) throw invalid();
  return entries;
}

function readCaption(value: unknown, index: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw invalid();
  const text = value.trim();
  if (text.length > CAPTION_MAX) {
    throw fieldErrors([
      { field: `imageLayout.${index}.caption`, message: M.CAPTION_TOO_LONG },
    ]);
  }
  return text === '' ? null : text;
}

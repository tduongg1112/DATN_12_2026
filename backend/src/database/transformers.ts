import type { ValueTransformer } from 'typeorm';

/**
 * DECIMAL/NUMERIC: pg trả về chuỗi. Đổi sang number khi đọc.
 * BIGINT không cần transformer: data source bật `parseInt8` (database-rules.md mục 3).
 */
export const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

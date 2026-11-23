import { InitSchema1795219200000 } from './1795219200000-init-schema.js';
import { DiagnosesCropRequired1795392000000 } from './1795392000000-diagnoses-crop-required.js';

/** Liệt kê tường minh để chạy được cả từ dist/ (ESM) lẫn trong test. */
export const MIGRATIONS = [
  InitSchema1795219200000,
  DiagnosesCropRequired1795392000000,
];

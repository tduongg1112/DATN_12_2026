import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VALIDATION_ERROR } from '../../../../common/exceptions/default-errors.js';
import type { PathogenGroup, Severity } from '../../entities/disease.entity.js';

/*
 * DTO của docs/disease_library/api_disease_library.md (L1 → L3).
 * Tham số do giao diện tạo, nên lỗi từng trường dùng câu dự phòng "Dữ liệu không hợp lệ"
 * (OQ-29), không có câu riêng.
 */
const INVALID = { message: VALIDATION_ERROR.message };

/** OQ-37: "Xem tất cả" 20 thẻ mỗi trang, tối đa 50; ô tìm tối đa 100 ký tự. */
export const LIBRARY_PAGE_SIZE_DEFAULT = 20;
export const LIBRARY_PAGE_SIZE_MAX = 50;
export const LIBRARY_QUERY_MAX_LENGTH = 100;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** L2. GET /diseases (BR-05; phân trang TD-05). */
export class ListDiseasesQuery {
  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  cropId?: number;

  /** Tìm trong tên bệnh. Rỗng sau khi trim thì coi như không tìm. */
  @IsOptional()
  @MaxLength(LIBRARY_QUERY_MAX_LENGTH, INVALID)
  @IsString(INVALID)
  @Transform(trimString)
  q?: string;

  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Max(LIBRARY_PAGE_SIZE_MAX, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  pageSize: number = LIBRARY_PAGE_SIZE_DEFAULT;
}

/** L3. GET /diseases/:id */
export class DiseaseIdParam {
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  id: number;
}

/** L1 và trường `crop` của thẻ bệnh. */
export interface CropSummary {
  id: number;
  code: string;
  name: string;
}

/** Thẻ tin bệnh (L2, `related` của L3). */
export interface DiseaseCard {
  id: number;
  name: string;
  crop: CropSummary;
  severity: Severity;
  summary: string | null;
  coverImageUrl: string | null;
  /** Thuộc nhóm "Đang phổ biến" (BR-04). */
  trending: boolean;
}

export interface DiseaseImageView {
  url: string;
  caption: string | null;
}

/** L3. Không có nguồn tham khảo (DC-04), `recheck_days`, `is_featured`, `status`. */
export interface DiseaseDetail {
  id: number;
  name: string;
  pathogen: string | null;
  pathogenGroup: PathogenGroup;
  crop: CropSummary;
  severity: Severity;
  summary: string | null;
  symptoms: string | null;
  causes: string | null;
  prevention: string | null;
  treatment: string | null;
  images: DiseaseImageView[];
  related: DiseaseCard[];
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

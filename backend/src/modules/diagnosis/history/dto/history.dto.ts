import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { VALIDATION_ERROR } from '../../../../common/exceptions/default-errors.js';
import type { Severity } from '../../../catalog/entities/disease.entity.js';
import {
  RESULT_TYPES,
  type ResultType,
} from '../../entities/diagnosis.entity.js';

/*
 * DTO của docs/history/api_history.md (H1 → H3). Tham số do giao diện tạo, nên lỗi từng
 * trường dùng câu dự phòng "Dữ liệu không hợp lệ" (OQ-29), như `disease_library`.
 */
const INVALID = { message: VALIDATION_ERROR.message };

/** Cùng quy ước "Xem thêm" của thư viện (OQ-37). */
export const HISTORY_PAGE_SIZE_DEFAULT = 20;
export const HISTORY_PAGE_SIZE_MAX = 50;
export const HISTORY_QUERY_MAX_LENGTH = 100;
/** TD-27: tối đa 100 lượt mỗi lần xoá hoặc hoàn tác. */
export const HISTORY_IDS_MAX = 100;

/** Ngày giờ ISO 8601 có múi giờ (OQ-42: giao diện tự tính theo giờ máy). */
const ISO_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** `to` không được trước `from` (bằng nhau thì hợp lệ, cho kết quả rỗng). */
@ValidatorConstraint({ name: 'notBeforeFrom' })
class NotBeforeFrom implements ValidatorConstraintInterface {
  validate(to: unknown, args: ValidationArguments): boolean {
    const from = (args.object as ListHistoryQuery).from;
    if (typeof from !== 'string' || typeof to !== 'string') return true;
    const start = Date.parse(from);
    const end = Date.parse(to);
    return Number.isNaN(start) || Number.isNaN(end) || start <= end;
  }
}

/** H1. GET /diagnoses (BR-01, BR-03; phân trang TD-05). */
export class ListHistoryQuery {
  /** Tìm trong tên bệnh hạng 1 của lượt `DISEASE` (OQ-43). Rỗng sau khi trim thì bỏ qua. */
  @IsOptional()
  @MaxLength(HISTORY_QUERY_MAX_LENGTH, INVALID)
  @IsString(INVALID)
  @Transform(trimString)
  q?: string;

  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  cropId?: number;

  @IsOptional()
  @IsIn(RESULT_TYPES, INVALID)
  resultType?: ResultType;

  /** `created_at >= from`. */
  @IsOptional()
  @Matches(ISO_WITH_ZONE, INVALID)
  @IsISO8601({ strict: true }, INVALID)
  from?: string;

  /** `created_at < to` (giao diện gửi 00:00 của ngày sau ngày kết thúc). */
  @IsOptional()
  @Validate(NotBeforeFrom, INVALID)
  @Matches(ISO_WITH_ZONE, INVALID)
  @IsISO8601({ strict: true }, INVALID)
  to?: string;

  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Max(HISTORY_PAGE_SIZE_MAX, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  pageSize: number = HISTORY_PAGE_SIZE_DEFAULT;
}

/** H2, H3. Body `{ ids }` (TD-27). Id trùng được gộp ở service. */
export class DiagnosisIdsDto {
  @Max(Number.MAX_SAFE_INTEGER, { ...INVALID, each: true })
  @Min(1, { ...INVALID, each: true })
  @IsInt({ ...INVALID, each: true })
  @ArrayMaxSize(HISTORY_IDS_MAX, INVALID)
  @ArrayMinSize(1, INVALID)
  @IsArray(INVALID)
  ids: number[];
}

/** Một lượt ở danh sách (Bảng 4.6 cột DS). */
export interface HistoryItem {
  id: number;
  resultType: ResultType;
  createdAt: Date;
  /** Ảnh đã chỉnh. */
  thumbnailUrl: string | null;
  crop: { id: number; code: string; name: string };
  /** Cây đã gắn; `null` khi chưa gắn. */
  plant: { id: number; name: string } | null;
  /** Xác suất hạng 1. */
  probability: number;
  /** Bệnh của nhãn hạng 1; `null` khi nhãn hạng 1 là HEALTHY. */
  disease: { id: number; name: string; severity: Severity } | null;
}

export interface HistoryPage {
  items: HistoryItem[];
  page: number;
  pageSize: number;
  total: number;
}

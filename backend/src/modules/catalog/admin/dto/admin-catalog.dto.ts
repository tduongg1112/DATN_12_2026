import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { VALIDATION_ERROR } from '../../../../common/exceptions/default-errors.js';
import type { CropStatus } from '../../entities/crop.entity.js';
import {
  PATHOGEN_GROUPS,
  PUBLISH_STATUSES,
  SEVERITIES,
  type PathogenGroup,
  type PublishStatus,
  type Severity,
} from '../../entities/disease.entity.js';
import type { LabelType } from '../../entities/model-label.entity.js';
import { CATALOG_MESSAGES as M } from '../catalog-messages.js';

/* DTO của docs/catalog/api_catalog.md (C1 → C5, B1 → B7). Giới hạn ✎ theo OQ-60. */

const INVALID = { message: VALIDATION_ERROR.message };
const REQUIRED = { message: M.REQUIRED };

export const ADMIN_PAGE_SIZE_DEFAULT = 20;
export const ADMIN_PAGE_SIZE_MAX = 50;
export const SEARCH_MAX = 100;
export const DISEASE_NAME_MAX = 150;
export const PATHOGEN_MAX = 150;
export const SUMMARY_MAX = 500;
export const CONTENT_MAX = 5000;
export const CLASS_CODE_MAX = 100;
export const CROP_NAME_MAX = 100;
export const DESCRIPTION_MAX = 2000;
export const DAYS_MIN = 1;
export const DAYS_MAX = 365;
/** Mã gửi cho mô hình (`crop_code`), vd TOMATO. */
export const CROP_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,29}$/;

/** Ô chữ: cắt khoảng trắng; để trống nghĩa là không có giá trị (`null`). */
const textOrNull = ({ value }: { value: unknown }): unknown => {
  const v = typeof value === 'string' ? value.trim() : value;
  return v === '' || v === undefined ? null : v;
};
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
/** Số ngày: để trống là `null`; còn lại đổi sang số (sai dạng thì là NaN, IsInt bắt). */
const daysOrNull = ({ value }: { value: unknown }): unknown => {
  const v = typeof value === 'string' ? value.trim() : value;
  if (v === '' || v === undefined || v === null) return null;
  return Number(v);
};
/** Multipart gửi `true`/`false` dạng chuỗi. Không gửi là `false`. */
const booleanField = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return false;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

/**
 * Chuỗi bắt buộc có độ dài tối đa, chọn đúng một câu: thiếu thì `REQUIRED`, quá dài thì câu
 * riêng (cùng cách `RequiredText` của `my_plants`).
 */
@ValidatorConstraint({ name: 'catalogRequiredText' })
export class RequiredText implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [max] = args.constraints as [number];
    return typeof value === 'string' && value.length > 0 && value.length <= max;
  }

  defaultMessage(args: ValidationArguments): string {
    const [max, tooLong] = args.constraints as [number, string];
    return typeof args.value === 'string' && args.value.length > max
      ? tooLong
      : M.REQUIRED;
  }
}

/**
 * Nội dung bệnh: bắt buộc khi form chọn "Công khai" (BR-06), còn lại tuỳ chọn; luôn giới hạn
 * độ dài. Bệnh đã công khai sửa mà không gửi `status` thì service kiểm tra (OQ-54).
 */
@ValidatorConstraint({ name: 'publishText' })
export class PublishText implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [max, requiredWhenPublished] = args.constraints as [number, boolean];
    if (value === null || value === undefined) {
      return !(
        requiredWhenPublished &&
        (args.object as { status?: unknown }).status === 'PUBLISHED'
      );
    }
    return typeof value === 'string' && value.length <= max;
  }

  defaultMessage(args: ValidationArguments): string {
    const [, , tooLong] = args.constraints as [number, boolean, string];
    return typeof args.value === 'string' ? tooLong : M.REQUIRED;
  }
}

/** Mã loại cây: thiếu thì `REQUIRED`, sai dạng thì câu định dạng (một câu mỗi lỗi). */
@ValidatorConstraint({ name: 'cropCode' })
export class CropCode implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && CROP_CODE_PATTERN.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return typeof args.value === 'string' && args.value.length > 0
      ? M.CROP_CODE_FORMAT
      : M.REQUIRED;
  }
}

/** B1. GET /admin/diseases */
export class ListAdminDiseasesQuery {
  @IsOptional()
  @MaxLength(SEARCH_MAX, INVALID)
  @IsString(INVALID)
  @Transform(trim)
  q?: string;

  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  cropId?: number;

  @IsOptional()
  @IsIn(PUBLISH_STATUSES, INVALID)
  status?: PublishStatus;

  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Max(ADMIN_PAGE_SIZE_MAX, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  pageSize: number = ADMIN_PAGE_SIZE_DEFAULT;
}

/**
 * Trường chung của B3, B4. Trường chữ của multipart; ảnh `images` nhận qua interceptor, thứ
 * tự ảnh ở `imageLayout` (TD-32). B4 gửi đủ các trường của form; ô để trống là xoá giá trị.
 */
abstract class DiseaseFields {
  @Max(Number.MAX_SAFE_INTEGER, REQUIRED)
  @Min(1, REQUIRED)
  @IsInt(REQUIRED)
  @Type(() => Number)
  cropId: number;

  @Validate(RequiredText, [DISEASE_NAME_MAX, M.DISEASE_NAME_TOO_LONG])
  @Transform(trim)
  name: string;

  @Validate(PublishText, [PATHOGEN_MAX, false, M.PATHOGEN_TOO_LONG])
  @Transform(textOrNull)
  pathogen: string | null = null;

  @IsIn(PATHOGEN_GROUPS, REQUIRED)
  pathogenGroup: PathogenGroup;

  @IsIn(SEVERITIES, REQUIRED)
  severity: Severity;

  @IsOptional()
  @MaxLength(CLASS_CODE_MAX, INVALID)
  @IsString(INVALID)
  @Transform(textOrNull)
  classCode: string | null = null;

  @Validate(PublishText, [SUMMARY_MAX, true, M.SUMMARY_TOO_LONG])
  @Transform(textOrNull)
  summary: string | null = null;

  @Validate(PublishText, [CONTENT_MAX, true, M.CONTENT_TOO_LONG])
  @Transform(textOrNull)
  symptoms: string | null = null;

  @Validate(PublishText, [CONTENT_MAX, false, M.CONTENT_TOO_LONG])
  @Transform(textOrNull)
  causes: string | null = null;

  @Validate(PublishText, [CONTENT_MAX, false, M.CONTENT_TOO_LONG])
  @Transform(textOrNull)
  prevention: string | null = null;

  @Validate(PublishText, [CONTENT_MAX, true, M.CONTENT_TOO_LONG])
  @Transform(textOrNull)
  treatment: string | null = null;

  @IsOptional()
  @Max(DAYS_MAX, { message: M.DAYS_RANGE })
  @Min(DAYS_MIN, { message: M.DAYS_RANGE })
  @IsInt({ message: M.DAYS_RANGE })
  @Transform(daysOrNull)
  recheckDays: number | null = null;

  @IsIn([true, false], INVALID)
  @Transform(booleanField)
  isFeatured: boolean = false;

  @IsOptional()
  @IsString(INVALID)
  imageLayout?: string;

  abstract status?: 'DRAFT' | 'PUBLISHED';
}

/** B3: trạng thái "Nháp" hoặc "Công khai" (C4 bước 4). */
export class CreateDiseaseDto extends DiseaseFields {
  @IsIn(['DRAFT', 'PUBLISHED'], REQUIRED)
  status: 'DRAFT' | 'PUBLISHED';
}

/** B4: chỉ gửi `status` khi bệnh đang `DRAFT` (OQ-54); service kiểm tra. */
export class UpdateDiseaseDto extends DiseaseFields {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'], INVALID)
  status?: 'DRAFT' | 'PUBLISHED';
}

export type DiseaseFormDto = CreateDiseaseDto | UpdateDiseaseDto;

/** B5 (C4 3c). */
export class DiseaseStatusDto {
  @IsIn(['PUBLISHED', 'HIDDEN'], INVALID)
  status: 'PUBLISHED' | 'HIDDEN';
}

/** B7: bệnh liên quan cho trang xem trước (OQ-58). */
export class RelatedDiseasesQuery {
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  cropId: number;

  @IsIn(PATHOGEN_GROUPS, INVALID)
  pathogenGroup: PathogenGroup;

  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  excludeId?: number;
}

/** C3, C4. Ảnh `image` nhận qua interceptor. */
export class CropFormDto {
  @Validate(CropCode)
  @Transform(trim)
  code: string;

  @Validate(RequiredText, [CROP_NAME_MAX, M.CROP_NAME_TOO_LONG])
  @Transform(trim)
  name: string;

  @Validate(PublishText, [DESCRIPTION_MAX, false, M.DESCRIPTION_TOO_LONG])
  @Transform(textOrNull)
  description: string | null = null;

  @Validate(PublishText, [CONTENT_MAX, false, M.CONTENT_TOO_LONG])
  @Transform(textOrNull)
  careGuide: string | null = null;

  @IsOptional()
  @Max(DAYS_MAX, { message: M.DAYS_RANGE })
  @Min(DAYS_MIN, { message: M.DAYS_RANGE })
  @IsInt({ message: M.DAYS_RANGE })
  @Transform(daysOrNull)
  wateringIntervalDays: number | null = null;

  @IsOptional()
  @Max(DAYS_MAX, { message: M.DAYS_RANGE })
  @Min(DAYS_MIN, { message: M.DAYS_RANGE })
  @IsInt({ message: M.DAYS_RANGE })
  @Transform(daysOrNull)
  fertilizingIntervalDays: number | null = null;

  @IsOptional()
  @MaxLength(CLASS_CODE_MAX, INVALID)
  @IsString(INVALID)
  @Transform(textOrNull)
  healthyClassCode: string | null = null;

  /** C4: bỏ ảnh hiện tại (✎). */
  @IsIn([true, false], INVALID)
  @Transform(booleanField)
  removeImage: boolean = false;
}

/** C5 (BR-12). */
export class CropStatusDto {
  @IsIn(['ACTIVE', 'HIDDEN'], INVALID)
  status: CropStatus;
}

/** Tham số `:id` của C2, C4, C5, B2, B4 → B6. */
export class CatalogIdParam {
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  id: number;
}

// --- Response ---------------------------------------------------------------------

export interface CropRef {
  id: number;
  code: string;
  name: string;
  status: CropStatus;
}

/** C1. */
export interface AdminCropItem {
  id: number;
  code: string;
  name: string;
  imageUrl: string | null;
  status: CropStatus;
  /** Bệnh mọi trạng thái (C4 2d "số bệnh"). */
  diseaseCount: number;
  /** Để biết có cần hộp thoại xác nhận khi ẩn (BR-12). */
  publishedDiseaseCount: number;
  healthyClassCode: string | null;
}

/** C2 → C5. */
export interface AdminCrop extends AdminCropItem {
  description: string | null;
  careGuide: string | null;
  wateringIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** B1. */
export interface AdminDiseaseItem {
  id: number;
  name: string;
  crop: CropRef;
  classCode: string | null;
  status: PublishStatus;
  isFeatured: boolean;
  updatedAt: Date;
}

export interface AdminDiseaseImage {
  id: number;
  url: string;
  caption: string | null;
}

/** B2 → B5. */
export interface AdminDisease {
  id: number;
  crop: CropRef;
  name: string;
  pathogen: string | null;
  pathogenGroup: PathogenGroup;
  severity: Severity;
  classCode: string | null;
  /** Bệnh đã có dòng nhãn (kể cả đã tắt) thì không đổi loại cây được (OQ-55). */
  cropLocked: boolean;
  summary: string | null;
  symptoms: string | null;
  causes: string | null;
  prevention: string | null;
  treatment: string | null;
  recheckDays: number | null;
  isFeatured: boolean;
  status: PublishStatus;
  publishedAt: Date | null;
  images: AdminDiseaseImage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** M1: một mã lớp của mô hình đang dùng. */
export interface ModelLabelItem {
  classCode: string;
  assigned: boolean;
  labelType: LabelType | null;
  crop: { id: number; name: string } | null;
  disease: { id: number; name: string; status: PublishStatus } | null;
}

/** M1: nhãn đang gán nhưng không còn trong mô hình (BR-19). */
export interface StaleLabelItem {
  classCode: string;
  labelType: LabelType;
  crop: { id: number; name: string };
  disease: { id: number; name: string; status: PublishStatus } | null;
}

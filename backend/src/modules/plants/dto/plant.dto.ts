import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
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
import { VALIDATION_ERROR } from '../../../common/exceptions/default-errors.js';
import type { Severity } from '../../catalog/entities/disease.entity.js';
import type { LogType } from '../entities/plant-log.entity.js';
import type { HealthStatus } from '../entities/plant.entity.js';
import type {
  ReminderSource,
  ReminderType,
} from '../entities/reminder.entity.js';
import type { ManualStatus } from '../health-rules.js';
import { PLANT_MESSAGES as M } from '../plant-messages.js';

/* DTO của docs/my_plants/api_my_plants.md (P1 → P7, A2 dùng lại form P2). */

const INVALID = { message: VALIDATION_ERROR.message };
const REQUIRED = { message: M.NAME_AND_CROP_REQUIRED };

/** OQ-45 (chốt 23/11): 10 cây mỗi trang. */
export const PLANTS_PAGE_SIZE_DEFAULT = 10;
export const PLANTS_PAGE_SIZE_MAX = 50;
export const PLANT_NAME_MAX = 100;
export const PLANT_NOTE_MAX = 255;
export const LOG_CONTENT_MAX = 1000;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
/** Form tạo: ô để trống coi như không gửi. */
const emptyToUndefined = ({ value }: { value: unknown }): unknown => {
  const v = typeof value === 'string' ? value.trim() : value;
  return v === '' ? undefined : v;
};
/** Form sửa: ô để trống nghĩa là xoá giá trị. */
const emptyToNull = ({ value }: { value: unknown }): unknown => {
  const v = typeof value === 'string' ? value.trim() : value;
  return v === '' ? null : v;
};

/**
 * Ngày `yyyy-MM-dd` có thật và không sau hôm nay. Cho lệch một ngày so với ngày UTC của máy
 * chủ, vì người dùng ở UTC+7 (giao diện chặn chính xác bằng `max` = hôm nay theo giờ máy).
 */
@ValidatorConstraint({ name: 'notFutureDate' })
export class NotFutureDate implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !DATE_ONLY.test(value)) return true;
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return true;
    const limit = new Date();
    limit.setUTCHours(0, 0, 0, 0);
    limit.setUTCDate(limit.getUTCDate() + 1);
    return date <= limit;
  }
}

/**
 * Chuỗi bắt buộc có độ dài tối đa, chọn đúng một câu: thiếu thì `constraints[1]`, quá dài
 * thì `constraints[2]` (tránh nhiều ràng buộc cùng lỗi với câu khác nhau).
 */
@ValidatorConstraint({ name: 'requiredText' })
export class RequiredText implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [max] = args.constraints as [number];
    return typeof value === 'string' && value.length > 0 && value.length <= max;
  }

  defaultMessage(args: ValidationArguments): string {
    const [max, requiredMessage, tooLongMessage] = args.constraints as [
      number,
      string,
      string,
    ];
    return typeof args.value === 'string' && args.value.length > max
      ? tooLongMessage
      : requiredMessage;
  }
}

/** Ngày `yyyy-MM-dd` có thật (vd không nhận 2026-02-30). */
@ValidatorConstraint({ name: 'realDate' })
export class RealDate implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }
}

/** P1. GET /plants */
export class ListPlantsQuery {
  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Max(PLANTS_PAGE_SIZE_MAX, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  pageSize: number = PLANTS_PAGE_SIZE_DEFAULT;
}

/** P2 (và A2). Trường chữ của multipart; ảnh `avatar` nhận qua interceptor. */
export class CreatePlantDto {
  @Validate(RequiredText, [
    PLANT_NAME_MAX,
    M.NAME_AND_CROP_REQUIRED,
    M.NAME_TOO_LONG,
  ])
  @Transform(trim)
  name: string;

  @Max(Number.MAX_SAFE_INTEGER, REQUIRED)
  @Min(1, REQUIRED)
  @IsInt(REQUIRED)
  @Type(() => Number)
  cropId: number;

  @IsOptional()
  @Validate(NotFutureDate, { message: M.PLANTED_DATE_FUTURE })
  @Validate(RealDate, INVALID)
  @Transform(emptyToUndefined)
  plantedDate?: string;

  @IsOptional()
  @MaxLength(PLANT_NOTE_MAX, { message: M.NOTE_TOO_LONG })
  @IsString(INVALID)
  @Transform(emptyToUndefined)
  note?: string;
}

/** P4. Mọi trường tuỳ chọn; `plantedDate`, `note` gửi chuỗi rỗng để xoá. */
export class UpdatePlantDto {
  @IsOptional()
  @Validate(RequiredText, [
    PLANT_NAME_MAX,
    M.NAME_AND_CROP_REQUIRED,
    M.NAME_TOO_LONG,
  ])
  @Transform(trim)
  name?: string;

  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, REQUIRED)
  @Min(1, REQUIRED)
  @IsInt(REQUIRED)
  @Type(() => Number)
  cropId?: number;

  @IsOptional()
  @Validate(NotFutureDate, { message: M.PLANTED_DATE_FUTURE })
  @Validate(RealDate, INVALID)
  @Transform(emptyToNull)
  plantedDate?: string | null;

  @IsOptional()
  @MaxLength(PLANT_NOTE_MAX, { message: M.NOTE_TOO_LONG })
  @IsString(INVALID)
  @Transform(emptyToNull)
  note?: string | null;
}

/** P6. */
export class UpdatePlantStatusDto {
  @IsIn(['TREATING', 'RECOVERED'], INVALID)
  status: ManualStatus;
}

/** P7. Ảnh `image` nhận qua interceptor. */
export class CreatePlantLogDto {
  @Validate(RequiredText, [
    LOG_CONTENT_MAX,
    M.CONTENT_REQUIRED,
    M.CONTENT_TOO_LONG,
  ])
  @Transform(trim)
  content: string;

  @IsOptional()
  @Validate(NotFutureDate, { message: M.ACTION_DATE_FUTURE })
  @Validate(RealDate, INVALID)
  @Transform(emptyToUndefined)
  actionDate?: string;
}

/** R1 (BR-14): sau 3, 7 hoặc 14 ngày. */
export class RecheckReminderDto {
  @IsIn([3, 7, 14], INVALID)
  days: number;
}

/** R2: các loại nhắc gợi ý người dùng đã chọn. */
export class SuggestedRemindersDto {
  @IsIn(['WATERING', 'FERTILIZING', 'RECHECK'], { ...INVALID, each: true })
  @ArrayUnique({}, INVALID)
  @ArrayMaxSize(3, INVALID)
  @ArrayMinSize(1, INVALID)
  @IsArray(INVALID)
  types: ReminderSuggestion['type'][];
}

/** A1 body; D1 trường `plantId`. */
export class PlantIdDto {
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  plantId: number;
}

/** P1/P3 param. */
export class PlantIdParam {
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
}

/** P1. */
export interface PlantCard {
  id: number;
  name: string;
  crop: CropRef;
  avatarUrl: string | null;
  healthStatus: HealthStatus;
  lastDiagnosedAt: Date | null;
}

export interface PlantsPage {
  items: PlantCard[];
  page: number;
  pageSize: number;
  total: number;
}

/** Một lượt chẩn đoán trên dòng thời gian (dạng `HistoryItem` bỏ `crop`, `plant`). */
export interface PlantDiagnosisItem {
  id: number;
  createdAt: Date;
  resultType: 'DISEASE' | 'HEALTHY' | 'UNCERTAIN';
  thumbnailUrl: string | null;
  probability: number;
  disease: { id: number; name: string; severity: Severity } | null;
}

export interface PlantLogView {
  id: number;
  logType: LogType;
  content: string | null;
  statusAfter: ManualStatus | null;
  imageUrl: string | null;
  actionDate: string;
  createdAt: Date;
}

export interface ReminderView {
  id: number;
  type: ReminderType;
  title: string;
  nextRemindAt: Date;
  repeatDays: number | null;
  source: ReminderSource;
}

/** "Bệnh đang mắc" (BR-06, OQ-46). */
export interface CurrentDisease {
  diagnosisId: number;
  id: number;
  name: string;
  severity: Severity;
  treatment: string | null;
  detailAvailable: boolean;
}

/** P2 (trong `plant`), P3, P4, P6. */
export interface PlantDetail {
  id: number;
  name: string;
  crop: CropRef;
  plantedDate: string | null;
  note: string | null;
  avatarUrl: string | null;
  healthStatus: HealthStatus;
  /** Lựa chọn của "Cập nhật tình trạng" (OQ-47); rỗng thì ẩn nút. */
  allowedStatusChanges: ManualStatus[];
  createdAt: Date;
  lastDiagnosedAt: Date | null;
  currentDisease: CurrentDisease | null;
  diagnoses: PlantDiagnosisItem[];
  logs: PlantLogView[];
  reminders: ReminderView[];
}

/** Gợi ý nhắc (đợt 2). Đợt 1 luôn rỗng. */
export interface ReminderSuggestion {
  type: 'WATERING' | 'FERTILIZING' | 'RECHECK';
  days: number;
}

/** A1, A2, D1: kết quả gắn lượt vào cây. */
export interface PlantLink {
  plant: { id: number; name: string; healthStatus: HealthStatus };
  /** Bảng 4.8: hỏi "Đã khỏi" (OQ-48). */
  suggestRecovered: boolean;
  suggestions: ReminderSuggestion[];
}

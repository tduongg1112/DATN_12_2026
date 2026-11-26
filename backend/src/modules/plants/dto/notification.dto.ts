import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { VALIDATION_ERROR } from '../../../common/exceptions/default-errors.js';

/* DTO của docs/my_plants/api_my_plants.md N1, N3. */

const INVALID = { message: VALIDATION_ERROR.message };

/** N1: 20 thông báo mỗi trang, tối đa 50. */
export class ListNotificationsQuery {
  @IsOptional()
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Max(50, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  pageSize: number = 20;
}

/** N3. */
export class NotificationIdParam {
  @Max(Number.MAX_SAFE_INTEGER, INVALID)
  @Min(1, INVALID)
  @IsInt(INVALID)
  @Type(() => Number)
  id: number;
}

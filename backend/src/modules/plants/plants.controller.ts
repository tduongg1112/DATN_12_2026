import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CreatePlantDto,
  CreatePlantLogDto,
  ListPlantsQuery,
  PlantIdParam,
  RecheckReminderDto,
  SuggestedRemindersDto,
  UpdatePlantDto,
  UpdatePlantStatusDto,
  type PlantDetail,
  type PlantLogView,
  type PlantsPage,
  type ReminderSuggestion,
  type ReminderView,
} from './dto/plant.dto.js';
import {
  PlantAvatarInterceptor,
  PlantLogImageInterceptor,
  type UploadedImageFile,
} from './plant-upload.interceptor.js';
import { PlantsService } from './plants.service.js';

/**
 * Cây trồng của tôi (docs/my_plants/api_my_plants.md P1 → P7). USER và ADMIN (OQ-22); mỗi
 * người chỉ thao tác trên cây của mình (BR-13).
 */
@Controller('plants')
@Roles('USER')
export class PlantsController {
  constructor(private readonly plants: PlantsService) {}

  /** P1 (US-01). */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListPlantsQuery,
  ): Promise<PlantsPage> {
    return this.plants.list(user.id, query.page, query.pageSize);
  }

  /** P2 (US-02). */
  @Post()
  @UseInterceptors(PlantAvatarInterceptor)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlantDto,
    @UploadedFile() avatar?: UploadedImageFile,
  ): Promise<{ plant: PlantDetail; suggestions: ReminderSuggestion[] }> {
    return this.plants.create(user.id, dto, avatar?.buffer);
  }

  /** P3 (US-03). */
  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param() params: PlantIdParam,
  ): Promise<PlantDetail> {
    return this.plants.getDetail(user.id, params.id);
  }

  /** P4 (US-07). */
  @Patch(':id')
  @UseInterceptors(PlantAvatarInterceptor)
  update(
    @CurrentUser() user: AuthUser,
    @Param() params: PlantIdParam,
    @Body() dto: UpdatePlantDto,
    @UploadedFile() avatar?: UploadedImageFile,
  ): Promise<PlantDetail> {
    return this.plants.update(user.id, params.id, dto, avatar?.buffer);
  }

  /** P5 (US-08). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param() params: PlantIdParam,
  ): Promise<void> {
    return this.plants.remove(user.id, params.id);
  }

  /** P6 (US-05). */
  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param() params: PlantIdParam,
    @Body() dto: UpdatePlantStatusDto,
  ): Promise<PlantDetail> {
    return this.plants.changeStatus(user.id, params.id, dto.status);
  }

  /** R1 (US-09): "Nhắc tôi kiểm tra lại". */
  @Post(':id/reminders/recheck')
  createRecheck(
    @CurrentUser() user: AuthUser,
    @Param() params: PlantIdParam,
    @Body() dto: RecheckReminderDto,
  ): Promise<ReminderView> {
    return this.plants.createRecheckReminder(user.id, params.id, dto.days);
  }

  /** R2 (US-11): tạo các nhắc gợi ý đã xác nhận. */
  @Post(':id/reminders/suggested')
  createSuggested(
    @CurrentUser() user: AuthUser,
    @Param() params: PlantIdParam,
    @Body() dto: SuggestedRemindersDto,
  ): Promise<ReminderView[]> {
    return this.plants.createSuggestedReminders(user.id, params.id, dto.types);
  }

  /** P7 (US-06). */
  @Post(':id/logs')
  @UseInterceptors(PlantLogImageInterceptor)
  addLog(
    @CurrentUser() user: AuthUser,
    @Param() params: PlantIdParam,
    @Body() dto: CreatePlantLogDto,
    @UploadedFile() image?: UploadedImageFile,
  ): Promise<PlantLogView> {
    return this.plants.addLog(user.id, params.id, dto, image?.buffer);
  }
}

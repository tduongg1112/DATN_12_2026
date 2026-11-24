import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  NotificationIdParam,
  ListNotificationsQuery,
} from './dto/notification.dto.js';
import {
  NotificationsService,
  type NotificationsPage,
} from './notifications.service.js';

/**
 * Thông báo trong ứng dụng (docs/my_plants/api_my_plants.md N1 → N4; BR-17, BR-19). USER và
 * ADMIN (OQ-22); mỗi người chỉ thấy thông báo của mình.
 */
@Controller('notifications')
@Roles('USER')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** N1. */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQuery,
  ): Promise<NotificationsPage> {
    return this.notifications.list(user.id, query.page, query.pageSize);
  }

  /** N2: số chưa đọc cho chuông. */
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  /** N4. Khai báo trước `:id/read` cho rõ ràng. */
  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notifications.markAllRead(user.id);
  }

  /** N3. */
  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(
    @CurrentUser() user: AuthUser,
    @Param() params: NotificationIdParam,
  ): Promise<void> {
    return this.notifications.markRead(user.id, params.id);
  }
}

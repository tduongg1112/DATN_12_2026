import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { DEFAULT_ERRORS } from '../../common/exceptions/default-errors.js';
import { UsersService } from '../accounts/users.service.js';
import { Notification } from './entities/notification.entity.js';

/** Một thông báo ở N1 (BR-19). `plantId` để mở chi tiết cây; null khi không gắn lịch nhắc. */
export interface NotificationView {
  id: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  plantId: number | null;
}

export interface NotificationsPage {
  items: NotificationView[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
}

/** N3: không có hoặc của người khác (OQ-29). */
export function notificationNotFound(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'NOTIFICATION_NOT_FOUND',
    DEFAULT_ERRORS[HttpStatus.NOT_FOUND].message,
  );
}

/**
 * Thông báo trong ứng dụng (bảng `notifications`, OQ-09). TD-25 (chốt 22/11): mô-đun
 * khác tạo thông báo qua service này. Đọc, đánh dấu đã đọc: N1 → N4 của `my_plants`
 * (BR-17, BR-19). Không có xoá thông báo.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly users: UsersService,
  ) {}

  /**
   * Gửi một thông báo cho mọi ADMIN, trừ khi ADMIN đã từng nhận thông báo cùng nội dung
   * (diagnosis BR-11, OQ-26: không gửi trùng cho cùng một `class_code`). Trả số thông
   * báo đã tạo.
   *
   * Kiểm tra và tạo nằm trong một giao dịch, có khoá tư vấn theo nội dung, để hai lượt
   * chẩn đoán cùng lúc không cùng tạo một thông báo.
   */
  async notifyAdminsOnce(title: string, content: string): Promise<number> {
    const adminIds = await this.users.findAdminIds();
    if (adminIds.length === 0) return 0;
    return this.notifications.manager.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `notifications:${content}`,
      ]);
      const repo = manager.getRepository(Notification);
      const sent = await repo.existsBy({
        userId: In(adminIds),
        reminderId: IsNull(),
        content,
      });
      if (sent) return 0;
      await repo.insert(adminIds.map((userId) => ({ userId, title, content })));
      return adminIds.length;
    });
  }

  /** N1 (Q12): thông báo của mình, mới nhất trước, kèm số chưa đọc. */
  async list(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<NotificationsPage> {
    const [rows, total, unreadCount] = await Promise.all([
      this.notifications
        .createQueryBuilder('n')
        .leftJoin('n.reminder', 'r')
        .select('n.id', 'id')
        .addSelect('n.title', 'title')
        .addSelect('n.content', 'content')
        .addSelect('n.isRead', 'isRead')
        .addSelect('n.createdAt', 'createdAt')
        .addSelect('r.plantId', 'plantId')
        .where('n.userId = :userId', { userId })
        .orderBy('n.createdAt', 'DESC')
        .addOrderBy('n.id', 'DESC')
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .getRawMany<{
          id: number | string;
          title: string;
          content: string;
          isRead: boolean;
          createdAt: Date;
          plantId: number | string | null;
        }>(),
      this.notifications.countBy({ userId }),
      this.unreadCount(userId),
    ]);
    return {
      items: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        content: r.content,
        isRead: r.isRead,
        createdAt: r.createdAt,
        plantId: r.plantId === null ? null : Number(r.plantId),
      })),
      page,
      pageSize,
      total,
      unreadCount,
    };
  }

  /** N2. */
  unreadCount(userId: number): Promise<number> {
    return this.notifications.countBy({ userId, isRead: false });
  }

  /** N3: đã đọc rồi thì không lỗi. */
  async markRead(userId: number, id: number): Promise<void> {
    const exists = await this.notifications.existsBy({ id, userId });
    if (!exists) throw notificationNotFound();
    await this.notifications.update({ id, userId }, { isRead: true });
  }

  /** N4. */
  async markAllRead(userId: number): Promise<void> {
    await this.notifications.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}

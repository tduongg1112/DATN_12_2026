import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { UsersService } from '../accounts/users.service.js';
import { Notification } from './entities/notification.entity.js';

/**
 * Thông báo trong ứng dụng (bảng `notifications`, OQ-09). TD-25 (chốt 22/11): mô-đun
 * khác tạo thông báo qua service này. Chuông thông báo (đọc, đánh dấu đã đọc) làm ở
 * feature `my_plants`.
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
}

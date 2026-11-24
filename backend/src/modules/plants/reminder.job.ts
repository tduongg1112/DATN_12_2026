import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { Notification } from './entities/notification.entity.js';
import { Reminder, type ReminderType } from './entities/reminder.entity.js';
import { nextRepeatAfter, reminderNotice } from './reminder-rules.js';

/** TD-28: mỗi lần chạy xử lý tối đa 100 nhắc. */
export const REMINDER_BATCH_LIMIT = 100;
const JOB_NAME = 'reminders';

interface DueRow {
  id: number;
  reminder_type: ReminderType;
  title: string;
  next_remind_at: Date;
  repeat_days: number | null;
  user_id: number;
  plant_name: string;
}

/**
 * Job gửi nhắc (my_plants BR-15, TD-28; docs/my_plants/api_my_plants.md J1). Chạy mỗi
 * `REMINDER_JOB_INTERVAL_MINUTES` phút bằng `setInterval` đăng ký ở SchedulerRegistry.
 * Mỗi nhắc một giao dịch nhỏ, khoá `FOR UPDATE SKIP LOCKED` để hai lần chạy (hoặc hai máy
 * chủ) không gửi trùng. Chỉ thông báo trong ứng dụng (OQ-09).
 */
@Injectable()
export class ReminderJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderJob.name);
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly scheduler: SchedulerRegistry,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('REMINDER_JOB_ENABLED', { infer: true })) return;
    const minutes = this.config.get('REMINDER_JOB_INTERVAL_MINUTES', {
      infer: true,
    });
    const timer = setInterval(() => void this.run(), minutes * 60_000);
    this.scheduler.addInterval(JOB_NAME, timer);
  }

  onModuleDestroy(): void {
    if (this.scheduler.doesExist('interval', JOB_NAME)) {
      this.scheduler.deleteInterval(JOB_NAME);
    }
  }

  /** Gửi các nhắc đến hạn tại `now`. Trả số thông báo đã tạo. Lần chạy trước chưa xong thì bỏ qua. */
  async run(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let sent = 0;
    try {
      while (sent < REMINDER_BATCH_LIMIT) {
        const done = await this.sendOne(now);
        if (!done) break;
        sent++;
      }
    } catch (error) {
      this.logger.error(`Job nhắc việc lỗi: ${String(error)}`);
    } finally {
      this.running = false;
    }
    if (sent > 0) this.logger.log(`Đã gửi ${sent} nhắc việc`);
    return sent;
  }

  /** Một nhắc đến hạn trong một giao dịch; hết nhắc thì trả `false`. */
  private async sendOne(now: Date): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const [due] = await manager.query<DueRow[]>(
        `SELECT r.id, r.reminder_type, r.title, r.next_remind_at, r.repeat_days,
                p.user_id, p.name AS plant_name
           FROM reminders r
           JOIN plants p ON p.id = r.plant_id
          WHERE r.is_active AND r.next_remind_at <= $1
          ORDER BY r.next_remind_at, r.id
          LIMIT 1
          FOR UPDATE OF r SKIP LOCKED`,
        [now],
      );
      if (!due) return false;

      const notice = reminderNotice(
        due.reminder_type,
        due.plant_name,
        due.title,
      );
      await manager.insert(Notification, {
        userId: Number(due.user_id),
        reminderId: Number(due.id),
        title: notice.title,
        content: notice.content,
      });
      await manager.update(
        Reminder,
        { id: Number(due.id) },
        due.repeat_days
          ? {
              lastSentAt: now,
              nextRemindAt: nextRepeatAfter(
                new Date(due.next_remind_at),
                due.repeat_days,
                now,
              ),
            }
          : { lastSentAt: now, isActive: false },
      );
      return true;
    });
  }
}

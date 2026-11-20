import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { CreatedAtColumn, IdColumn } from '../../../database/columns.js';
import { User } from '../../accounts/entities/user.entity.js';
import { Reminder } from './reminder.entity.js';

/** Thông báo trong ứng dụng (data_model.md: notifications; OQ-09, OQ-26). */
@Entity('notifications')
@Index('ix_notifications_user', ['userId', 'isRead', 'createdAt'])
export class Notification {
  @IdColumn('notifications')
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_notifications_user',
  })
  user?: Relation<User>;

  /** NULL với thông báo không đến từ lịch nhắc, hoặc khi lịch nhắc đã bị xoá. */
  @Column({ name: 'reminder_id', type: 'bigint', nullable: true })
  reminderId: number | null;

  @ManyToOne(() => Reminder, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'reminder_id',
    foreignKeyConstraintName: 'fk_notifications_reminder',
  })
  reminder?: Relation<Reminder> | null;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreatedAtColumn()
  createdAt: Date;
}

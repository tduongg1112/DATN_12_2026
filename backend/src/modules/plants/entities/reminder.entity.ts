import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import {
  CreatedAtColumn,
  IdColumn,
  UpdatedAtColumn,
} from '../../../database/columns.js';
import { Plant } from './plant.entity.js';

export const REMINDER_TYPES = [
  'RECHECK',
  'WATERING',
  'FERTILIZING',
  'OTHER',
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export const REMINDER_SOURCES = ['USER', 'SYSTEM'] as const;
export type ReminderSource = (typeof REMINDER_SOURCES)[number];

/** Lịch nhắc (data_model.md: reminders). */
@Entity('reminders')
@Index('ix_reminders_plant', ['plantId'])
@Index('ix_reminders_due', ['nextRemindAt'], { where: 'is_active' })
@Check(
  'ck_reminders_reminder_type',
  `reminder_type IN ('RECHECK', 'WATERING', 'FERTILIZING', 'OTHER')`,
)
@Check('ck_reminders_repeat_days', `repeat_days > 0`)
@Check('ck_reminders_source', `source IN ('USER', 'SYSTEM')`)
export class Reminder {
  @IdColumn('reminders')
  id: number;

  @Column({ name: 'plant_id', type: 'bigint' })
  plantId: number;

  @ManyToOne(() => Plant, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'plant_id',
    foreignKeyConstraintName: 'fk_reminders_plant',
  })
  plant?: Relation<Plant>;

  @Column({ name: 'reminder_type', type: 'varchar', length: 20 })
  reminderType: ReminderType;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'next_remind_at', type: 'timestamptz' })
  nextRemindAt: Date;

  /** NULL: nhắc một lần. */
  @Column({ name: 'repeat_days', type: 'smallint', nullable: true })
  repeatDays: number | null;

  @Column({ type: 'varchar', length: 10, default: 'USER' })
  source: ReminderSource;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;
}

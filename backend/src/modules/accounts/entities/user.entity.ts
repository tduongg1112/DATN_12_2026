import { Check, Column, Entity, Unique } from 'typeorm';
import {
  CreatedAtColumn,
  IdColumn,
  UpdatedAtColumn,
} from '../../../database/columns.js';

export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Tài khoản (data_model.md: users). */
@Entity('users')
@Unique('uq_users_email', ['email'])
@Unique('uq_users_google_id', ['googleId'])
@Check('ck_users_role', `role IN ('USER', 'ADMIN')`)
@Check(
  'ck_users_login_method',
  `password_hash IS NOT NULL OR google_id IS NOT NULL`,
)
export class User {
  @IdColumn('users')
  id: number;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  /** Lưu chữ thường. */
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash: string | null;

  @Column({ name: 'google_id', type: 'varchar', length: 100, nullable: true })
  googleId: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USER' })
  role: Role;

  @Column({ name: 'failed_login_count', type: 'smallint', default: 0 })
  failedLoginCount: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @CreatedAtColumn()
  createdAt: Date;

  @UpdatedAtColumn()
  updatedAt: Date;
}

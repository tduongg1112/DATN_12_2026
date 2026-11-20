import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../modules/accounts/entities/user.entity.js';

export const ROLES_KEY = 'roles';

/**
 * Giới hạn vai trò. `@Roles('USER')` cũng cho ADMIN qua vì ADMIN kế thừa
 * chức năng USER (OQ-22). `@Roles('ADMIN')` chỉ cho ADMIN.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

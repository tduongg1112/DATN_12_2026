import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../../modules/accounts/entities/user.entity.js';
import type { AuthenticatedRequest } from '../auth/auth-user.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AppException } from '../exceptions/app.exception.js';
import { DEFAULT_ERRORS } from '../exceptions/default-errors.js';

/** ADMIN kế thừa mọi quyền của USER (OQ-22). */
export function hasRole(userRole: Role, required: readonly Role[]): boolean {
  if (required.includes(userRole)) return true;
  return userRole === 'ADMIN' && required.includes('USER');
}

/** Chạy sau JwtAuthGuard. Route không gắn @Roles() thì mọi người đã đăng nhập đều qua. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (user && hasRole(user.role, required)) return true;

    const status = user ? HttpStatus.FORBIDDEN : HttpStatus.UNAUTHORIZED;
    const e = DEFAULT_ERRORS[status];
    throw new AppException(status, e.code, e.message);
  }
}

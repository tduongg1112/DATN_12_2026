import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES } from '../../modules/accounts/entities/user.entity.js';
import type {
  AccessTokenPayload,
  AuthenticatedRequest,
} from '../auth/auth-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AppException } from '../exceptions/app.exception.js';
import { DEFAULT_ERRORS } from '../exceptions/default-errors.js';

/**
 * Guard toàn cục: mọi route cần access token hợp lệ (header `Authorization: Bearer`),
 * trừ route gắn @Public() (be-coding-rules.md mục 4).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearer(request.headers.authorization);
    if (!token) throw this.unauthorized();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw this.unauthorized();
    }
    const id = Number(payload.sub);
    if (!Number.isSafeInteger(id) || id <= 0 || !ROLES.includes(payload.role)) {
      throw this.unauthorized();
    }
    request.user = { id, role: payload.role };
    return true;
  }

  private extractBearer(header: string | undefined): string | undefined {
    const [scheme, token] = header?.split(' ') ?? [];
    return scheme === 'Bearer' && token ? token : undefined;
  }

  private unauthorized(): AppException {
    const e = DEFAULT_ERRORS[HttpStatus.UNAUTHORIZED];
    return new AppException(HttpStatus.UNAUTHORIZED, e.code, e.message);
  }
}

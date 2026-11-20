import type { Request } from 'express';
import type { Role } from '../../modules/accounts/entities/user.entity.js';

/** Người dùng đã xác thực, gắn vào request bởi JwtAuthGuard. */
export interface AuthUser {
  id: number;
  role: Role;
}

/** Nội dung access token. Feature auth ký token theo đúng dạng này. */
export interface AccessTokenPayload {
  sub: number;
  role: Role;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };

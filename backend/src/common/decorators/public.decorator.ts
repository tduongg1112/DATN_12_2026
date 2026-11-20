import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Bỏ qua JwtAuthGuard (đăng ký, đăng nhập, refresh, Google OAuth, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

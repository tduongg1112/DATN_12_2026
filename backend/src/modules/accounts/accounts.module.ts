import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { User } from './entities/user.entity.js';
import {
  GoogleAuthLibraryClient,
  GoogleOAuthClient,
} from './google/google-oauth.client.js';
import { RedisLifecycle, redisProvider } from './session/redis.provider.js';
import { SessionService } from './session/session.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/** Mô-đun Tài khoản: feature `auth` (UC01, AUTH-01 → AUTH-04). */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController, UsersController],
  providers: [
    redisProvider,
    RedisLifecycle,
    SessionService,
    AuthService,
    UsersService,
    { provide: GoogleOAuthClient, useClass: GoogleAuthLibraryClient },
  ],
  exports: [TypeOrmModule, UsersService],
})
export class AccountsModule {}

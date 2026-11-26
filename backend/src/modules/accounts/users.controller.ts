import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AvatarUploadInterceptor } from './avatar-upload.interceptor.js';
import type { UploadedImageFile } from '../../common/storage/image-upload.interceptor.js';
import {
  ChangePasswordDto,
  UpdateProfileDto,
  type UserProfile,
} from './dto/profile.dto.js';
import { UsersService } from './users.service.js';

/** Endpoint U1 → U3 (AUTH-04). USER và ADMIN (ADMIN kế thừa USER, OQ-22). */
@Controller('users/me')
@Roles('USER')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** U1. */
  @Get()
  getMe(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    return this.users.getProfile(user.id);
  }

  /** U2 (BR-16). */
  @Patch()
  @UseInterceptors(AvatarUploadInterceptor)
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: UploadedImageFile,
  ): Promise<UserProfile> {
    return this.users.updateProfile(user.id, dto, avatar?.buffer);
  }

  /** U3 (BR-17). */
  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.users.changePassword(user.id, dto);
  }
}

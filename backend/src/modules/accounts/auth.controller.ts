import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { AuthService } from './auth.service.js';
import { GoogleCallbackQuery, LoginDto, RegisterDto } from './dto/auth.dto.js';
import { GoogleOAuthClient } from './google/google-oauth.client.js';
import {
  decodeOAuthState,
  encodeOAuthState,
  newOAuthState,
  safeNext,
  stateMatches,
} from './google/oauth-state.js';
import {
  clearGoogleStateCookie,
  clearRefreshCookie,
  GOOGLE_STATE_COOKIE,
  readCookie,
  REFRESH_COOKIE,
  setGoogleStateCookie,
  setRefreshCookie,
} from './session/auth-cookies.js';
import type { IssuedSession } from './session/session.service.js';

/** Body trả về khi đăng ký, đăng nhập, làm mới phiên (TD-15). */
export interface AccessTokenResponse {
  accessToken: string;
}

/** Endpoint A1 → A6 của docs/auth/api_auth.md. Tất cả công khai (`@Public`). */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly secureCookies: boolean;
  private readonly frontendUrl: string;

  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthClient,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    // TD-12: cookie `Secure` khi chạy HTTPS (production).
    this.secureCookies =
      config.get('NODE_ENV', { infer: true }) === 'production';
    this.frontendUrl = config
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/+$/, '');
  }

  /** A1. */
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    return this.startSession(res, await this.auth.register(dto));
  }

  /** A2. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    return this.startSession(res, await this.auth.login(dto));
  }

  /** A3. Lỗi thì xoá luôn cookie hỏng. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    try {
      const session = await this.auth.refresh(readCookie(req, REFRESH_COOKIE));
      return this.startSession(res, session);
    } catch (error) {
      clearRefreshCookie(res, this.secureCookies);
      throw error;
    }
  }

  /** A4 (BR-12). Luôn 204. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE));
    clearRefreshCookie(res, this.secureCookies);
  }

  /** A5. Điều hướng toàn trang sang Google (BR-04). */
  @Public()
  @Get('google')
  googleStart(@Query('next') next: unknown, @Res() res: Response): void {
    if (!this.google.isConfigured()) {
      this.logger.warn('Google OAuth chưa cấu hình (GOOGLE_*)');
      return res.redirect(
        this.loginUrl({ error: 'google', next: safeNext(next) }),
      );
    }
    const state = newOAuthState(next);
    setGoogleStateCookie(res, encodeOAuthState(state), this.secureCookies);
    res.redirect(this.google.authUrl(state.state));
  }

  /** A6 (BR-04, BR-09). Mọi kết quả đều chuyển về màn đăng nhập của frontend. */
  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query() query: GoogleCallbackQuery,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const saved = decodeOAuthState(readCookie(req, GOOGLE_STATE_COOKIE));
    clearGoogleStateCookie(res, this.secureCookies);
    const next = saved?.next;

    // BR-09: người dùng huỷ hoặc từ chối → về màn đăng nhập, không thông báo.
    if (query.error === 'access_denied') {
      return res.redirect(this.loginUrl({ next }));
    }
    try {
      if (!saved || !stateMatches(saved.state, query.state)) {
        throw new Error('state không khớp');
      }
      if (query.error || !query.code) {
        throw new Error(`Google trả lỗi: ${query.error ?? 'thiếu code'}`);
      }
      const profile = await this.google.exchangeCode(query.code);
      const session = await this.auth.loginWithGoogle(profile);
      setRefreshCookie(
        res,
        session.refreshToken,
        session.refreshExpiresAt,
        this.secureCookies,
      );
      // Màn đăng nhập tự khôi phục phiên bằng /auth/refresh rồi điều hướng (TD-22).
      res.redirect(this.loginUrl({ next }));
    } catch (error) {
      this.logger.warn(
        `Đăng nhập Google thất bại: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.redirect(this.loginUrl({ error: 'google', next }));
    }
  }

  private startSession(
    res: Response,
    session: IssuedSession,
  ): AccessTokenResponse {
    setRefreshCookie(
      res,
      session.refreshToken,
      session.refreshExpiresAt,
      this.secureCookies,
    );
    return { accessToken: session.accessToken };
  }

  private loginUrl(params: { error?: string; next?: string }): string {
    const query = new URLSearchParams();
    if (params.error) query.set('error', params.error);
    if (params.next) query.set('next', params.next);
    const qs = query.toString();
    return `${this.frontendUrl}/login${qs ? `?${qs}` : ''}`;
  }
}

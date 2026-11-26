import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { EnvironmentVariables } from '../../../config/env.validation.js';

/** Thông tin Google trả về sau khi người dùng đồng ý chia sẻ (BR-04). */
export interface GoogleProfile {
  /** Google `sub`, lưu vào `users.google_id`. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Cổng tới Google OAuth (TD-13, TD-22). Tách thành lớp trừu tượng để test e2e thay
 * bằng bản giả, không gọi Google thật.
 */
export abstract class GoogleOAuthClient {
  /** Đã đủ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL chưa. */
  abstract isConfigured(): boolean;

  /** URL trang chọn tài khoản Google, kèm `state` chống giả mạo. */
  abstract authUrl(state: string): string;

  /** Đổi `code` lấy thông tin người dùng (ID token đã kiểm chữ ký). Lỗi thì ném. */
  abstract exchangeCode(code: string): Promise<GoogleProfile>;
}

/** Bản thật dùng `google-auth-library` (authorization code flow phía server). */
@Injectable()
export class GoogleAuthLibraryClient extends GoogleOAuthClient {
  private readonly clientId?: string;
  private readonly client?: OAuth2Client;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super();
    const clientId = config.get('GOOGLE_CLIENT_ID', { infer: true });
    const clientSecret = config.get('GOOGLE_CLIENT_SECRET', { infer: true });
    const redirectUri = config.get('GOOGLE_CALLBACK_URL', { infer: true });
    if (clientId && clientSecret && redirectUri) {
      this.clientId = clientId;
      this.client = new OAuth2Client({ clientId, clientSecret, redirectUri });
    }
  }

  isConfigured(): boolean {
    return this.client !== undefined;
  }

  authUrl(state: string): string {
    return this.requireClient().generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      // BR-04: người dùng chọn tài khoản Google.
      prompt: 'select_account',
      state,
    });
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    const client = this.requireClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new Error('Google không trả id_token');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('ID token thiếu sub hoặc email');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name,
      picture: payload.picture,
    };
  }

  private requireClient(): OAuth2Client {
    if (!this.client) throw new Error('Google OAuth chưa được cấu hình');
    return this.client;
  }
}

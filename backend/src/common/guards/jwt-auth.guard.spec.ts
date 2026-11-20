import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../decorators/public.decorator.js';
import { AppException } from '../exceptions/app.exception.js';
import { httpContext } from '../../../test/helpers/execution-context.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const SECRET = 'x'.repeat(32);

class TestController {
  @Public()
  open() {}
  closed() {}
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: SECRET });
  const guard = new JwtAuthGuard(new Reflector(), jwt);
  const ctx = (
    headers: Record<string, string>,
    handler = TestController.prototype.closed,
  ) => {
    const request: Record<string, unknown> = { headers };
    return { request, context: httpContext(request, handler, TestController) };
  };

  async function expect401(headers: Record<string, string>) {
    const { context } = ctx(headers);
    const err = await guard.canActivate(context).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppException);
    expect((err as AppException).getStatus()).toBe(401);
    expect((err as AppException).code).toBe('UNAUTHORIZED');
  }

  it('cho qua route @Public() dù không có token', async () => {
    const { context } = ctx({}, TestController.prototype.open);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('từ chối khi thiếu header Authorization', () => expect401({}));

  it('từ chối khi không đúng dạng Bearer', async () => {
    const token = await jwt.signAsync({ sub: 1, role: 'USER' });
    await expect401({ authorization: `Basic ${token}` });
  });

  it('từ chối token ký bằng secret khác', async () => {
    const other = new JwtService({ secret: 'y'.repeat(32) });
    const token = await other.signAsync({ sub: 1, role: 'USER' });
    await expect401({ authorization: `Bearer ${token}` });
  });

  it('từ chối token đã hết hạn', async () => {
    const token = await jwt.signAsync(
      { sub: 1, role: 'USER' },
      { expiresIn: -10 },
    );
    await expect401({ authorization: `Bearer ${token}` });
  });

  it('từ chối payload có role lạ hoặc sub không hợp lệ', async () => {
    await expect401({
      authorization: `Bearer ${await jwt.signAsync({ sub: 1, role: 'ROOT' })}`,
    });
    await expect401({
      authorization: `Bearer ${await jwt.signAsync({ sub: 'abc', role: 'USER' })}`,
    });
  });

  it('token hợp lệ: cho qua và gắn request.user', async () => {
    const token = await jwt.signAsync({ sub: 42, role: 'ADMIN' });
    const { request, context } = ctx({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 42, role: 'ADMIN' });
  });
});

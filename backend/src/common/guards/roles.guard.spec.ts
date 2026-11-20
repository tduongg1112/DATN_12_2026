import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../auth/auth-user.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AppException } from '../exceptions/app.exception.js';
import { httpContext } from '../../../test/helpers/execution-context.js';
import { hasRole, RolesGuard } from './roles.guard.js';

class TestController {
  anyone() {}
  @Roles('USER')
  userArea() {}
  @Roles('ADMIN')
  adminArea() {}
}

describe('hasRole (OQ-22: ADMIN kế thừa USER)', () => {
  it.each([
    ['USER', ['USER'], true],
    ['ADMIN', ['USER'], true],
    ['ADMIN', ['ADMIN'], true],
    ['USER', ['ADMIN'], false],
  ] as const)('%s vào route %j → %s', (role, required, expected) => {
    expect(hasRole(role, required)).toBe(expected);
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const run = (handler: (...a: unknown[]) => unknown, user?: AuthUser) =>
    guard.canActivate(httpContext({ user }, handler, TestController));
  const errorOf = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return e as AppException;
    }
    throw new Error('expected an error');
  };

  it('route không gắn @Roles: cho mọi người đã đăng nhập', () => {
    expect(run(TestController.prototype.anyone, { id: 1, role: 'USER' })).toBe(
      true,
    );
  });

  it('USER vào route USER, ADMIN vào route USER: đều được', () => {
    expect(
      run(TestController.prototype.userArea, { id: 1, role: 'USER' }),
    ).toBe(true);
    expect(
      run(TestController.prototype.userArea, { id: 2, role: 'ADMIN' }),
    ).toBe(true);
  });

  it('USER vào route ADMIN: 403 FORBIDDEN', () => {
    const e = errorOf(() =>
      run(TestController.prototype.adminArea, { id: 1, role: 'USER' }),
    );
    expect(e.getStatus()).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
  });

  it('chưa có user trên request mà route yêu cầu role: 401', () => {
    const e = errorOf(() => run(TestController.prototype.adminArea));
    expect(e.getStatus()).toBe(401);
  });
});

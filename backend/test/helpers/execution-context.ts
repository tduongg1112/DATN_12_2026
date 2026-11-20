import type { ExecutionContext } from '@nestjs/common';

/** ExecutionContext HTTP giả cho unit test guard. */
export function httpContext(
  request: Record<string, unknown>,
  handler: (...args: unknown[]) => unknown,
  cls: abstract new (...args: never[]) => unknown,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => cls,
    getType: () => 'http',
    getArgs: () => [request],
    getArgByIndex: () => request,
  } as unknown as ExecutionContext;
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../common/roles';

/** Injects the logged-in user (set by JwtStrategy.validate). */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as AuthUser;
});

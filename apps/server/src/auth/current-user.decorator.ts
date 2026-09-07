import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  role: 'admin' | 'user';
  preferredLanguage: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
    return request.user || null;
  },
);

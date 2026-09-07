import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { AuthUser } from './current-user.decorator';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: FastifyRequest & { user?: AuthUser | null }, res: FastifyReply, next: () => void) {
    let token: string | undefined;

    // 1. Check HttpOnly cookie
    const cookies = (req as any).cookies as Record<string, string> | undefined;
    if (cookies && cookies['omflix_session']) {
      token = cookies['omflix_session'];
    }

    // 2. Check Authorization Bearer header
    const authHeader = req.headers['authorization'];
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (token) {
      const user = await this.authService.validateSession(token);
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  }
}

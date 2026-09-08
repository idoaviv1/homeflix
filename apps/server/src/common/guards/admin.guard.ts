import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthService } from '../../auth/auth.service';
import { AuthUser } from '../../auth/current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser | null }>();

    let user = request.user;

    // If session middleware did not set req.user, extract and validate token
    if (!user) {
      let token: string | undefined;
      const cookies = (request as any).cookies as Record<string, string> | undefined;
      if (cookies && cookies['omflix_session']) {
        token = cookies['omflix_session'];
      }

      const authHeader = request.headers['authorization'];
      if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token) {
        throw new UnauthorizedException('Authentication token required for admin access');
      }

      user = await this.authService.validateSession(token);
      if (!user) {
        throw new UnauthorizedException('Invalid or expired admin session');
      }

      request.user = user;
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Admin access required. Regular users cannot access this management resource.',
      );
    }

    return true;
  }
}

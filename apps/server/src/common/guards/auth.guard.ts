import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthService } from '../../auth/auth.service';
import { AuthUser } from '../../auth/current-user.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser | null }>();

    // If session middleware already set req.user
    if (request.user) {
      return true;
    }

    // Otherwise extract token manually
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
      throw new UnauthorizedException('Authentication token required');
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired authentication session');
    }

    request.user = user;
    return true;
  }
}

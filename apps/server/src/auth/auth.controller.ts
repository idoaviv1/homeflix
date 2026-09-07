import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Req,
  Res,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { CurrentUser, AuthUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { username: string; password: string; displayName?: string; preferredLanguage?: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const user = await this.authService.register(body);
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const ua = req.headers['user-agent'];
    const session = await this.authService.login(body.username, body.password, ua, ip);

    // Set HttpOnly cookie
    (res as any).setCookie('omflix_session', session.token, {
      path: '/',
      httpOnly: true,
      secure: false, // set true only if HTTPS is used
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return {
      success: true,
      data: {
        user: session.user,
        token: session.token,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const ua = req.headers['user-agent'];
    const session = await this.authService.login(body.username, body.password, ua, ip);

    (res as any).setCookie('omflix_session', session.token, {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        user: session.user,
        token: session.token,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const token =
      (req as any).cookies?.['omflix_session'] ||
      (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].substring(7)
        : '');

    if (token) {
      await this.authService.logout(token);
    }

    (res as any).clearCookie('omflix_session', { path: '/' });

    return {
      success: true,
      data: { message: 'Logged out successfully' },
    };
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser | null) {
    if (!user) {
      return {
        success: true,
        data: {
          anonymous: true,
          user: null,
        },
      };
    }

    return {
      success: true,
      data: {
        anonymous: false,
        user,
      },
    };
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthUser | null,
    @Body() body: { displayName?: string; preferredLanguage?: string; avatarUrl?: string },
  ) {
    if (!user) {
      throw new UnauthorizedException('Must be logged in to update profile');
    }

    const updated = await this.authService.updateProfile(user.id, body);
    return {
      success: true,
      data: { user: updated },
    };
  }
}

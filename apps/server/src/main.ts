// ============================================
// Omflix Server — Main Entry Point
// ============================================
// Starts two Fastify instances:
//   1. Public API on PUBLIC_HOST:PUBLIC_PORT (0.0.0.0:8096)
//   2. Admin API on ADMIN_HOST:ADMIN_PORT (127.0.0.1:8097)
// ============================================

import * as path from 'path';
import * as fs from 'fs';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AdminModule } from './admin/admin.module';
import { AuthService } from './auth/auth.service';
import { SpaFallbackFilter } from './common/filters/spa.filter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // ── Public Application ──
  const publicApp = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        level: process.env['LOG_LEVEL'] || 'info',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
      trustProxy: true,
    }),
  );

  await publicApp.register(require('@fastify/cookie') as any, {
    secret: process.env['SESSION_SECRET'] || 'omflix-cookie-secret-key-development',
  });

  const authService = publicApp.get(AuthService);
  const fastifyInstance = publicApp.getHttpAdapter().getInstance();
  fastifyInstance.addHook('preHandler', async (req: any) => {
    let token: string | undefined;
    if (req.cookies && req.cookies['omflix_session']) {
      token = req.cookies['omflix_session'];
    }
    const authHeader = req.headers['authorization'];
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (token) {
      req.user = await authService.validateSession(token);
    } else {
      req.user = null;
    }
  });

  publicApp.enableCors({
    origin: true, // Allow same-network origins
    credentials: true,
  });

  publicApp.setGlobalPrefix('api/v1');

  // Serve production Web UI assets if built
  const webDistPath = path.resolve(__dirname, '../../../../apps/web/dist');
  if (fs.existsSync(webDistPath)) {
    await publicApp.register(require('@fastify/static') as any, {
      root: webDistPath,
      prefix: '/',
      wildcard: true,
      index: ['index.html'],
      setHeaders: (res: any, filePath: string) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    });
    publicApp.useGlobalFilters(new SpaFallbackFilter(webDistPath));
    logger.log(`📱 Serving Web UI from ${webDistPath}`);
  }

  const publicHost = process.env['PUBLIC_HOST'] || '0.0.0.0';
  const publicPort = parseInt(process.env['PUBLIC_PORT'] || '8096', 10);

  await publicApp.listen(publicPort, publicHost);
  logger.log(`🎬 Homeflix Public API running on http://${publicHost}:${publicPort}`);

  // ── Admin Application (localhost only) ──
  const adminApp = await NestFactory.create<NestFastifyApplication>(
    AdminModule,
    new FastifyAdapter({
      logger: {
        level: process.env['LOG_LEVEL'] || 'info',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
  );

  await adminApp.register(require('@fastify/cookie') as any, {
    secret: process.env['SESSION_SECRET'] || 'omflix-cookie-secret-key-development',
  });

  const adminAuthService = adminApp.get(AuthService);
  const adminFastify = adminApp.getHttpAdapter().getInstance();
  adminFastify.addHook('preHandler', async (req: any) => {
    let token: string | undefined;
    if (req.cookies && req.cookies['omflix_session']) {
      token = req.cookies['omflix_session'];
    }
    const authHeader = req.headers['authorization'];
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (token) {
      req.user = await adminAuthService.validateSession(token);
    } else {
      req.user = null;
    }
  });

  adminApp.enableCors({
    origin: true,
    credentials: true,
  });

  adminApp.setGlobalPrefix('api/v1');

  // CRITICAL: Admin binds ONLY to 127.0.0.1
  const adminHost = '127.0.0.1';
  const adminPort = parseInt(process.env['ADMIN_PORT'] || '8097', 10);

  await adminApp.listen(adminPort, adminHost);
  logger.log(`🔒 Homeflix Admin API running on http://${adminHost}:${adminPort} (localhost only, guarded)`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start Homeflix', err);
  process.exit(1);
});

import { Controller, Get } from '@nestjs/common';

const APP_VERSION = '0.1.0';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      success: true,
      data: {
        status: 'healthy',
        version: APP_VERSION,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    };
  }
}

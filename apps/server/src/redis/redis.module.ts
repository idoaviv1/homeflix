import { Module, Global, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_TOKEN = 'REDIS';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      useFactory: (config: ConfigService) => {
        const redis = new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: parseInt(config.get('REDIS_PORT', '6379'), 10),
          password: config.get('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            const delay = Math.min(times * 200, 5000);
            return delay;
          },
        });
        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);
  private redis?: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get('REDIS_HOST', 'localhost');
    const port = this.config.get('REDIS_PORT', '6379');
    this.logger.log(`Redis connecting to ${host}:${port}`);
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

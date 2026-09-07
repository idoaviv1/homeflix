import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminHealthController } from './admin-health.controller';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    RedisModule,
  ],
  controllers: [AdminHealthController],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminHealthController } from './admin-health.controller';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { StreamingModule } from '../streaming/streaming.module';
import { ScannerModule } from '../scanner/scanner.module';
import { MetadataModule } from '../metadata/metadata.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    RedisModule,
    StreamingModule,
    ScannerModule,
    MetadataModule,
  ],
  controllers: [AdminHealthController, AdminController],
})
export class AdminModule {}

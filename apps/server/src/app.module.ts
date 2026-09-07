import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { MetadataModule } from './metadata/metadata.module';
import { ScannerModule } from './scanner/scanner.module';
import { MediaModule } from './media/media.module';
import { StreamingModule } from './streaming/streaming.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    MetadataModule,
    ScannerModule,
    MediaModule,
    StreamingModule,
  ],
})
export class AppModule {}

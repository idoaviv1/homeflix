import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb, type Database } from '@omflix/database';

export const DATABASE_TOKEN = 'DATABASE';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_TOKEN,
      useFactory: (config: ConfigService) => {
        const url =
          config.get<string>('DATABASE_URL') ||
          `postgresql://${config.get('DATABASE_USER', 'omflix')}:${config.get('DATABASE_PASSWORD')}@${config.get('DATABASE_HOST', 'localhost')}:${config.get('DATABASE_PORT', '5432')}/${config.get('DATABASE_NAME', 'omflix')}`;

        const { db, client } = createDb(url);
        return { db, client };
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      const host = this.config.get('DATABASE_HOST', 'localhost');
      const port = this.config.get('DATABASE_PORT', '5432');
      this.logger.log(`Database connected to ${host}:${port}`);
    } catch (err) {
      this.logger.error('Database connection failed', err);
    }
  }
}

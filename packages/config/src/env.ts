import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('Omflix'),

  // Server
  PUBLIC_PORT: z.coerce.number().default(8096),
  ADMIN_PORT: z.coerce.number().default(8097),
  PUBLIC_HOST: z.string().default('0.0.0.0'),
  ADMIN_HOST: z.string().default('127.0.0.1'),

  // Database
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_NAME: z.string().default('omflix'),
  DATABASE_USER: z.string().default('omflix'),
  DATABASE_PASSWORD: z.string().min(1, 'DATABASE_PASSWORD is required'),
  DATABASE_URL: z.string().optional(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),

  // Auth
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // TMDB
  TMDB_API_KEY: z.string().default(''),
  TMDB_ACCESS_TOKEN: z.string().default(''),

  // Media
  MEDIA_ROOT: z.string().default('/srv/omflix/media'),
  DATA_ROOT: z.string().default('/var/lib/omflix'),

  // Transcoding
  TRANSCODE_HW_ACCEL: z.enum(['auto', 'nvidia', 'cpu']).default('auto'),
  TRANSCODE_CACHE_MAX_GB: z.coerce.number().default(50),
  TRANSCODE_MIN_FREE_DISK_GB: z.coerce.number().default(10),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, string | undefined>): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.format();
    const errors = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => {
        const err = value as { _errors?: string[] };
        return `  ${key}: ${err._errors?.join(', ') ?? 'invalid'}`;
      })
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}

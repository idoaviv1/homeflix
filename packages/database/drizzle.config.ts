import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ||
      `postgresql://${process.env['DATABASE_USER'] || 'omflix'}:${process.env['DATABASE_PASSWORD'] || 'omflix'}@${process.env['DATABASE_HOST'] || 'localhost'}:${process.env['DATABASE_PORT'] || '5432'}/${process.env['DATABASE_NAME'] || 'omflix'}`,
  },
});

import {
  pgTable,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const serverSettings = pgTable('server_settings', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

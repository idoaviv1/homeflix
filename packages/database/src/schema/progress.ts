import {
  pgTable,
  uuid,
  real,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { mediaItems } from './media';
import { episodes } from './media';

export const watchProgress = pgTable(
  'watch_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    mediaItemId: uuid('media_item_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    episodeId: uuid('episode_id')
      .references(() => episodes.id, { onDelete: 'set null' }),
    currentTime: real('current_time').default(0).notNull(),
    duration: real('duration').default(0).notNull(),
    percentage: real('percentage').default(0).notNull(),
    finished: boolean('finished').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_watch_progress_user_media').on(table.userId, table.mediaItemId),
    index('idx_watch_progress_user_id').on(table.userId),
    index('idx_watch_progress_updated').on(table.updatedAt),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    mediaItemId: uuid('media_item_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_favorites_user_id').on(table.userId),
  ],
);

export const watchlist = pgTable(
  'watchlist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    mediaItemId: uuid('media_item_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_watchlist_user_id').on(table.userId),
  ],
);

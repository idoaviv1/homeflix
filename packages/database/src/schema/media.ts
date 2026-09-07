import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const mediaTypeEnum = pgEnum('media_type', ['movie', 'show']);

export const mediaItems = pgTable(
  'media_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: mediaTypeEnum('type').notNull(),
    tmdbId: integer('tmdb_id'),
    imdbId: varchar('imdb_id', { length: 20 }),
    title: varchar('title', { length: 512 }).notNull(),
    titleHe: varchar('title_he', { length: 512 }),
    originalTitle: varchar('original_title', { length: 512 }),
    slug: varchar('slug', { length: 512 }),
    overview: text('overview'),
    overviewHe: text('overview_he'),
    tagline: text('tagline'),
    releaseDate: varchar('release_date', { length: 10 }),
    year: integer('year'),
    runtime: integer('runtime'), // minutes
    rating: real('rating'),
    voteCount: integer('vote_count'),
    popularity: real('popularity'),
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    logoPath: text('logo_path'),
    genres: jsonb('genres').$type<string[]>().default([]),
    cast: jsonb('cast').$type<Array<{ name: string; character: string; profilePath: string | null }>>().default([]),
    crew: jsonb('crew').$type<Array<{ name: string; job: string; profilePath: string | null }>>().default([]),
    trailerKey: varchar('trailer_key', { length: 32 }),
    collectionId: integer('collection_id'),
    collectionName: varchar('collection_name', { length: 256 }),
    status: varchar('status', { length: 32 }),
    inLibrary: boolean('in_library').default(false).notNull(),
    matchConfidence: real('match_confidence'),
    manualMatch: boolean('manual_match').default(false).notNull(),
    metadataUpdatedAt: timestamp('metadata_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_media_items_tmdb_id').on(table.tmdbId),
    index('idx_media_items_type').on(table.type),
    index('idx_media_items_title').on(table.title),
    index('idx_media_items_year').on(table.year),
    index('idx_media_items_in_library').on(table.inLibrary),
    index('idx_media_items_slug').on(table.slug),
  ],
);

export const seasons = pgTable(
  'seasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    showId: uuid('show_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    tmdbId: integer('tmdb_id'),
    seasonNumber: integer('season_number').notNull(),
    name: varchar('name', { length: 256 }),
    overview: text('overview'),
    posterPath: text('poster_path'),
    episodeCount: integer('episode_count'),
    airDate: varchar('air_date', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_seasons_show_id').on(table.showId),
  ],
);

export const episodes = pgTable(
  'episodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    showId: uuid('show_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    seasonId: uuid('season_id')
      .references(() => seasons.id, { onDelete: 'cascade' })
      .notNull(),
    tmdbId: integer('tmdb_id'),
    seasonNumber: integer('season_number').notNull(),
    episodeNumber: integer('episode_number').notNull(),
    title: varchar('title', { length: 512 }),
    overview: text('overview'),
    stillPath: text('still_path'),
    runtime: integer('runtime'),
    airDate: varchar('air_date', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_episodes_show_id').on(table.showId),
    index('idx_episodes_season_id').on(table.seasonId),
  ],
);

export const mediaFiles = pgTable(
  'media_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaItemId: uuid('media_item_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    episodeId: uuid('episode_id')
      .references(() => episodes.id, { onDelete: 'set null' }),
    filePath: text('file_path').unique().notNull(),
    fileName: text('file_name').notNull(),
    fileSize: text('file_size'), // stored as text to handle bigint
    container: varchar('container', { length: 16 }),
    duration: real('duration'), // seconds
    videoCodec: varchar('video_codec', { length: 32 }),
    videoProfile: varchar('video_profile', { length: 64 }),
    videoBitrate: integer('video_bitrate'),
    width: integer('width'),
    height: integer('height'),
    framerate: real('framerate'),
    isHdr: boolean('is_hdr').default(false),
    hdrFormat: varchar('hdr_format', { length: 32 }),
    audioStreams: jsonb('audio_streams').$type<Array<{
      index: number;
      codec: string;
      channels: number;
      language: string | null;
      title: string | null;
      isDefault: boolean;
    }>>().default([]),
    subtitleStreams: jsonb('subtitle_streams').$type<Array<{
      index: number;
      codec: string;
      language: string | null;
      title: string | null;
      isForced: boolean;
      isDefault: boolean;
    }>>().default([]),
    probeData: jsonb('probe_data'),
    lastScannedAt: timestamp('last_scanned_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_media_files_media_item_id').on(table.mediaItemId),
    index('idx_media_files_episode_id').on(table.episodeId),
    index('idx_media_files_file_path').on(table.filePath),
  ],
);

export const searchAliases = pgTable(
  'search_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaItemId: uuid('media_item_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 512 }).notNull(),
    source: varchar('source', { length: 32 }).default('manual').notNull(), // manual, filename, tmdb
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_search_aliases_alias').on(table.alias),
    index('idx_search_aliases_media_item_id').on(table.mediaItemId),
  ],
);

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tmdbId: integer('tmdb_id'),
  name: varchar('name', { length: 256 }).notNull(),
  overview: text('overview'),
  posterPath: text('poster_path'),
  backdropPath: text('backdrop_path'),
  isCustom: boolean('is_custom').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const collectionItems = pgTable(
  'collection_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collectionId: uuid('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    mediaItemId: uuid('media_item_id')
      .references(() => mediaItems.id, { onDelete: 'cascade' })
      .notNull(),
    sortOrder: integer('sort_order').default(0),
  },
  (table) => [
    index('idx_collection_items_collection_id').on(table.collectionId),
  ],
);

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Inject,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import { sql, eq, desc } from 'drizzle-orm';
import {
  mediaItems,
  episodes,
  mediaFiles,
  users,
  serverSettings,
  searchAliases,
  type Database,
} from '@omflix/database';
import { DATABASE_TOKEN } from '../database/database.module';
import { REDIS_TOKEN } from '../redis/redis.module';
import { StreamingService } from '../streaming/streaming.service';
import { ScannerService } from '../scanner/scanner.service';
import { MetadataService } from '../metadata/metadata.service';

@Controller()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly dbContext: { db: Database },
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly streamingService: StreamingService,
    private readonly scannerService: ScannerService,
    private readonly metadataService: MetadataService,
  ) {}

  private get db() {
    return this.dbContext.db;
  }

  // --- Active Streams ---
  @Get('streams')
  getActiveStreams() {
    return {
      success: true,
      data: this.streamingService.getActiveStreams(),
    };
  }

  // --- Library Summary ---
  @Get('library/summary')
  async getLibrarySummary() {
    const [movieCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'movie'));

    const [showCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'show'));

    const [episodeCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(episodes);

    const [fileCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaFiles);

    const unmatchedFiles = await this.db
      .select({
        id: mediaItems.id,
        title: mediaItems.title,
        year: mediaItems.year,
        manualMatch: mediaItems.manualMatch,
      })
      .from(mediaItems)
      .where(sql`${mediaItems.tmdbId} IS NULL`)
      .limit(50);

    return {
      success: true,
      data: {
        movies: movieCount?.count || 0,
        shows: showCount?.count || 0,
        episodes: episodeCount?.count || 0,
        mediaFiles: fileCount?.count || 0,
        unmatchedItems: unmatchedFiles,
        scannerStatus: this.scannerService.getStatus(),
      },
    };
  }

  // --- Scan Trigger ---
  @Post('library/scan')
  triggerScan() {
    this.scannerService.scanAll().catch((err) =>
      this.logger.error('Manual scan failed', err),
    );
    return {
      success: true,
      data: {
        message: 'Library scan triggered',
        status: this.scannerService.getStatus(),
      },
    };
  }

  // --- Fix Match ---
  @Post('library/fix-match')
  async fixMatch(
    @Body() body: { mediaItemId: string; tmdbId: number; type: 'movie' | 'show'; customAlias?: string },
  ) {
    const res = await this.scannerService.fixMatch(
      body.mediaItemId,
      body.tmdbId,
      body.type,
      body.customAlias,
    );
    return {
      success: true,
      data: res,
    };
  }

  // --- Users List & Management ---
  @Get('users')
  async getUsers() {
    const list = await this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return {
      success: true,
      data: list,
    };
  }

  @Put('users/:id/toggle')
  async toggleUserActive(@Param('id') userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const [updated] = await this.db
      .update(users)
      .set({ isActive: !user.isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return {
      success: true,
      data: updated,
    };
  }

  // --- Settings ---
  @Get('settings')
  async getSettings() {
    const all = await this.db.select().from(serverSettings);
    const settingsMap: Record<string, string> = {};
    for (const s of all) {
      settingsMap[s.key] = s.value;
    }
    return {
      success: true,
      data: settingsMap,
    };
  }

  @Put('settings')
  async updateSettings(@Body() body: Record<string, string>) {
    for (const [key, value] of Object.entries(body)) {
      if (key === 'TMDB_API_KEY') {
        await this.metadataService.setApiKey(value);
      } else {
        await this.db
          .insert(serverSettings)
          .values({
            key,
            value: String(value),
          })
          .onConflictDoUpdate({
            target: serverSettings.key,
            set: { value: String(value), updatedAt: new Date() },
          });
      }
    }

    return {
      success: true,
      data: { message: 'Settings updated successfully' },
    };
  }

  // --- Maintenance ---
  @Post('maintenance/clear-cache')
  async clearCache() {
    // Clear Redis cache keys
    try {
      const keys = await this.redis.keys('omflix:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`Redis clear cache error: ${err}`);
    }

    // Clean transcode directory
    const transcodeDir = '/media/windows/omflix/transcodes';
    if (fs.existsSync(transcodeDir)) {
      try {
        const entries = fs.readdirSync(transcodeDir);
        for (const entry of entries) {
          const entryPath = path.join(transcodeDir, entry);
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      } catch (err) {
        this.logger.warn(`Transcode cleanup error: ${err}`);
      }
    }

    return {
      success: true,
      data: { message: 'Caches cleared successfully' },
    };
  }
}

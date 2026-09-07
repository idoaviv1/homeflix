import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { eq, and, inArray } from 'drizzle-orm';
import {
  mediaItems,
  seasons,
  episodes,
  mediaFiles,
  searchAliases,
  type Database,
} from '@omflix/database';
import { DATABASE_TOKEN } from '../database/database.module';
import { MetadataService } from '../metadata/metadata.service';
import { ProbeService } from './probe.service';
import { parseMediaFilename } from './name-parser';

export const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.webm', '.avi', '.mov', '.m4v', '.ts']);

export interface ScannerStatus {
  isScanning: boolean;
  scannedCount: number;
  totalDiscovered: number;
  currentFile?: string;
  lastScanDurationMs?: number;
  lastScanCompletedAt?: string;
  errors: string[];
}

@Injectable()
export class ScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerService.name);
  private mediaRoot: string;
  private watcher?: chokidar.FSWatcher;
  private status: ScannerStatus = {
    isScanning: false,
    scannedCount: 0,
    totalDiscovered: 0,
    errors: [],
  };

  constructor(
    private readonly config: ConfigService,
    @Inject(DATABASE_TOKEN) private readonly dbContext: { db: Database },
    private readonly metadataService: MetadataService,
    private readonly probeService: ProbeService,
  ) {
    this.mediaRoot = this.config.get<string>('MEDIA_ROOT', '/media/windows/omflix/media');
  }

  private get db() {
    return this.dbContext.db;
  }

  async onModuleInit() {
    // Ensure media root exists
    if (!fs.existsSync(this.mediaRoot)) {
      try {
        fs.mkdirSync(this.mediaRoot, { recursive: true });
      } catch (err) {
        this.logger.warn(`Could not create MEDIA_ROOT ${this.mediaRoot}: ${err}`);
      }
    }

    // Start filesystem watcher
    this.startWatcher();

    // Trigger initial scan in background after 2 seconds
    setTimeout(() => {
      this.scanAll().catch((err) => this.logger.error('Initial scan error', err));
    }, 2000);
  }

  async onModuleDestroy() {
    if (this.watcher) {
      await this.watcher.close();
    }
  }

  getStatus(): ScannerStatus {
    return { ...this.status };
  }

  private startWatcher() {
    if (!fs.existsSync(this.mediaRoot)) return;

    try {
      this.watcher = chokidar.watch(this.mediaRoot, {
        ignored: /(^|[\/\\])\../, // ignore hidden files
        persistent: true,
        ignoreInitial: true,
        depth: 5,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 500,
        },
      });

      this.watcher.on('add', (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          this.logger.log(`File added: ${filePath}`);
          this.processFile(filePath).catch((err) =>
            this.logger.error(`Error processing added file ${filePath}`, err),
          );
        }
      });

      this.watcher.on('unlink', (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          this.logger.log(`File removed: ${filePath}`);
          this.handleFileRemoval(filePath).catch((err) =>
            this.logger.error(`Error removing file ${filePath}`, err),
          );
        }
      });

      this.logger.log(`Filesystem watcher listening on ${this.mediaRoot}`);
    } catch (err) {
      this.logger.warn(`Could not start file watcher on ${this.mediaRoot}`, err);
    }
  }

  async scanAll(): Promise<ScannerStatus> {
    if (this.status.isScanning) {
      return this.status;
    }

    const startTime = Date.now();
    this.status = {
      isScanning: true,
      scannedCount: 0,
      totalDiscovered: 0,
      errors: [],
    };

    this.logger.log(`Starting media library scan in ${this.mediaRoot}`);

    try {
      const files: string[] = [];
      this.findMediaFilesRecursive(this.mediaRoot, files);
      this.status.totalDiscovered = files.length;
      this.logger.log(`Discovered ${files.length} media files to inspect`);

      for (const file of files) {
        this.status.currentFile = path.basename(file);
        try {
          await this.processFile(file);
          this.status.scannedCount++;
        } catch (err: any) {
          const errMsg = `Error scanning ${file}: ${err?.message || err}`;
          this.logger.error(errMsg);
          this.status.errors.push(errMsg);
        }
      }

      // Check for removed files in DB
      await this.cleanMissingFiles(new Set(files));

      const duration = Date.now() - startTime;
      this.status.isScanning = false;
      this.status.currentFile = undefined;
      this.status.lastScanDurationMs = duration;
      this.status.lastScanCompletedAt = new Date().toISOString();

      this.logger.log(
        `Library scan completed in ${Math.round(duration / 1000)}s. Processed ${this.status.scannedCount} files.`,
      );
    } catch (err: any) {
      this.status.isScanning = false;
      this.status.errors.push(`Scan aborted: ${err?.message || err}`);
      this.logger.error('Library scan failed', err);
    }

    return this.status;
  }

  private findMediaFilesRecursive(dir: string, fileList: string[]) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.findMediaFilesRecursive(fullPath, fileList);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          fileList.push(fullPath);
        }
      }
    }
  }

  async processFile(filePath: string) {
    // 1. Check if media file already exists
    const [existingFile] = await this.db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.filePath, filePath))
      .limit(1);

    if (existingFile) {
      // File already recorded
      return;
    }

    // 2. Parse filename
    const parsed = parseMediaFilename(filePath);
    const probe = await this.probeService.probe(filePath);
    if (!probe) {
      throw new Error(`FFprobe failed to inspect ${filePath}`);
    }

    // 3. Check for manual alias mapping
    const baseName = path.basename(filePath);
    const [manualAlias] = await this.db
      .select()
      .from(searchAliases)
      .where(eq(searchAliases.alias, baseName))
      .limit(1);

    if (parsed.type === 'movie') {
      await this.processMovie(filePath, parsed.title, parsed.year, probe, manualAlias?.mediaItemId);
    } else {
      await this.processEpisode(filePath, parsed, probe, manualAlias?.mediaItemId);
    }
  }

  private async processMovie(
    filePath: string,
    title: string,
    year: number | undefined,
    probe: any,
    manualItemId?: string,
  ) {
    let mediaItemId: string;

    if (manualItemId) {
      mediaItemId = manualItemId;
    } else {
      // Look for existing movie in DB with same title & year
      const existing = await this.db
        .select()
        .from(mediaItems)
        .where(
          and(
            eq(mediaItems.type, 'movie'),
            eq(mediaItems.title, title),
          ),
        )
        .limit(1);

      const existingItem = existing[0];
      if (existingItem) {
        mediaItemId = existingItem.id;
        await this.db
          .update(mediaItems)
          .set({ inLibrary: true, updatedAt: new Date() })
          .where(eq(mediaItems.id, mediaItemId));
      } else {
        // Fetch metadata
        const meta = await this.metadataService.fetchMovieMetadata(title, year);
        const [inserted] = await this.db
          .insert(mediaItems)
          .values({
            type: 'movie',
            tmdbId: meta.tmdbId,
            imdbId: meta.imdbId,
            title: meta.title,
            titleHe: meta.titleHe,
            originalTitle: meta.originalTitle,
            overview: meta.overview,
            overviewHe: meta.overviewHe,
            tagline: meta.tagline,
            releaseDate: meta.releaseDate,
            year: meta.year || year,
            runtime: meta.runtime || Math.round(probe.duration / 60),
            rating: meta.rating,
            voteCount: meta.voteCount,
            popularity: meta.popularity,
            posterPath: meta.posterPath,
            backdropPath: meta.backdropPath,
            logoPath: meta.logoPath,
            genres: meta.genres,
            cast: meta.cast,
            crew: meta.crew,
            trailerKey: meta.trailerKey,
            collectionId: meta.collectionId,
            collectionName: meta.collectionName,
            status: meta.status,
            inLibrary: true,
          })
          .returning();
        if (!inserted) {
          throw new Error(`Failed to insert movie ${title}`);
        }
        mediaItemId = inserted.id;
      }
    }

    // Insert media file record
    await this.db
      .insert(mediaFiles)
      .values({
        mediaItemId,
        filePath,
        fileName: path.basename(filePath),
        fileSize: probe.fileSize,
        container: probe.container,
        duration: probe.duration,
        videoCodec: probe.videoCodec,
        videoProfile: probe.videoProfile,
        videoBitrate: probe.videoBitrate,
        width: probe.width,
        height: probe.height,
        framerate: probe.framerate,
        isHdr: probe.isHdr,
        hdrFormat: probe.hdrFormat,
        audioStreams: probe.audioStreams,
        subtitleStreams: probe.subtitleStreams,
        probeData: probe.raw,
      })
      .onConflictDoUpdate({
        target: mediaFiles.filePath,
        set: {
          fileSize: probe.fileSize,
          duration: probe.duration,
          lastScannedAt: new Date(),
        },
      });

    this.logger.log(`Indexed movie: ${title} (${year || 'unknown'})`);
  }

  private async processEpisode(
    filePath: string,
    parsed: {
      showTitle: string;
      year?: number;
      seasonNumber: number;
      episodeNumber: number;
      episodeTitle?: string;
    },
    probe: any,
    manualItemId?: string,
  ) {
    let showId: string;

    if (manualItemId) {
      showId = manualItemId;
    } else {
      const existing = await this.db
        .select()
        .from(mediaItems)
        .where(
          and(
            eq(mediaItems.type, 'show'),
            eq(mediaItems.title, parsed.showTitle),
          ),
        )
        .limit(1);

      const existingShow = existing[0];
      if (existingShow) {
        showId = existingShow.id;
        await this.db
          .update(mediaItems)
          .set({ inLibrary: true, updatedAt: new Date() })
          .where(eq(mediaItems.id, showId));
      } else {
        const meta = await this.metadataService.fetchShowMetadata(parsed.showTitle, parsed.year);
        const [inserted] = await this.db
          .insert(mediaItems)
          .values({
            type: 'show',
            tmdbId: meta.tmdbId,
            title: meta.title,
            originalTitle: meta.originalTitle,
            overview: meta.overview,
            tagline: meta.tagline,
            releaseDate: meta.releaseDate,
            year: meta.year || parsed.year,
            rating: meta.rating,
            voteCount: meta.voteCount,
            popularity: meta.popularity,
            posterPath: meta.posterPath,
            backdropPath: meta.backdropPath,
            genres: meta.genres,
            cast: meta.cast,
            crew: meta.crew,
            trailerKey: meta.trailerKey,
            status: meta.status,
            inLibrary: true,
          })
          .returning();
        if (!inserted) {
          throw new Error(`Failed to insert show ${parsed.showTitle}`);
        }
        showId = inserted.id;
      }
    }

    // Find or create season
    let seasonId: string;
    const [existingSeason] = await this.db
      .select()
      .from(seasons)
      .where(
        and(
          eq(seasons.showId, showId),
          eq(seasons.seasonNumber, parsed.seasonNumber),
        ),
      )
      .limit(1);

    if (existingSeason) {
      seasonId = existingSeason.id;
    } else {
      const [insertedSeason] = await this.db
        .insert(seasons)
        .values({
          showId,
          seasonNumber: parsed.seasonNumber,
          name: `Season ${parsed.seasonNumber}`,
        })
        .returning();
      if (!insertedSeason) {
        throw new Error(`Failed to insert season ${parsed.seasonNumber}`);
      }
      seasonId = insertedSeason.id;
    }

    // Find or create episode
    let episodeId: string;
    const [existingEpisode] = await this.db
      .select()
      .from(episodes)
      .where(
        and(
          eq(episodes.showId, showId),
          eq(episodes.seasonId, seasonId),
          eq(episodes.episodeNumber, parsed.episodeNumber),
        ),
      )
      .limit(1);

    if (existingEpisode) {
      episodeId = existingEpisode.id;
    } else {
      const [insertedEpisode] = await this.db
        .insert(episodes)
        .values({
          showId,
          seasonId,
          seasonNumber: parsed.seasonNumber,
          episodeNumber: parsed.episodeNumber,
          title: parsed.episodeTitle || `Episode ${parsed.episodeNumber}`,
          runtime: Math.round(probe.duration / 60),
        })
        .returning();
      if (!insertedEpisode) {
        throw new Error(`Failed to insert episode ${parsed.episodeNumber}`);
      }
      episodeId = insertedEpisode.id;
    }

    // Insert media file
    await this.db
      .insert(mediaFiles)
      .values({
        mediaItemId: showId,
        episodeId,
        filePath,
        fileName: path.basename(filePath),
        fileSize: probe.fileSize,
        container: probe.container,
        duration: probe.duration,
        videoCodec: probe.videoCodec,
        videoProfile: probe.videoProfile,
        videoBitrate: probe.videoBitrate,
        width: probe.width,
        height: probe.height,
        framerate: probe.framerate,
        isHdr: probe.isHdr,
        hdrFormat: probe.hdrFormat,
        audioStreams: probe.audioStreams,
        subtitleStreams: probe.subtitleStreams,
        probeData: probe.raw,
      })
      .onConflictDoUpdate({
        target: mediaFiles.filePath,
        set: {
          fileSize: probe.fileSize,
          duration: probe.duration,
          lastScannedAt: new Date(),
        },
      });

    this.logger.log(
      `Indexed episode: ${parsed.showTitle} S${parsed.seasonNumber}E${parsed.episodeNumber}`,
    );
  }

  private async handleFileRemoval(filePath: string) {
    const [removed] = await this.db
      .delete(mediaFiles)
      .where(eq(mediaFiles.filePath, filePath))
      .returning();

    if (removed) {
      // Check if media item has any remaining files
      const remaining = await this.db
        .select()
        .from(mediaFiles)
        .where(eq(mediaFiles.mediaItemId, removed.mediaItemId))
        .limit(1);

      if (remaining.length === 0) {
        await this.db
          .update(mediaItems)
          .set({ inLibrary: false, updatedAt: new Date() })
          .where(eq(mediaItems.id, removed.mediaItemId));
      }
    }
  }

  private async cleanMissingFiles(existingDiskFiles: Set<string>) {
    const allDbFiles = await this.db.select({ id: mediaFiles.id, filePath: mediaFiles.filePath, mediaItemId: mediaFiles.mediaItemId }).from(mediaFiles);
    for (const f of allDbFiles) {
      if (!existingDiskFiles.has(f.filePath)) {
        this.logger.log(`Cleaning deleted file from DB: ${f.filePath}`);
        await this.handleFileRemoval(f.filePath);
      }
    }
  }

  async fixMatch(mediaItemId: string, tmdbId: number, type: 'movie' | 'show', customAlias?: string) {
    let meta;
    if (type === 'movie') {
      const detailsUrl = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
      const apiKey = this.config.get('TMDB_API_KEY');
      if (apiKey) detailsUrl.searchParams.set('api_key', apiKey);
      const res = await fetch(detailsUrl.toString());
      const data = res.ok ? ((await res.json()) as any) : null;
      if (data) {
        meta = {
          title: data.title,
          overview: data.overview,
          posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : undefined,
          backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : undefined,
          releaseDate: data.release_date,
          year: data.release_date ? parseInt(data.release_date.split('-')[0], 10) : undefined,
          rating: data.vote_average,
        };
      }
    }

    if (meta) {
      await this.db
        .update(mediaItems)
        .set({
          tmdbId,
          title: meta.title,
          overview: meta.overview,
          posterPath: meta.posterPath,
          backdropPath: meta.backdropPath,
          year: meta.year,
          rating: meta.rating,
          manualMatch: true,
          updatedAt: new Date(),
        })
        .where(eq(mediaItems.id, mediaItemId));
    }

    if (customAlias) {
      await this.db.insert(searchAliases).values({
        mediaItemId,
        alias: customAlias,
        source: 'manual',
      });
    }

    return { success: true };
  }
}

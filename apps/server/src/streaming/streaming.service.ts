import { Injectable, Inject, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { eq } from 'drizzle-orm';
import { mediaFiles, mediaItems, type Database } from '@omflix/database';
import { DATABASE_TOKEN } from '../database/database.module';

export interface ActiveStream {
  id: string;
  mediaFileId: string;
  title: string;
  clientIp: string;
  userId?: string;
  username?: string;
  isTranscoding: boolean;
  quality: string;
  videoCodec: string;
  audioCodec: string;
  startedAt: Date;
  lastPing: Date;
  bitrate?: number;
  fps?: number;
}

export interface QualityProfile {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  maxrate: string;
  bufsize: string;
  bandwidth: number;
}

export const QUALITY_PROFILES: Record<string, QualityProfile> = {
  '1080p': {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: '4500k',
    maxrate: '5000k',
    bufsize: '9000k',
    bandwidth: 5000000,
  },
  '720p': {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: '2500k',
    maxrate: '3000k',
    bufsize: '5000k',
    bandwidth: 2800000,
  },
  '480p': {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1000k',
    maxrate: '1200k',
    bufsize: '2000k',
    bandwidth: 1200000,
  },
};

@Injectable()
export class StreamingService implements OnModuleInit {
  private readonly logger = new Logger(StreamingService.name);
  private transcodeDir: string;
  private activeStreams: Map<string, ActiveStream> = new Map();
  private transcodeJobs: Map<string, ChildProcess> = new Map();
  private hasNvenc = true;

  constructor(
    private readonly config: ConfigService,
    @Inject(DATABASE_TOKEN) private readonly dbContext: { db: Database },
  ) {
    this.transcodeDir = this.config.get<string>(
      'TRANSCODE_DIR',
      '/media/windows/omflix/transcodes',
    );
  }

  private get db() {
    return this.dbContext.db;
  }

  async onModuleInit() {
    if (!fs.existsSync(this.transcodeDir)) {
      try {
        fs.mkdirSync(this.transcodeDir, { recursive: true });
      } catch (err) {
        this.logger.warn(`Could not create transcode dir: ${err}`);
      }
    }

    // Periodic cleanup of idle streams & old transcodes
    setInterval(() => this.cleanupIdleStreams(), 30000);
  }

  getActiveStreams(): ActiveStream[] {
    return Array.from(this.activeStreams.values());
  }

  recordPing(streamId: string) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.lastPing = new Date();
    }
  }

  private cleanupIdleStreams() {
    const now = Date.now();
    for (const [id, stream] of this.activeStreams.entries()) {
      // 60 seconds without ping = stream closed
      if (now - stream.lastPing.getTime() > 60000) {
        this.logger.log(`Active stream timed out: ${stream.title} (${stream.id})`);
        this.activeStreams.delete(id);

        const job = this.transcodeJobs.get(id);
        if (job) {
          job.kill('SIGTERM');
          this.transcodeJobs.delete(id);
        }
      }
    }
  }

  async getMediaFile(fileId: string) {
    const [file] = await this.db
      .select({
        file: mediaFiles,
        item: mediaItems,
      })
      .from(mediaFiles)
      .innerJoin(mediaItems, eq(mediaFiles.mediaItemId, mediaItems.id))
      .where(eq(mediaFiles.id, fileId))
      .limit(1);

    if (!file) {
      throw new NotFoundException('Media file not found');
    }

    if (!fs.existsSync(file.file.filePath)) {
      throw new NotFoundException('Media file not found on storage disk');
    }

    return file;
  }

  // --- Direct Play Range Streaming ---
  async getDirectStream(
    fileId: string,
    rangeHeader?: string,
    clientIp = '127.0.0.1',
    user?: { id: string; username: string },
  ) {
    const record = await this.getMediaFile(fileId);
    const filePath = record.file.filePath;
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Track active stream
    const streamId = `direct_${fileId}_${clientIp}`;
    this.activeStreams.set(streamId, {
      id: streamId,
      mediaFileId: fileId,
      title: record.item.title,
      clientIp,
      userId: user?.id,
      username: user?.username,
      isTranscoding: false,
      quality: 'Original',
      videoCodec: record.file.videoCodec || 'h264',
      audioCodec: record.file.audioStreams?.[0]?.codec || 'aac',
      startedAt: new Date(),
      lastPing: new Date(),
    });

    let mimeType = 'video/mp4';
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.mkv') mimeType = 'video/x-matroska';
    else if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.mov') mimeType = 'video/quicktime';

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });

      return {
        stream,
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  // --- HLS Master Playlist ---
  async getMasterPlaylist(fileId: string): Promise<string> {
    const record = await this.getMediaFile(fileId);
    const width = record.file.width || 1920;

    let playlist = '#EXTM3U\n#EXT-X-VERSION:6\n';

    for (const [key, profile] of Object.entries(QUALITY_PROFILES)) {
      if (profile && (profile.width <= width || key === '480p')) {
        playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${profile.bandwidth},RESOLUTION=${profile.width}x${profile.height},NAME="${profile.name}"\n`;
        playlist += `variant/${key}/index.m3u8\n`;
      }
    }

    return playlist;
  }

  // --- HLS On-Demand Transcoding ---
  async ensureVariantPlaylist(
    fileId: string,
    quality: string,
    clientIp = '127.0.0.1',
    user?: { id: string; username: string },
  ): Promise<string> {
    const defaultProfile: QualityProfile = {
      name: '720p',
      width: 1280,
      height: 720,
      videoBitrate: '2500k',
      maxrate: '3000k',
      bufsize: '5000k',
      bandwidth: 2800000,
    };
    const profile: QualityProfile = QUALITY_PROFILES[quality] || defaultProfile;
    const record = await this.getMediaFile(fileId);
    const outDir = path.join(this.transcodeDir, fileId, profile.name);
    const playlistFile = path.join(outDir, 'index.m3u8');

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Register active stream
    const streamId = `hls_${fileId}_${profile.name}_${clientIp}`;
    this.activeStreams.set(streamId, {
      id: streamId,
      mediaFileId: fileId,
      title: record.item.title,
      clientIp,
      userId: user?.id,
      username: user?.username,
      isTranscoding: true,
      quality: profile.name,
      videoCodec: this.hasNvenc ? 'h264_nvenc (NVIDIA)' : 'libx264 (CPU)',
      audioCodec: 'aac',
      startedAt: new Date(),
      lastPing: new Date(),
      bitrate: profile.bandwidth,
    });

    // Check if transcode is already running or complete
    if (fs.existsSync(playlistFile)) {
      return playlistFile;
    }

    // Launch FFmpeg HLS transcode with NVENC hardware acceleration
    this.startHlsTranscode(record.file.filePath, outDir, playlistFile, profile, streamId);

    // Wait up to 5 seconds for initial playlist generation
    for (let i = 0; i < 25; i++) {
      if (fs.existsSync(playlistFile) && fs.statSync(playlistFile).size > 0) {
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    return playlistFile;
  }

  private startHlsTranscode(
    inputPath: string,
    outDir: string,
    playlistFile: string,
    profile: QualityProfile,
    streamId: string,
  ) {
    if (this.transcodeJobs.has(streamId)) {
      return;
    }

    const segmentPattern = path.join(outDir, 'segment_%03d.ts');

    // Build FFmpeg args
    const baseArgs = [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
    ];

    let vcodecArgs: string[] = [];
    if (this.hasNvenc) {
      vcodecArgs = [
        '-hwaccel', 'cuda',
        '-hwaccel_output_format', 'cuda',
        '-i', inputPath,
        '-vf', `scale_cuda=${profile.width}:${profile.height}`,
        '-c:v', 'h264_nvenc',
        '-preset', 'p4',
        '-tune', 'hq',
        '-rc', 'vbr',
        '-b:v', profile.videoBitrate,
        '-maxrate', profile.maxrate,
        '-bufsize', profile.bufsize,
      ];
    } else {
      vcodecArgs = [
        '-i', inputPath,
        '-vf', `scale=${profile.width}:${profile.height}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', profile.videoBitrate,
        '-maxrate', profile.maxrate,
        '-bufsize', profile.bufsize,
      ];
    }

    const hlsArgs = [
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ac', '2',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPattern,
      playlistFile,
    ];

    const fullArgs = [...baseArgs, ...vcodecArgs, ...hlsArgs];
    this.logger.log(`Starting FFmpeg transcode for ${profile.name} (${this.hasNvenc ? 'NVENC' : 'CPU'})`);

    const ffmpegProc = spawn('ffmpeg', fullArgs);
    this.transcodeJobs.set(streamId, ffmpegProc);

    ffmpegProc.stderr.on('data', (data) => {
      this.logger.debug(`FFmpeg: ${data.toString()}`);
    });

    ffmpegProc.on('error', (err) => {
      this.logger.error(`FFmpeg process error: ${err}`);
      if (this.hasNvenc) {
        this.logger.warn('NVENC failed, switching to CPU fallback for future streams');
        this.hasNvenc = false;
      }
      this.transcodeJobs.delete(streamId);
    });

    ffmpegProc.on('exit', (code) => {
      this.logger.log(`FFmpeg transcode completed (exit code ${code})`);
      this.transcodeJobs.delete(streamId);
    });
  }

  // --- Subtitle Track Extraction to WebVTT ---
  async extractSubtitleTrack(fileId: string, streamIndex: number) {
    const record = await this.getMediaFile(fileId);
    const filePath = record.file.filePath;

    // Run ffmpeg to extract subtitle stream to stdout as WebVTT
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', filePath,
      '-map', `0:${streamIndex}`,
      '-f', 'webvtt',
      'pipe:1',
    ]);

    return ffmpeg.stdout;
  }
}

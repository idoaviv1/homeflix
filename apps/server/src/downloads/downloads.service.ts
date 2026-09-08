import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import { eq } from 'drizzle-orm';
import { serverSettings, type Database } from '@omflix/database';
import { REDIS_TOKEN } from '../redis/redis.module';
import { DATABASE_TOKEN } from '../database/database.module';
import { ScannerService } from '../scanner/scanner.service';

export interface DownloadRelease {
  id: string; // infoHash or release id
  title: string;
  quality: string; // '4K' | '1080p' | '720p' | 'Other'
  size: string;
  seeds: number;
  source: string;
  magnetUrl: string;
  infoHash: string;
}

export interface DownloadJob {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  year?: number;
  quality?: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  downloadSpeed: string; // e.g. "4.2 MB/s"
  downloadedSize: string; // e.g. "1.2 GB"
  totalSize: string; // e.g. "2.4 GB"
  eta: string; // e.g. "5m 20s"
  peers: number;
  errorMessage?: string;
  destinationPath: string;
  createdAt: string;
  completedAt?: string;
}

const PUBLIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
];

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
}

function buildMagnet(infoHash: string, title: string): string {
  const trParams = PUBLIC_TRACKERS.map((t) => `tr=${encodeURIComponent(t)}`).join('&');
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}&${trParams}`;
}

@Injectable()
export class DownloadsService implements OnModuleDestroy {
  private readonly logger = new Logger(DownloadsService.name);
  private mediaRoot: string;
  private activeJobs = new Map<string, DownloadJob>();
  private processes = new Map<string, ChildProcess>();

  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(DATABASE_TOKEN) private readonly dbContext: { db: Database },
    private readonly scannerService: ScannerService,
  ) {
    this.mediaRoot = this.config.get<string>('MEDIA_ROOT', '/media/windows/omflix/media');
  }

  onModuleDestroy() {
    for (const [id, proc] of this.processes.entries()) {
      try {
        proc.kill('SIGTERM');
      } catch (err) {
        this.logger.error(`Failed to kill process for download ${id}:`, err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Real-Debrid API Key Management
  // ---------------------------------------------------------------------------
  async getRealDebridApiKey(): Promise<string | null> {
    const envKey = this.config.get<string>('REAL_DEBRID_API_KEY');
    if (envKey) return envKey;
    try {
      const [setting] = await this.dbContext.db
        .select()
        .from(serverSettings)
        .where(eq(serverSettings.key, 'REAL_DEBRID_API_KEY'))
        .limit(1);
      return setting?.value || null;
    } catch {
      return null;
    }
  }

  async setRealDebridApiKey(key: string): Promise<void> {
    await this.dbContext.db
      .insert(serverSettings)
      .values({
        key: 'REAL_DEBRID_API_KEY',
        value: key.trim(),
        description: 'Real-Debrid API Token for instant high-speed cloud downloads',
      })
      .onConflictDoUpdate({
        target: serverSettings.key,
        set: { value: key.trim(), updatedAt: new Date() },
      });
  }

  // ---------------------------------------------------------------------------
  // Release Search (Torrentio & YTS)
  // ---------------------------------------------------------------------------
  async searchReleases(params: {
    tmdbId?: number;
    imdbId?: string;
    title: string;
    year?: number;
  }): Promise<DownloadRelease[]> {
    const releases: DownloadRelease[] = [];
    const seenHashes = new Set<string>();

    let imdbId = params.imdbId;

    // Resolve IMDB ID from TMDB if missing
    if (!imdbId && params.tmdbId) {
      try {
        const apiKey = this.config.get<string>('TMDB_API_KEY');
        const token = this.config.get<string>('TMDB_ACCESS_TOKEN');
        const url = `https://api.themoviedb.org/3/movie/${params.tmdbId}?append_to_response=external_ids`;
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(apiKey ? `${url}&api_key=${apiKey}` : url, { headers });
        if (res.ok) {
          const data = (await res.json()) as any;
          imdbId = data.imdb_id || data.external_ids?.imdb_id;
        }
      } catch (err) {
        this.logger.debug(`Failed to fetch imdbId from TMDB: ${err}`);
      }
    }

    // 1. Search Torrentio if IMDB ID is available
    if (imdbId) {
      try {
        const torrentioUrl = `https://torrentio.strem.fun/stream/movie/${imdbId}.json`;
        const res = await fetch(torrentioUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const streams = data.streams || [];

          for (const s of streams) {
            const infoHash = (s.infoHash || '').toLowerCase();
            if (!infoHash || seenHashes.has(infoHash)) continue;
            seenHashes.add(infoHash);

            const titleStr = s.title || '';
            const descLines = titleStr.split('\n');
            const fileName = descLines[0] || params.title;

            // Parse resolution
            let quality = '1080p';
            if (/2160p|4k|uhd/i.test(titleStr)) quality = '4K';
            else if (/1080p|fhd/i.test(titleStr)) quality = '1080p';
            else if (/720p|hd/i.test(titleStr)) quality = '720p';

            // Parse seeders (e.g. 👤 284)
            const seedMatch = titleStr.match(/👤\s*(\d+)/);
            const seeds = seedMatch ? parseInt(seedMatch[1], 10) : 0;

            // Parse size (e.g. 💾 8.91 GB)
            const sizeMatch = titleStr.match(/💾\s*([\d.]+\s*[GMK]B)/i);
            const size = sizeMatch ? sizeMatch[1] : 'Unknown';

            // Parse source/tracker (e.g. ⚙️ 1337x)
            const srcMatch = titleStr.match(/⚙️\s*([^\n\r]+)/);
            const sourceName = srcMatch ? `Torrentio (${srcMatch[1].trim()})` : 'Torrentio';

            releases.push({
              id: infoHash,
              title: fileName,
              quality,
              size,
              seeds,
              source: sourceName,
              infoHash,
              magnetUrl: buildMagnet(infoHash, fileName),
            });
          }
        }
      } catch (err) {
        this.logger.warn(`Torrentio search error: ${err}`);
      }
    }

    // 2. Search YTS mirror (yts.bz / yts.lt)
    try {
      const ytsUrl = `https://yts.bz/api/v2/list_movies.json?query_term=${encodeURIComponent(
        params.title,
      )}&limit=5`;
      const res = await fetch(ytsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const movies = data.data?.movies || [];
        const match = movies.find((m: any) => {
          if (params.year && Math.abs(m.year - params.year) <= 1) return true;
          return m.title.toLowerCase() === params.title.toLowerCase();
        }) || movies[0];

        if (match && match.torrents) {
          for (const t of match.torrents) {
            const hash = (t.hash || '').toLowerCase();
            if (!hash || seenHashes.has(hash)) continue;
            seenHashes.add(hash);

            const qStr = t.quality || '1080p';
            const quality = qStr === '2160p' ? '4K' : qStr;
            const releaseTitle = `${match.title} (${match.year}) [${t.quality}] [${t.type}] [YTS]`;

            releases.push({
              id: hash,
              title: releaseTitle,
              quality,
              size: t.size || 'Unknown',
              seeds: t.seeds || 0,
              source: 'YTS',
              infoHash: hash,
              magnetUrl: buildMagnet(hash, releaseTitle),
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn(`YTS search error: ${err}`);
    }

    // Sort: 4K first, then 1080p, then 720p, sorted by seeders descending
    const qualityWeight: Record<string, number> = { '4K': 3, '1080p': 2, '720p': 1, Other: 0 };
    return releases.sort((a, b) => {
      const wA = qualityWeight[a.quality] || 0;
      const wB = qualityWeight[b.quality] || 0;
      if (wA !== wB) return wB - wA;
      return b.seeds - a.seeds;
    });
  }

  // ---------------------------------------------------------------------------
  // Start Download
  // ---------------------------------------------------------------------------
  async startDownload(dto: {
    tmdbId?: number;
    imdbId?: string;
    title: string;
    year?: number;
    quality?: string;
    magnetUrl: string;
    infoHash?: string;
  }): Promise<DownloadJob> {
    const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safeTitle = sanitizeFilename(dto.title);
    const folderName = dto.year ? `${safeTitle} (${dto.year})` : safeTitle;
    const destDir = path.join(this.mediaRoot, 'movies', folderName);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const job: DownloadJob = {
      id,
      tmdbId: dto.tmdbId,
      imdbId: dto.imdbId,
      title: dto.title,
      year: dto.year,
      quality: dto.quality || '1080p',
      status: 'downloading',
      progress: 0,
      downloadSpeed: '0 KB/s',
      downloadedSize: '0 MB',
      totalSize: 'Calculating...',
      eta: 'Starting...',
      peers: 0,
      destinationPath: destDir,
      createdAt: new Date().toISOString(),
    };

    this.activeJobs.set(id, job);

    // Run execution asynchronously
    this.executeDownload(job, dto.magnetUrl, dto.infoHash).catch((err) => {
      this.logger.error(`Download execution failed for ${id}:`, err);
      job.status = 'failed';
      job.errorMessage = err.message || 'Download failed';
    });

    return job;
  }

  // ---------------------------------------------------------------------------
  // Execution Engine (Aria2 + Optional Real-Debrid)
  // ---------------------------------------------------------------------------
  private async executeDownload(job: DownloadJob, magnetUrl: string, infoHash?: string) {
    const trimmedMagnet = (magnetUrl || '').trim();
    if (
      !trimmedMagnet.startsWith('magnet:?xt=urn:btih:') &&
      !trimmedMagnet.startsWith('http://') &&
      !trimmedMagnet.startsWith('https://')
    ) {
      throw new Error('Invalid download URL protocol. Only magnet, http, and https are permitted.');
    }

    const rdKey = await this.getRealDebridApiKey();
    let directHttpUrl: string | null = null;

    // Check if Real-Debrid is available and can unrestrict
    if (rdKey) {
      this.logger.log(`Real-Debrid configured. Attempting cloud resolve for ${job.title}...`);
      try {
        directHttpUrl = await this.resolveRealDebridUrl(rdKey, trimmedMagnet);
        if (directHttpUrl) {
          this.logger.log(`Real-Debrid resolved direct download link for ${job.title}`);
        }
      } catch (err) {
        this.logger.warn(`Real-Debrid resolve failed, falling back to direct P2P torrent: ${err}`);
      }
    }

    const args: string[] = [
      `--dir=${job.destinationPath}`,
      '--summary-interval=1',
      '--file-allocation=none',
      '--console-log-level=notice',
    ];

    if (directHttpUrl) {
      // High speed multi-connection HTTP download with argument terminator
      args.push('-x', '8', '-s', '8', '-k', '1M', '--', directHttpUrl);
    } else {
      // BitTorrent download with argument terminator
      args.push(
        '--seed-time=0',
        '--bt-stop-timeout=1200',
        '--max-connection-per-server=8',
        '--enable-dht=true',
        '--enable-peer-exchange=true',
        '--',
        trimmedMagnet,
      );
    }

    this.logger.log(`Spawning aria2c for ${job.title}...`);
    const proc = spawn('aria2c', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.processes.set(job.id, proc);

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      this.parseAria2Progress(job, text);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes('ERROR') || text.includes('Exception')) {
        this.logger.warn(`aria2c stderr [${job.title}]: ${text.trim()}`);
      }
    });

    proc.on('close', async (code) => {
      this.processes.delete(job.id);

      if (code === 0) {
        job.status = 'completed';
        job.progress = 100;
        job.downloadSpeed = '0 KB/s';
        job.eta = 'Complete';
        job.completedAt = new Date().toISOString();
        this.logger.log(`Download completed successfully for: ${job.title}! Triggering library scan...`);

        // Automatically scan library so the new movie is indexed
        try {
          await this.scannerService.scanAll();
          this.logger.log(`Library scan finished after download of ${job.title}`);
        } catch (scanErr) {
          this.logger.error(`Error scanning library after download: ${scanErr}`);
        }
      } else if (job.status !== 'cancelled') {
        job.status = 'failed';
        job.errorMessage = `aria2c exited with code ${code}`;
        this.logger.error(`aria2c failed for ${job.title} with code ${code}`);
      }
    });

    proc.on('error', (err) => {
      this.processes.delete(job.id);
      job.status = 'failed';
      job.errorMessage = err.message;
      this.logger.error(`Process error for ${job.title}:`, err);
    });
  }

  // ---------------------------------------------------------------------------
  // Parse aria2 progress output
  // ---------------------------------------------------------------------------
  private parseAria2Progress(job: DownloadJob, text: string) {
    // Example: [#2089b0 1.2MiB/2.5GiB(15%) CN:5 SD:12 DL:2.4MiB ETA:15m]
    // Example: [### 45.2MiB/1.4GiB(3%) CN:8 DL:12.5MiB ETA:1m52s]
    const match = text.match(
      /\[.*?([\d.]+[KMGTP]?i?B)\/([\d.]+[KMGTP]?i?B)\((\d+)%\).*?(?:CN:(\d+))?.*?(?:DL:([\d.]+[KMGTP]?i?B))?.*?(?:ETA:([a-z0-9]+))?\]/i,
    );

    if (match) {
      if (match[1]) job.downloadedSize = match[1];
      if (match[2]) job.totalSize = match[2];
      if (match[3]) job.progress = parseInt(match[3], 10);
      if (match[4]) job.peers = parseInt(match[4], 10);
      if (match[5]) job.downloadSpeed = `${match[5]}/s`;
      if (match[6]) job.eta = match[6];
    }
  }

  // ---------------------------------------------------------------------------
  // Real-Debrid Resolver
  // ---------------------------------------------------------------------------
  private async resolveRealDebridUrl(apiKey: string, magnet: string): Promise<string | null> {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // 1. Add magnet to Real-Debrid
    const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
      method: 'POST',
      headers,
      body: new URLSearchParams({ magnet }),
    });

    if (!addRes.ok) {
      throw new Error(`Real-Debrid addMagnet failed: ${addRes.statusText}`);
    }

    const addData = (await addRes.json()) as { id: string };
    const torrentId = addData.id;

    // 2. Select all files
    await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
      method: 'POST',
      headers,
      body: new URLSearchParams({ files: 'all' }),
    });

    // 3. Get torrent info and download link (poll up to 5 times for RD to process files)
    let firstLink: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers,
      });

      if (infoRes.ok) {
        const infoData = (await infoRes.json()) as { links?: string[] };
        if (infoData.links && infoData.links.length > 0) {
          firstLink = infoData.links[0] || null;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!firstLink) {
      throw new Error('No links generated by Real-Debrid after processing');
    }

    // 4. Unrestrict link
    const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
      method: 'POST',
      headers,
      body: new URLSearchParams({ link: firstLink }),
    });

    if (!unrestrictRes.ok) {
      throw new Error(`Real-Debrid unrestrict failed: ${unrestrictRes.statusText}`);
    }

    const unrestrictData = (await unrestrictRes.json()) as { download: string };
    return unrestrictData.download || null;
  }

  // ---------------------------------------------------------------------------
  // Job List & Cancel
  // ---------------------------------------------------------------------------
  getDownloads(): DownloadJob[] {
    return Array.from(this.activeJobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  cancelDownload(id: string): boolean {
    const job = this.activeJobs.get(id);
    if (!job) return false;

    const proc = this.processes.get(id);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(id);
    }

    job.status = 'cancelled';
    job.eta = 'Cancelled';
    job.downloadSpeed = '0 KB/s';
    return true;
  }
}

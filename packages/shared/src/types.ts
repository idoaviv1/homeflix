// ============================================
// Core Types
// ============================================

export type MediaType = 'movie' | 'show';

export type StreamStatus = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';

export type TranscodeMethod = 'direct_play' | 'direct_stream' | 'transcode';

export type HWAccelMethod = 'nvidia' | 'cpu' | 'auto';

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export type UserRole = 'admin' | 'user';

export type Language = 'en' | 'he';

export type Direction = 'ltr' | 'rtl';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    filesystem: ServiceHealth;
    ffmpeg: ServiceHealth;
    gpu: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'unknown';
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface SystemInfo {
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
  };
  gpu?: {
    model: string;
    vramTotalMB: number;
    vramUsedMB: number;
    vramFreeMB: number;
    encoderUsage: number;
    decoderUsage: number;
    nvencSupported: boolean;
    nvdecSupported: boolean;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    mediaRootPath: string;
  };
  network: {
    lanAddress?: string;
    tailscaleAddress?: string;
    tailscaleHostname?: string;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query: string;
  type?: MediaType;
  genre?: string;
  year?: number;
  language?: Language;
}

export interface MediaSummary {
  id: string;
  tmdbId: number | null;
  type: MediaType;
  title: string;
  titleHe?: string | null;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number | null;
  runtime: number | null;
  overview: string | null;
  overviewHe?: string | null;
  genres: string[];
  addedAt: string;
  inLibrary: boolean;
}

export interface WatchProgressData {
  mediaId: string;
  episodeId?: string | null;
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: string;
  finished: boolean;
}

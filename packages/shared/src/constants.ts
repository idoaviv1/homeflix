// ============================================
// Application Constants
// ============================================

export const APP_NAME = 'Omflix';
export const APP_VERSION = '0.1.0';

export const DEFAULT_PUBLIC_PORT = 8096;
export const DEFAULT_ADMIN_PORT = 8097;

export const API_PREFIX = '/api/v1';

export const LANGUAGES: Record<string, { name: string; nativeName: string; direction: 'ltr' | 'rtl' }> = {
  en: { name: 'English', nativeName: 'English', direction: 'ltr' },
  he: { name: 'Hebrew', nativeName: 'עברית', direction: 'rtl' },
};

export const DEFAULT_LANGUAGE = 'en' as const;

export const FINISHED_THRESHOLD = 0.93; // 93% = considered finished

export const PROGRESS_UPDATE_INTERVAL_MS = 10_000; // Update every 10 seconds

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 24,
  maxPageSize: 100,
} as const;

export const MEDIA_EXTENSIONS = new Set([
  '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv',
  '.webm', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts',
  '.3gp', '.ogv',
]);

export const SUBTITLE_EXTENSIONS = new Set([
  '.srt', '.vtt', '.ass', '.ssa', '.sub', '.idx',
]);

export const IMAGE_SIZES = {
  poster: { sm: 185, md: 342, lg: 500, original: 0 },
  backdrop: { sm: 300, md: 780, lg: 1280, original: 0 },
  profile: { sm: 45, md: 185, lg: 632 },
} as const;

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const HLS_SEGMENT_DURATION = 6; // seconds

export const TRANSCODE_PRESETS = {
  '480p': { width: 854, height: 480, bitrate: '1500k', audioBitrate: '128k' },
  '720p': { width: 1280, height: 720, bitrate: '4000k', audioBitrate: '192k' },
  '1080p': { width: 1920, height: 1080, bitrate: '8000k', audioBitrate: '256k' },
  '4k': { width: 3840, height: 2160, bitrate: '20000k', audioBitrate: '384k' },
} as const;

export type TranscodePreset = keyof typeof TRANSCODE_PRESETS;

export const CACHE_TTL = {
  tmdbSearch: 24 * 60 * 60, // 24 hours
  tmdbDetails: 7 * 24 * 60 * 60, // 7 days
  poster: 30 * 24 * 60 * 60, // 30 days
  backdrop: 30 * 24 * 60 * 60,
  searchResults: 5 * 60, // 5 minutes
  homeRows: 10 * 60, // 10 minutes
} as const;

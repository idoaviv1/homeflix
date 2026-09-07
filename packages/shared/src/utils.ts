// ============================================
// Shared Utility Functions
// ============================================

import { MEDIA_EXTENSIONS, SUBTITLE_EXTENSIONS, FINISHED_THRESHOLD } from './constants';

/**
 * Parse a media filename into structured components.
 * Handles patterns like:
 * - "Movie Name (2025).mkv"
 * - "Series Name - S01E02 - Episode Name.mkv"
 * - "Movie.Name.2025.1080p.BluRay.mkv"
 */
export function parseMediaFilename(filename: string): {
  title: string;
  year: number | null;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  extension: string;
} {
  const ext = filename.substring(filename.lastIndexOf('.'));
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));

  // Try SxxExx pattern first
  const episodeMatch = nameWithoutExt.match(
    /^(.+?)[\s._-]+S(\d{1,2})E(\d{1,3})(?:[\s._-]+(.+?))?$/i,
  );

  if (episodeMatch) {
    const title = cleanTitle(episodeMatch[1]!);
    const season = parseInt(episodeMatch[2]!, 10);
    const episode = parseInt(episodeMatch[3]!, 10);
    const episodeTitle = episodeMatch[4] ? cleanTitle(episodeMatch[4]) : null;

    return { title, year: null, season, episode, episodeTitle, extension: ext };
  }

  // Try "Name (Year)" pattern
  const yearMatch = nameWithoutExt.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (yearMatch) {
    return {
      title: cleanTitle(yearMatch[1]!),
      year: parseInt(yearMatch[2]!, 10),
      season: null,
      episode: null,
      episodeTitle: null,
      extension: ext,
    };
  }

  // Try "Name.Year.Quality" pattern
  const dotYearMatch = nameWithoutExt.match(/^(.+?)[\s._](\d{4})[\s._]/);
  if (dotYearMatch) {
    return {
      title: cleanTitle(dotYearMatch[1]!),
      year: parseInt(dotYearMatch[2]!, 10),
      season: null,
      episode: null,
      episodeTitle: null,
      extension: ext,
    };
  }

  return {
    title: cleanTitle(nameWithoutExt),
    year: null,
    season: null,
    episode: null,
    episodeTitle: null,
    extension: ext,
  };
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*$/, '')
    .trim();
}

/**
 * Parse a directory name for series info.
 * Handles "Series Name (2024)" or "Series Name"
 */
export function parseDirectoryName(dirname: string): {
  title: string;
  year: number | null;
} {
  const yearMatch = dirname.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  if (yearMatch) {
    return {
      title: yearMatch[1]!.trim(),
      year: parseInt(yearMatch[2]!, 10),
    };
  }
  return { title: dirname.trim(), year: null };
}

/**
 * Parse a season directory name.
 * Handles "Season 01", "S01", "Season 1", etc.
 */
export function parseSeasonDirectory(dirname: string): number | null {
  const match = dirname.match(/^(?:Season|S)\s*(\d+)$/i);
  return match ? parseInt(match[1]!, 10) : null;
}

export function isMediaFile(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return MEDIA_EXTENSIONS.has(ext);
}

export function isSubtitleFile(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return SUBTITLE_EXTENSIONS.has(ext);
}

export function isWatchComplete(percentage: number, threshold = FINISHED_THRESHOLD): boolean {
  return percentage >= threshold;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

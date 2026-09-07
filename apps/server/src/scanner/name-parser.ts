import * as path from 'path';

export interface ParsedMovie {
  type: 'movie';
  title: string;
  year?: number;
  edition?: string;
  resolution?: string;
}

export interface ParsedEpisode {
  type: 'episode';
  showTitle: string;
  year?: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle?: string;
  resolution?: string;
}

export type ParsedMedia = ParsedMovie | ParsedEpisode;

const NOISE_WORDS = [
  '1080p', '720p', '480p', '2160p', '4k', 'uhd', 'bluray', 'blu-ray', 'bdrip', 'brrip',
  'web-dl', 'webdl', 'webrip', 'hdtv', 'dvdrip', 'x264', 'x265', 'h264', 'h265', 'hevc',
  'av1', 'aac', 'ac3', 'dts', 'dts-hd', 'truehd', 'atmos', 'ddp5.1', 'dd5.1', 'hdr', 'hdr10',
  'hdr10plus', 'dv', 'dolby.vision', 'imax', 'remux', 'proper', 'repack', 'yts', 'yify',
  'rarbg', 'eztv', 'psa', 'galaxyrg', 'vxt'
];

export function parseMediaFilename(filePath: string): ParsedMedia {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dirName = path.basename(path.dirname(filePath));
  const parentDirName = path.basename(path.dirname(path.dirname(filePath)));

  // 1. Check for TV Show episode pattern: S01E02 or 1x02
  const tvPattern = /(.*?)[. _-]?[sS](\d{1,2})[eE](\d{1,3})(?:[. _-]?(.*?))?$/i;
  const matchTv = baseName.match(tvPattern);

  if (matchTv) {
    let rawShow = matchTv[1]?.trim() || '';
    const season = parseInt(matchTv[2] || '1', 10);
    const episode = parseInt(matchTv[3] || '1', 10);
    let rawEpisodeTitle = matchTv[4]?.trim();

    // If filename starts with "S01E01", use the parent directory or grandparent directory for show title
    if (!rawShow || /^s\d+e\d+/i.test(rawShow)) {
      if (/season\s*\d+/i.test(dirName)) {
        rawShow = parentDirName;
      } else {
        rawShow = dirName;
      }
    }

    const { cleanTitle, year: parsedYear } = cleanTitleAndYear(rawShow);
    let year = parsedYear;
    if (!year && parentDirName) {
      const parentInfo = cleanTitleAndYear(parentDirName);
      if (parentInfo.year) {
        year = parentInfo.year;
      }
    }
    const cleanEpTitle = cleanEpisodeTitle(rawEpisodeTitle);

    return {
      type: 'episode',
      showTitle: cleanTitle,
      year,
      seasonNumber: season,
      episodeNumber: episode,
      episodeTitle: cleanEpTitle || undefined,
    };
  }

  // 2. Check if parent folder indicates Season: e.g. "Breaking Bad (2008)/Season 01/01.mkv"
  const seasonDirMatch = dirName.match(/season\s*(\d{1,2})/i);
  if (seasonDirMatch) {
    const season = parseInt(seasonDirMatch[1] || '1', 10);
    const epNumMatch = baseName.match(/^(\d{1,3})/);
    const epNum = epNumMatch && epNumMatch[1] ? parseInt(epNumMatch[1], 10) : 1;
    const { cleanTitle, year } = cleanTitleAndYear(parentDirName);

    return {
      type: 'episode',
      showTitle: cleanTitle,
      year,
      seasonNumber: season,
      episodeNumber: epNum,
    };
  }

  // 3. Fallback: Parse as Movie
  // Check if directory name has cleaner title: "Movie Name (2023)/Movie.Name.2023.1080p.mkv"
  let targetToParse = baseName;
  const dirMovieMatch = dirName.match(/^(.+?)\s*\((\d{4})\)$/);
  if (dirMovieMatch && dirMovieMatch[1] && dirMovieMatch[2]) {
    return {
      type: 'movie',
      title: dirMovieMatch[1].trim(),
      year: parseInt(dirMovieMatch[2], 10),
    };
  }

  const { cleanTitle, year } = cleanTitleAndYear(targetToParse);
  return {
    type: 'movie',
    title: cleanTitle,
    year,
  };
}

function cleanTitleAndYear(raw: string): { cleanTitle: string; year?: number } {
  // Replace dots, underscores, dashes with spaces
  let text = raw.replace(/[._]/g, ' ').trim();

  // Find 4 digit year between 1900 and 2099
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  let year: number | undefined;

  if (yearMatch && yearMatch[1]) {
    year = parseInt(yearMatch[1], 10);
    // Take everything before the year as the title
    const index = text.indexOf(yearMatch[1]);
    if (index > 0) {
      text = text.substring(0, index);
    }
  }

  // Remove noise words
  const words = text.split(/\s+/);
  const cleanWords: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (NOISE_WORDS.includes(lower)) {
      break; // Stop at first noise word
    }
    cleanWords.push(word);
  }

  const finalTitle = cleanWords
    .join(' ')
    .replace(/[()]/g, '')
    .replace(/[-–—:]\s*$/, '')
    .trim();
  return {
    cleanTitle: finalTitle || raw,
    year,
  };
}

function cleanEpisodeTitle(raw?: string): string | undefined {
  if (!raw) return undefined;
  let text = raw.replace(/[._]/g, ' ').trim();
  const words = text.split(/\s+/);
  const cleanWords: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (NOISE_WORDS.includes(lower)) {
      break;
    }
    cleanWords.push(word);
  }
  const clean = cleanWords.join(' ').replace(/^-\s*/, '').trim();
  return clean || undefined;
}

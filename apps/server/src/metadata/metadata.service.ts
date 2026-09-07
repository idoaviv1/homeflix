import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_TOKEN } from '../redis/redis.module';
import { DATABASE_TOKEN } from '../database/database.module';
import { serverSettings, type Database } from '@omflix/database';
import { eq } from 'drizzle-orm';

export interface MediaMetadata {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  titleHe?: string;
  originalTitle?: string;
  overview?: string;
  overviewHe?: string;
  tagline?: string;
  releaseDate?: string;
  year?: number;
  runtime?: number;
  rating?: number;
  voteCount?: number;
  popularity?: number;
  posterPath?: string;
  backdropPath?: string;
  logoPath?: string;
  genres: string[];
  cast: Array<{ name: string; character: string; profilePath: string | null }>;
  crew: Array<{ name: string; job: string; profilePath: string | null }>;
  trailerKey?: string;
  collectionId?: number;
  collectionName?: string;
  status?: string;
}

export interface EpisodeMetadata {
  tmdbId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string;
  stillPath?: string;
  runtime?: number;
  airDate?: string;
}

const FALLBACK_POSTERS = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=80',
];

const FALLBACK_BACKDROPS = [
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&auto=format&fit=crop&q=80',
];

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);
  private apiKey: string | null = null;
  private accessToken: string | null = null;

  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(DATABASE_TOKEN) private readonly dbContext: { db: Database },
  ) {
    this.apiKey = this.config.get<string>('TMDB_API_KEY') || null;
    this.accessToken = this.config.get<string>('TMDB_ACCESS_TOKEN') || null;
  }

  private async getActiveApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;
    try {
      const [setting] = await this.dbContext.db
        .select()
        .from(serverSettings)
        .where(eq(serverSettings.key, 'TMDB_API_KEY'))
        .limit(1);
      if (setting && setting.value) {
        return setting.value;
      }
    } catch {
      // Ignore DB read errors
    }
    return null;
  }

  async setApiKey(key: string) {
    this.apiKey = key;
    await this.dbContext.db
      .insert(serverSettings)
      .values({
        key: 'TMDB_API_KEY',
        value: key,
        description: 'The Movie Database (TMDB) API Key',
      })
      .onConflictDoUpdate({
        target: serverSettings.key,
        set: { value: key, updatedAt: new Date() },
      });
    this.logger.log('TMDB API Key updated');
  }

  async fetchMovieMetadata(title: string, year?: number): Promise<MediaMetadata> {
    const cacheKey = `omflix:meta:movie:${title.toLowerCase()}:${year || 'any'}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Ignore redis cache error
    }

    const apiKey = await this.getActiveApiKey();
    if (!apiKey && !this.accessToken) {
      return this.generateFallbackMovie(title, year);
    }

    try {
      // Search TMDB
      const searchUrl = new URL('https://api.themoviedb.org/3/search/movie');
      searchUrl.searchParams.set('query', title);
      if (year) searchUrl.searchParams.set('year', year.toString());
      if (apiKey) searchUrl.searchParams.set('api_key', apiKey);

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const res = await fetch(searchUrl.toString(), { headers });
      if (!res.ok) {
        this.logger.warn(`TMDB search failed with status ${res.status}`);
        return this.generateFallbackMovie(title, year);
      }

      const searchData = (await res.json()) as any;
      const movieResult = searchData.results?.[0];
      if (!movieResult) {
        return this.generateFallbackMovie(title, year);
      }

      // Fetch full details with credits and videos
      const detailsUrl = new URL(`https://api.themoviedb.org/3/movie/${movieResult.id}`);
      detailsUrl.searchParams.set('append_to_response', 'credits,videos');
      if (apiKey) detailsUrl.searchParams.set('api_key', apiKey);

      const detailsRes = await fetch(detailsUrl.toString(), { headers });
      const details = detailsRes.ok ? ((await detailsRes.json()) as any) : movieResult;

      // Fetch Hebrew overview/title if possible
      let titleHe: string | undefined;
      let overviewHe: string | undefined;
      try {
        const heUrl = new URL(`https://api.themoviedb.org/3/movie/${movieResult.id}`);
        heUrl.searchParams.set('language', 'he-IL');
        if (apiKey) heUrl.searchParams.set('api_key', apiKey);
        const heRes = await fetch(heUrl.toString(), { headers });
        if (heRes.ok) {
          const heData = (await heRes.json()) as any;
          if (heData.title && heData.title !== details.title) titleHe = heData.title;
          if (heData.overview) overviewHe = heData.overview;
        }
      } catch {
        // Hebrew translation optional
      }

      const trailer = details.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
      );

      const metadata: MediaMetadata = {
        tmdbId: details.id,
        imdbId: details.imdb_id || undefined,
        title: details.title || title,
        titleHe,
        originalTitle: details.original_title,
        overview: details.overview,
        overviewHe,
        tagline: details.tagline,
        releaseDate: details.release_date,
        year: details.release_date ? parseInt(details.release_date.split('-')[0], 10) : year,
        runtime: details.runtime,
        rating: details.vote_average,
        voteCount: details.vote_count,
        popularity: details.popularity,
        posterPath: details.poster_path
          ? `https://image.tmdb.org/t/p/w780${details.poster_path}`
          : undefined,
        backdropPath: details.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
          : undefined,
        genres: (details.genres || []).map((g: any) => g.name),
        cast: (details.credits?.cast || []).slice(0, 10).map((c: any) => ({
          name: c.name,
          character: c.character,
          profilePath: c.profile_path
            ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
            : null,
        })),
        crew: (details.credits?.crew || [])
          .filter((c: any) => c.job === 'Director' || c.job === 'Writer')
          .slice(0, 5)
          .map((c: any) => ({
            name: c.name,
            job: c.job,
            profilePath: c.profile_path
              ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
              : null,
          })),
        trailerKey: trailer?.key,
        collectionId: details.belongs_to_collection?.id,
        collectionName: details.belongs_to_collection?.name,
        status: details.status,
      };

      try {
        await this.redis.setex(cacheKey, 7 * 24 * 3600, JSON.stringify(metadata));
      } catch {
        // Ignore cache errors
      }

      return metadata;
    } catch (err) {
      this.logger.error(`Error fetching movie metadata for "${title}": ${err}`);
      return this.generateFallbackMovie(title, year);
    }
  }

  async fetchShowMetadata(title: string, year?: number): Promise<MediaMetadata> {
    const cacheKey = `omflix:meta:show:${title.toLowerCase()}:${year || 'any'}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Ignore cache errors
    }

    const apiKey = await this.getActiveApiKey();
    if (!apiKey && !this.accessToken) {
      return this.generateFallbackShow(title, year);
    }

    try {
      const searchUrl = new URL('https://api.themoviedb.org/3/search/tv');
      searchUrl.searchParams.set('query', title);
      if (year) searchUrl.searchParams.set('first_air_date_year', year.toString());
      if (apiKey) searchUrl.searchParams.set('api_key', apiKey);

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

      const res = await fetch(searchUrl.toString(), { headers });
      if (!res.ok) return this.generateFallbackShow(title, year);

      const data = (await res.json()) as any;
      const showResult = data.results?.[0];
      if (!showResult) return this.generateFallbackShow(title, year);

      const detailsUrl = new URL(`https://api.themoviedb.org/3/tv/${showResult.id}`);
      detailsUrl.searchParams.set('append_to_response', 'credits,videos');
      if (apiKey) detailsUrl.searchParams.set('api_key', apiKey);

      const detailsRes = await fetch(detailsUrl.toString(), { headers });
      const details = detailsRes.ok ? ((await detailsRes.json()) as any) : showResult;

      const trailer = details.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
      );

      const metadata: MediaMetadata = {
        tmdbId: details.id,
        title: details.name || title,
        originalTitle: details.original_name,
        overview: details.overview,
        tagline: details.tagline,
        releaseDate: details.first_air_date,
        year: details.first_air_date
          ? parseInt(details.first_air_date.split('-')[0], 10)
          : year,
        rating: details.vote_average,
        voteCount: details.vote_count,
        popularity: details.popularity,
        posterPath: details.poster_path
          ? `https://image.tmdb.org/t/p/w780${details.poster_path}`
          : undefined,
        backdropPath: details.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
          : undefined,
        genres: (details.genres || []).map((g: any) => g.name),
        cast: (details.credits?.cast || []).slice(0, 10).map((c: any) => ({
          name: c.name,
          character: c.character,
          profilePath: c.profile_path
            ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
            : null,
        })),
        crew: [],
        trailerKey: trailer?.key,
        status: details.status,
      };

      try {
        await this.redis.setex(cacheKey, 7 * 24 * 3600, JSON.stringify(metadata));
      } catch {
        // Ignore cache errors
      }

      return metadata;
    } catch (err) {
      this.logger.error(`Error fetching show metadata for "${title}": ${err}`);
      return this.generateFallbackShow(title, year);
    }
  }

  async fetchSeasonEpisodes(
    tmdbShowId: number,
    seasonNumber: number,
  ): Promise<EpisodeMetadata[]> {
    const apiKey = await this.getActiveApiKey();
    if (!apiKey && !this.accessToken) {
      return [];
    }

    try {
      const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbShowId}/season/${seasonNumber}`);
      if (apiKey) url.searchParams.set('api_key', apiKey);

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) return [];

      const data = (await res.json()) as any;
      return (data.episodes || []).map((ep: any) => ({
        tmdbId: ep.id,
        seasonNumber: ep.season_number,
        episodeNumber: ep.episode_number,
        title: ep.name,
        overview: ep.overview,
        stillPath: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : undefined,
        runtime: ep.runtime,
        airDate: ep.air_date,
      }));
    } catch (err) {
      this.logger.error(`Error fetching season ${seasonNumber} for show ${tmdbShowId}: ${err}`);
      return [];
    }
  }

  generateFallbackMovie(title: string, year?: number): MediaMetadata {
    const hash = this.hashString(title);
    const poster = FALLBACK_POSTERS[Math.abs(hash) % FALLBACK_POSTERS.length];
    const backdrop = FALLBACK_BACKDROPS[Math.abs(hash) % FALLBACK_BACKDROPS.length];

    return {
      title,
      year: year || new Date().getFullYear(),
      overview: `${title} is a cinematic experience in your private Homeflix library. Enjoy high-definition home streaming.`,
      posterPath: poster,
      backdropPath: backdrop,
      genres: ['Action', 'Drama'],
      cast: [],
      crew: [],
      rating: 8.4,
    };
  }

  generateFallbackShow(title: string, year?: number): MediaMetadata {
    const hash = this.hashString(title);
    const poster = FALLBACK_POSTERS[Math.abs(hash) % FALLBACK_POSTERS.length];
    const backdrop = FALLBACK_BACKDROPS[Math.abs(hash) % FALLBACK_BACKDROPS.length];

    return {
      title,
      year: year || new Date().getFullYear(),
      overview: `${title} is an acclaimed television series available on your Homeflix server.`,
      posterPath: poster,
      backdropPath: backdrop,
      genres: ['Drama', 'Sci-Fi'],
      cast: [],
      crew: [],
      rating: 8.6,
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

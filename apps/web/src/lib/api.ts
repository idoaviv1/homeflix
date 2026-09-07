// ============================================
// Omflix Frontend API Client
// ============================================

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  role: 'admin' | 'user';
  preferredLanguage: string;
}

export interface MediaItem {
  id: string;
  type: 'movie' | 'show';
  title: string;
  titleHe?: string;
  originalTitle?: string;
  overview?: string;
  overviewHe?: string;
  tagline?: string;
  year?: number;
  runtime?: number;
  rating?: number;
  voteCount?: number;
  posterPath?: string;
  backdropPath?: string;
  logoPath?: string;
  genres: string[];
  trailerKey?: string;
  inLibrary: boolean;
  cast?: Array<{ name: string; character: string; profilePath: string | null }>;
  crew?: Array<{ name: string; job: string; profilePath: string | null }>;
  files?: MediaFile[];
  seasons?: Season[];
  userState?: {
    progress?: WatchProgress | null;
    inWatchlist: boolean;
    isFavorite: boolean;
  };
}

export interface Season {
  id: string;
  showId: string;
  seasonNumber: number;
  name: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  showId: string;
  seasonId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string;
  stillPath?: string;
  runtime?: number;
  mediaFile?: MediaFile | null;
}

export interface MediaFile {
  id: string;
  mediaItemId: string;
  episodeId?: string;
  fileName: string;
  fileSize?: string;
  container?: string;
  duration?: number;
  videoCodec?: string;
  videoProfile?: string;
  width?: number;
  height?: number;
  framerate?: number;
  isHdr?: boolean;
  hdrFormat?: string;
  audioStreams?: Array<{
    index: number;
    codec: string;
    channels: number;
    language: string | null;
    title: string | null;
    isDefault: boolean;
  }>;
  subtitleStreams?: Array<{
    index: number;
    codec: string;
    language: string | null;
    title: string | null;
    isForced: boolean;
    isDefault: boolean;
  }>;
}

export interface WatchProgress {
  id: string;
  mediaItemId: string;
  episodeId?: string;
  currentTime: number;
  duration: number;
  percentage: number;
  finished: boolean;
}

export interface HomeFeed {
  hero: MediaItem | null;
  continueWatching: any[];
  recentlyAddedMovies: MediaItem[];
  recentlyAddedShows: MediaItem[];
  topRated: MediaItem[];
  watchlist: MediaItem[];
}

export interface SearchResult {
  inLibrary: MediaItem[];
  discover: MediaItem[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch {
      // Ignore
    }
    throw new Error(errorMsg);
  }

  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Auth
  async getMe(): Promise<{ anonymous: boolean; user: User | null }> {
    return request('/api/v1/auth/me');
  },
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    return request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  async register(
    username: string,
    password: string,
    displayName?: string,
  ): Promise<{ user: User; token: string }> {
    return request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    });
  },
  async logout(): Promise<void> {
    return request('/api/v1/auth/logout', { method: 'POST' });
  },

  // Media
  async getHomeFeed(): Promise<HomeFeed> {
    return request('/api/v1/media/home');
  },
  async getMedia(id: string): Promise<MediaItem> {
    return request(`/api/v1/media/${id}`);
  },
  async listMedia(params?: Record<string, string>): Promise<{ items: MediaItem[]; count: number }> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/v1/media${query ? `?${query}` : ''}`);
  },
  async search(query: string): Promise<SearchResult> {
    return request(`/api/v1/media/search?q=${encodeURIComponent(query)}`);
  },

  // Progress & Watchlist
  async updateProgress(data: {
    mediaItemId: string;
    episodeId?: string;
    currentTime: number;
    duration: number;
  }): Promise<void> {
    return request('/api/v1/media/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async toggleWatchlist(mediaItemId: string): Promise<{ inWatchlist: boolean }> {
    return request('/api/v1/media/watchlist', {
      method: 'POST',
      body: JSON.stringify({ mediaItemId }),
    });
  },
  async toggleFavorite(mediaItemId: string): Promise<{ isFavorite: boolean }> {
    return request('/api/v1/media/favorites', {
      method: 'POST',
      body: JSON.stringify({ mediaItemId }),
    });
  },

  // Scanner
  async triggerScan(): Promise<{ message: string }> {
    return request('/api/v1/scanner/scan', { method: 'POST' });
  },
  async getScannerStatus(): Promise<any> {
    return request('/api/v1/scanner/status');
  },

  // Admin (localhost only)
  async getAdminHealth(): Promise<any> {
    return request('/api/v1/admin/health');
  },
  async getAdminSummary(): Promise<any> {
    return request('/api/v1/admin/library/summary');
  },
  async getAdminStreams(): Promise<any[]> {
    return request('/api/v1/admin/streams');
  },
  async getAdminSettings(): Promise<Record<string, string>> {
    return request('/api/v1/admin/settings');
  },
  async updateAdminSettings(settings: Record<string, string>): Promise<void> {
    return request('/api/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
  async clearCache(): Promise<void> {
    return request('/api/v1/admin/maintenance/clear-cache', { method: 'POST' });
  },
  async fixMatch(data: {
    mediaItemId: string;
    tmdbId: number;
    type: 'movie' | 'show';
    customAlias?: string;
  }): Promise<void> {
    return request('/api/v1/admin/library/fix-match', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

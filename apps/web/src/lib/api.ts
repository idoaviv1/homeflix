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
  tmdbId?: number;
  imdbId?: string;
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
  inWatchlist?: boolean;
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

export interface WatchHistoryItem {
  id: string;
  mediaItemId: string;
  title: string;
  titleHe?: string | null;
  originalTitle?: string | null;
  type: 'movie' | 'show';
  posterPath: string | null;
  backdropPath: string | null;
  year: number | null;
  currentTime: number;
  duration: number;
  percentage: number;
  finished: boolean;
  updatedAt: string;
  stoppedMinute: number;
  totalMinutes: number;
  episode?: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    stillPath: string | null;
  } | null;
}

export interface HomeFeed {
  hero: MediaItem | null;
  continueWatching: any[];
  inLibrary?: MediaItem[];
  recentlyAddedMovies: MediaItem[];
  recentlyAddedShows: MediaItem[];
  trendingMovies?: MediaItem[];
  trendingShows?: MediaItem[];
  topRated?: MediaItem[];
  actionMovies?: MediaItem[];
  scifiMovies?: MediaItem[];
  comedyMovies?: MediaItem[];
  animationMovies?: MediaItem[];
  thrillerMovies?: MediaItem[];
  popularShows?: MediaItem[];
  watchlist: MediaItem[];
}

export interface SearchResult {
  inLibrary: MediaItem[];
  discover: MediaItem[];
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('omflix_device_id');
  const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
  if (!id || !UUID_REGEX.test(id)) {
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    localStorage.setItem('omflix_device_id', id);
  }
  return id;
}

export function getBaseApiUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('omflix_server_url');
  if (stored) return stored.replace(/\/+$/, '');

  // Detect Capacitor or native mobile wrapper
  const isCapacitor =
    (window as any).Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    (!window.location.origin.includes(':5173') &&
      !window.location.origin.includes(':8096') &&
      (window.location.protocol.startsWith('file:') ||
        (window.location.hostname === 'localhost' && !window.location.port)));

  if (isCapacitor) {
    // Default to LAN IP of the home server
    return 'http://192.168.1.213:8096';
  }
  return '';
}

export function apiUrl(endpoint: string): string {
  if (!endpoint) return '';
  if (
    endpoint.startsWith('http://') ||
    endpoint.startsWith('https://') ||
    endpoint.startsWith('blob:') ||
    endpoint.startsWith('data:')
  ) {
    return endpoint;
  }
  const base = getBaseApiUrl();
  return `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('omflix_token') : null;
  const deviceId = getDeviceId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (deviceId && !headers['X-Device-Id']) {
    headers['X-Device-Id'] = deviceId;
  }

  const fullUrl = apiUrl(url);
  const res = await fetch(fullUrl, {
    ...options,
    headers,
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

function getAdminUrl(endpoint: string): string {
  return endpoint;
}

export const api = {
  // Auth
  async getMe(): Promise<{ anonymous: boolean; user: User | null }> {
    return request('/api/v1/auth/me');
  },
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res?.token && typeof window !== 'undefined') {
      localStorage.setItem('omflix_token', res.token);
    }
    return res;
  },
  async register(
    username: string,
    password: string,
    displayName?: string,
  ): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    });
    if (res?.token && typeof window !== 'undefined') {
      localStorage.setItem('omflix_token', res.token);
    }
    return res;
  },
  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omflix_token');
    }
    return request('/api/v1/auth/logout', { method: 'POST' });
  },

  // Media
  async getHomeFeed(): Promise<HomeFeed> {
    return request('/api/v1/media/home');
  },
  async getMedia(id: string): Promise<MediaItem> {
    return request(`/api/v1/media/${id}`);
  },
  async getTrailer(
    id: string,
    params?: { title?: string; year?: number; tmdbId?: number },
  ): Promise<{ trailerKey: string | null }> {
    const qs = new URLSearchParams();
    if (params?.title) qs.set('title', params.title);
    if (params?.year) qs.set('year', String(params.year));
    if (params?.tmdbId) qs.set('tmdbId', String(params.tmdbId));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/api/v1/media/${id}/trailer${query}`);
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
  async getWatchHistory(): Promise<WatchHistoryItem[]> {
    return request('/api/v1/media/history');
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

  // Downloads
  async searchDownloads(params: {
    title: string;
    tmdbId?: number;
    imdbId?: string;
    year?: number;
  }): Promise<DownloadRelease[]> {
    const q = new URLSearchParams();
    q.set('title', params.title);
    if (params.tmdbId) q.set('tmdbId', params.tmdbId.toString());
    if (params.imdbId) q.set('imdbId', params.imdbId);
    if (params.year) q.set('year', params.year.toString());
    const res = await request<any>(`/api/v1/downloads/search?${q.toString()}`);
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async startDownload(data: {
    tmdbId?: number;
    imdbId?: string;
    title: string;
    year?: number;
    quality?: string;
    magnetUrl: string;
    infoHash?: string;
  }): Promise<DownloadJob> {
    const res = await request<any>('/api/v1/downloads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data !== undefined ? res.data : res;
  },
  async getDownloads(): Promise<DownloadJob[]> {
    const res = await request<any>('/api/v1/downloads');
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async cancelDownload(id: string): Promise<void> {
    return request(`/api/v1/downloads/${id}`, { method: 'DELETE' });
  },
  async getDownloadSettings(): Promise<{ hasRealDebrid: boolean; maskedKey: string | null }> {
    const res = await request<any>('/api/v1/downloads/settings');
    return res?.data !== undefined ? res.data : (res || { hasRealDebrid: false, maskedKey: null });
  },
  async updateDownloadSettings(data: { realDebridApiKey?: string }): Promise<void> {
    return request('/api/v1/downloads/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin (localhost only)
  async getAdminHealth(): Promise<any> {
    return request(getAdminUrl('/api/v1/admin/health'));
  },
  async getAdminSummary(): Promise<any> {
    return request(getAdminUrl('/api/v1/admin/library/summary'));
  },
  async getAdminStreams(): Promise<any[]> {
    return request(getAdminUrl('/api/v1/admin/streams'));
  },
  async getAdminSettings(): Promise<Record<string, string>> {
    return request(getAdminUrl('/api/v1/admin/settings'));
  },
  async updateAdminSettings(settings: Record<string, string>): Promise<void> {
    return request(getAdminUrl('/api/v1/admin/settings'), {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
  async clearCache(): Promise<void> {
    return request(getAdminUrl('/api/v1/admin/maintenance/clear-cache'), { method: 'POST' });
  },
  async fixMatch(data: {
    mediaItemId: string;
    tmdbId: number;
    type: 'movie' | 'show';
    customAlias?: string;
  }): Promise<void> {
    return request(getAdminUrl('/api/v1/admin/library/fix-match'), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export interface DownloadRelease {
  id: string;
  title: string;
  quality: string;
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
  progress: number;
  downloadSpeed: string;
  downloadedSize: string;
  totalSize: string;
  eta: string;
  peers: number;
  errorMessage?: string;
  destinationPath: string;
  createdAt: string;
  completedAt?: string;
}

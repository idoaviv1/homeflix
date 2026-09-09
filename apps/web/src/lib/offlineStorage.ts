import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { apiUrl } from './api';

export interface OfflineSubtitleTrack {
  streamIndex: number;
  language: string;
  title: string;
  isDefault?: boolean;
  localPath?: string; // Capacitor filesystem path
  vttContent?: string; // Stored VTT string or data URL
}

export interface OfflineMediaItem {
  id: string; // Unique offline item ID
  mediaItemId: string;
  episodeId?: string;
  title: string;
  titleHe?: string;
  originalTitle?: string;
  year?: number;
  overview?: string;
  duration?: number;
  posterDataUrl?: string;
  fileId: string;
  filename: string;
  sizeBytes: number;
  downloadedAt: number;
  videoLocalPath?: string; // On iOS Capacitor
  videoBlobKey?: string; // In IndexedDB on Web/Simulator
  subtitles: OfflineSubtitleTrack[];
}

export interface ActiveDownloadProgress {
  id: string;
  title: string;
  titleHe?: string;
  bytesDownloaded: number;
  totalBytes: number;
  percent: number;
  speedMbps: number;
  etaSeconds: number;
  status: 'downloading' | 'saving' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

type ProgressListener = (progresses: Record<string, ActiveDownloadProgress>) => void;

// ─── IndexedDB Setup for Web & PC Simulator ───
const DB_NAME = 'homeflix_offline_db';
const DB_VERSION = 1;
const STORE_ITEMS = 'items';
const STORE_BLOBS = 'blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName: string, key: string | null, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = key !== null ? store.put(value, key) : store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Offline Storage Manager ───
class OfflineStorageManager {
  private isNative: boolean;
  private activeDownloads: Record<string, ActiveDownloadProgress> = {};
  private activeAbortControllers: Record<string, AbortController> = {};
  private progressListeners: Set<ProgressListener> = new Set();
  private blobUrlCache: Map<string, string> = new Map();

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  public subscribeProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    listener(this.activeDownloads);
    return () => this.progressListeners.delete(listener);
  }

  private notifyProgress() {
    const copy = { ...this.activeDownloads };
    this.progressListeners.forEach((fn) => fn(copy));
  }

  public async getOfflineItems(): Promise<OfflineMediaItem[]> {
    if (this.isNative) {
      try {
        const manifestResult = await Filesystem.readFile({
          path: 'HomeflixMedia/manifest.json',
          directory: Directory.Data,
        });
        const content = typeof manifestResult.data === 'string'
          ? manifestResult.data
          : await (manifestResult.data as Blob).text();
        return JSON.parse(content) as OfflineMediaItem[];
      } catch {
        return [];
      }
    } else {
      return idbGetAll<OfflineMediaItem>(STORE_ITEMS);
    }
  }

  public async getStorageUsage(): Promise<{ usedBytes: number; formatted: string; count: number }> {
    const items = await this.getOfflineItems();
    const usedBytes = items.reduce((acc, it) => acc + (it.sizeBytes || 0), 0);
    return {
      usedBytes,
      formatted: this.formatBytes(usedBytes),
      count: items.length,
    };
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async saveManifestItem(item: OfflineMediaItem): Promise<void> {
    if (this.isNative) {
      const items = await this.getOfflineItems();
      const filtered = items.filter((x) => x.id !== item.id);
      filtered.push(item);
      await Filesystem.writeFile({
        path: 'HomeflixMedia/manifest.json',
        data: JSON.stringify(filtered, null, 2),
        directory: Directory.Data,
        recursive: true,
      });
    } else {
      await idbPut(STORE_ITEMS, null, item);
    }
  }

  public async deleteOfflineItem(id: string): Promise<void> {
    const items = await this.getOfflineItems();
    const target = items.find((x) => x.id === id);
    if (!target) return;

    if (this.isNative) {
      try {
        if (target.videoLocalPath) {
          await Filesystem.deleteFile({
            path: target.videoLocalPath,
            directory: Directory.Data,
          });
        }
        for (const sub of target.subtitles) {
          if (sub.localPath) {
            await Filesystem.deleteFile({
              path: sub.localPath,
              directory: Directory.Data,
            });
          }
        }
      } catch (err) {
        console.warn('Native delete error:', err);
      }
      const remaining = items.filter((x) => x.id !== id);
      await Filesystem.writeFile({
        path: 'HomeflixMedia/manifest.json',
        data: JSON.stringify(remaining, null, 2),
        directory: Directory.Data,
        recursive: true,
      });
    } else {
      if (target.videoBlobKey) {
        await idbDelete(STORE_BLOBS, target.videoBlobKey);
      }
      if (this.blobUrlCache.has(id)) {
        URL.revokeObjectURL(this.blobUrlCache.get(id)!);
        this.blobUrlCache.delete(id);
      }
      await idbDelete(STORE_ITEMS, id);
    }
  }

  public cancelDownload(id: string) {
    if (this.activeAbortControllers[id]) {
      this.activeAbortControllers[id].abort();
      delete this.activeAbortControllers[id];
    }
    if (this.activeDownloads[id]) {
      this.activeDownloads[id].status = 'cancelled';
      this.notifyProgress();
      setTimeout(() => {
        delete this.activeDownloads[id];
        this.notifyProgress();
      }, 3000);
    }
  }

  /**
   * Start in-app sandbox download.
   * Downloads video + all selected subtitle tracks directly into app storage.
   */
  public async startDownload(params: {
    mediaItemId: string;
    episodeId?: string;
    fileId: string;
    title: string;
    titleHe?: string;
    originalTitle?: string;
    year?: number;
    overview?: string;
    duration?: number;
    posterPath?: string;
    filename: string;
    selectedSubtitleIndices: number[];
    availableSubtitles: Array<{
      streamIndex: number;
      language: string;
      title: string;
      isDefault?: boolean;
    }>;
  }): Promise<string> {
    const downloadId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const abortController = new AbortController();
    this.activeAbortControllers[downloadId] = abortController;

    this.activeDownloads[downloadId] = {
      id: downloadId,
      title: params.title,
      titleHe: params.titleHe,
      bytesDownloaded: 0,
      totalBytes: 0,
      percent: 0,
      speedMbps: 0,
      etaSeconds: 0,
      status: 'downloading',
    };
    this.notifyProgress();

    // Execute in background
    this.executeDownload(downloadId, params, abortController.signal).catch((err) => {
      console.error('Download error:', err);
      if (this.activeDownloads[downloadId]) {
        this.activeDownloads[downloadId].status = 'failed';
        this.activeDownloads[downloadId].error = err.message || 'Download failed';
        this.notifyProgress();
      }
    });

    return downloadId;
  }

  private async executeDownload(
    downloadId: string,
    params: {
      mediaItemId: string;
      episodeId?: string;
      fileId: string;
      title: string;
      titleHe?: string;
      originalTitle?: string;
      year?: number;
      overview?: string;
      duration?: number;
      posterPath?: string;
      filename: string;
      selectedSubtitleIndices: number[];
      availableSubtitles: Array<{
        streamIndex: number;
        language: string;
        title: string;
        isDefault?: boolean;
      }>;
    },
    signal: AbortSignal,
  ): Promise<void> {
    // 1. Prepare poster data URL for offline thumbnail
    let posterDataUrl = '';
    if (params.posterPath) {
      try {
        const posterRes = await fetch(params.posterPath, { signal });
        const posterBlob = await posterRes.blob();
        posterDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(posterBlob);
        });
      } catch {
        posterDataUrl = params.posterPath;
      }
    }

    // 2. Fetch subtitle tracks
    const storedSubtitles: OfflineSubtitleTrack[] = [];
    for (const subIndex of params.selectedSubtitleIndices) {
      const meta = params.availableSubtitles.find((s) => s.streamIndex === subIndex) || {
        streamIndex: subIndex,
        language: 'sub',
        title: `Subtitle ${subIndex}`,
      };

      try {
        const subRes = await fetch(apiUrl(`/api/v1/stream/${params.fileId}/subtitles/${subIndex}.vtt`), { signal });
        if (subRes.ok) {
          const vttText = await subRes.text();
          if (this.isNative) {
            const subPath = `HomeflixMedia/${downloadId}_sub_${subIndex}.vtt`;
            await Filesystem.writeFile({
              path: subPath,
              data: vttText,
              directory: Directory.Data,
              recursive: true,
            });
            storedSubtitles.push({
              streamIndex: subIndex,
              language: meta.language,
              title: meta.title,
              isDefault: meta.isDefault,
              localPath: subPath,
            });
          } else {
            storedSubtitles.push({
              streamIndex: subIndex,
              language: meta.language,
              title: meta.title,
              isDefault: meta.isDefault,
              vttContent: vttText,
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch subtitle ${subIndex}:`, e);
      }
    }

    // 3. Download the video stream directly into internal sandbox
    const streamUrl = apiUrl(`/api/v1/stream/${params.fileId}/direct`);
    let videoLocalPath: string | undefined;
    let videoBlobKey: string | undefined;
    let receivedBytes = 0;

    if (this.isNative) {
      // ─── NATIVE MOBILE (Galaxy Android & iPhone iOS) ───
      // Direct native streaming to internal storage Directory.Data
      const filename = `HomeflixMedia/${downloadId}_${params.filename || 'video.mp4'}`;
      let progressHandle: PluginListenerHandle | null = null;
      let lastTime = Date.now();
      let lastBytes = 0;

      try {
        progressHandle = await Filesystem.addListener('progress', (p: { bytes: number; contentLength: number }) => {
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.4 && this.activeDownloads[downloadId]) {
            const bytesDiff = p.bytes - lastBytes;
            const speedMbps = (bytesDiff * 8) / (timeDiff * 1024 * 1024);
            const total = p.contentLength || params.duration ? p.contentLength : 0;
            const percent = total > 0 ? Math.min(99, Math.round((p.bytes / total) * 100)) : 50;
            const remainingBytes = Math.max(0, total - p.bytes);
            const bytesPerSec = timeDiff > 0 ? bytesDiff / timeDiff : 0;
            const etaSeconds = bytesPerSec > 0 ? Math.round(remainingBytes / bytesPerSec) : 0;

            this.activeDownloads[downloadId].bytesDownloaded = p.bytes;
            this.activeDownloads[downloadId].totalBytes = total || p.bytes;
            this.activeDownloads[downloadId].percent = percent;
            this.activeDownloads[downloadId].speedMbps = parseFloat(speedMbps.toFixed(1));
            this.activeDownloads[downloadId].etaSeconds = etaSeconds;
            this.notifyProgress();

            lastTime = now;
            lastBytes = p.bytes;
          }
        });

        await Filesystem.downloadFile({
          url: streamUrl,
          path: filename,
          directory: Directory.Data,
          progress: true,
          recursive: true,
        });

        videoLocalPath = filename;
        try {
          const statRes = await Filesystem.stat({
            path: filename,
            directory: Directory.Data,
          });
          receivedBytes = statRes.size;
        } catch {
          receivedBytes = this.activeDownloads[downloadId]?.bytesDownloaded || 0;
        }
      } catch (nativeErr) {
        console.warn('Native downloadFile error, falling back to fetch stream:', nativeErr);
        const response = await fetch(streamUrl, { signal });
        if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Readable stream not supported');

        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedBytes += value.length;
        }
        const videoBlob = new Blob(chunks as any, { type: 'video/mp4' });
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string) || '';
            resolve(res.split(',')[1] ?? '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(videoBlob);
        });

        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Data,
          recursive: true,
        });
        videoLocalPath = filename;
      } finally {
        if (progressHandle) {
          await progressHandle.remove();
        }
      }
    } else {
      // ─── WEB BROWSER / PC SIMULATOR ───
      // Stream chunks into IndexedDB
      const response = await fetch(streamUrl, { signal });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Readable stream not supported');

      const chunks: Uint8Array[] = [];
      let lastTime = Date.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff >= 0.5) {
          const bytesDiff = receivedBytes - lastBytes;
          const speedMbps = (bytesDiff * 8) / (timeDiff * 1024 * 1024);
          const percent = totalBytes > 0 ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100)) : 50;
          const remainingBytes = totalBytes - receivedBytes;
          const bytesPerSec = bytesDiff / timeDiff;
          const etaSeconds = bytesPerSec > 0 ? Math.round(remainingBytes / bytesPerSec) : 0;

          if (this.activeDownloads[downloadId]) {
            this.activeDownloads[downloadId].bytesDownloaded = receivedBytes;
            this.activeDownloads[downloadId].totalBytes = totalBytes || receivedBytes;
            this.activeDownloads[downloadId].percent = percent;
            this.activeDownloads[downloadId].speedMbps = parseFloat(speedMbps.toFixed(1));
            this.activeDownloads[downloadId].etaSeconds = etaSeconds;
            this.notifyProgress();
          }

          lastTime = now;
          lastBytes = receivedBytes;
        }
      }

      const videoBlob = new Blob(chunks as any, { type: 'video/mp4' });
      videoBlobKey = `video_${downloadId}`;
      await idbPut(STORE_BLOBS, videoBlobKey, videoBlob);
    }

    const offlineItem: OfflineMediaItem = {
      id: downloadId,
      mediaItemId: params.mediaItemId,
      episodeId: params.episodeId,
      title: params.title,
      titleHe: params.titleHe,
      originalTitle: params.originalTitle,
      year: params.year,
      overview: params.overview,
      duration: params.duration,
      posterDataUrl,
      fileId: params.fileId,
      filename: params.filename,
      sizeBytes: receivedBytes,
      downloadedAt: Date.now(),
      videoLocalPath,
      videoBlobKey,
      subtitles: storedSubtitles,
    };

    await this.saveManifestItem(offlineItem);

    if (this.activeDownloads[downloadId]) {
      this.activeDownloads[downloadId].status = 'completed';
      this.activeDownloads[downloadId].percent = 100;
      this.notifyProgress();

      setTimeout(() => {
        delete this.activeDownloads[downloadId];
        delete this.activeAbortControllers[downloadId];
        this.notifyProgress();
      }, 3000);
    }
  }

  /**
   * Get playable video source (local file URL on native or Blob URL on web/simulator)
   */
  public async getVideoPlaybackSrc(item: OfflineMediaItem): Promise<string> {
    if (this.isNative && item.videoLocalPath) {
      const uriResult = await Filesystem.getUri({
        path: item.videoLocalPath,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uriResult.uri);
    } else if (item.videoBlobKey) {
      if (this.blobUrlCache.has(item.id)) {
        return this.blobUrlCache.get(item.id)!;
      }
      const blob = await idbGet<Blob>(STORE_BLOBS, item.videoBlobKey);
      if (!blob) throw new Error('Video blob not found in offline storage');
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlCache.set(item.id, blobUrl);
      return blobUrl;
    }
    throw new Error('No local video available');
  }

  /**
   * Get subtitle track source (local file URL or Data URL)
   */
  public async getSubtitleSrc(sub: OfflineSubtitleTrack): Promise<string> {
    if (this.isNative && sub.localPath) {
      const uriResult = await Filesystem.getUri({
        path: sub.localPath,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uriResult.uri);
    } else if (sub.vttContent) {
      const blob = new Blob([sub.vttContent], { type: 'text/vtt' });
      return URL.createObjectURL(blob);
    }
    return '';
  }
}

export const offlineStorage = new OfflineStorageManager();

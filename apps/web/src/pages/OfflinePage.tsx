import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Play,
  Trash2,
  HardDrive,
  Subtitles,
  Clock,
  Wifi,
  WifiOff,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FolderOpen,
  X,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  offlineStorage,
  type OfflineMediaItem,
  type ActiveDownloadProgress,
} from '../lib/offlineStorage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface OfflinePageProps {
  onPlayOffline: (item: OfflineMediaItem) => void;
  onExploreOnline?: () => void;
  onPlayLocalFile?: (file: File) => void;
}

export function OfflinePage({ onPlayOffline, onExploreOnline, onPlayLocalFile }: OfflinePageProps) {
  const { language, isRtl, showToast } = useThemeLanguage();
  const { isOffline, isSimulated, toggleSimulatedOffline } = useNetworkStatus();
  const isNative = Capacitor.isNativePlatform();

  const handlePickAndPlayLocalPCFile = async () => {
    try {
      if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Video Files (MP4, MKV, WebM, AVI, MOV)',
              accept: {
                'video/*': ['.mp4', '.mkv', '.webm', '.avi', '.mov'],
              },
            },
          ],
        });
        const file = await handle.getFile();
        if (onPlayLocalFile) {
          onPlayLocalFile(file);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,.mkv,.mp4,.avi,.mov';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && onPlayLocalFile) {
            onPlayLocalFile(file);
          }
        };
        input.click();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Local file selection error:', err);
      }
    }
  };

  const [items, setItems] = useState<OfflineMediaItem[]>([]);
  const [storageUsage, setStorageUsage] = useState({ usedBytes: 0, formatted: '0 B', count: 0 });
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownloadProgress>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshItems = async () => {
    try {
      const data = await offlineStorage.getOfflineItems();
      setItems(data);
      const usage = await offlineStorage.getStorageUsage();
      setStorageUsage(usage);
    } catch (err) {
      console.error('Failed to load offline items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshItems();
    const unsub = offlineStorage.subscribeProgress((progressMap) => {
      setActiveDownloads(progressMap);
      // Refresh items list if any download just finished
      const hasCompleted = Object.values(progressMap).some((p) => p.status === 'completed');
      if (hasCompleted) {
        refreshItems();
      }
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        language === 'he'
          ? `האם למחוק את "${title}" מהאחסון הפנימי של המכשיר?`
          : `Delete "${title}" from internal device storage?`
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);
      await offlineStorage.deleteOfflineItem(id);
      showToast(
        language === 'he' ? 'הסרט נמחק ושטח האחסון התפנה' : 'Item deleted, storage freed',
        'success'
      );
      await refreshItems();
    } catch (err) {
      console.error('Failed to delete offline item:', err);
      showToast(language === 'he' ? 'שגיאה במחיקת הקובץ' : 'Error deleting file', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDownload = (id: string) => {
    offlineStorage.cancelDownload(id);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const activeDownloadsList = Object.values(activeDownloads);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 pt-24 pb-20 text-white select-none">
      {/* ─── Header & Storage Banner ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                {language === 'he' ? 'סרטים שהורדו למכשיר' : 'Downloaded to Device'}
              </h1>
              <p className="text-xs md:text-sm text-neutral-400 mt-0.5">
                {language === 'he'
                  ? 'אחסון פנימי מאובטח לצפייה אופליין ללא חיבור לאינטרנט'
                  : 'Sandboxed in-app storage for offline cinema playback anywhere'}
              </p>
            </div>
          </div>
        </div>

        {/* Storage Meter & Offline Indicator */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Storage Meter Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-neutral-400 font-medium">
                {language === 'he' ? 'נפח תפוס באפליקציה: ' : 'App Storage Used: '}
              </span>
              <span className="font-bold text-white">{storageUsage.formatted}</span>
              <span className="text-neutral-500 ml-1">
                ({storageUsage.count} {language === 'he' ? 'פריטים' : 'items'})
              </span>
            </div>
          </div>

          {/* Network Status Toggle / Indicator */}
          <div
            onClick={toggleSimulatedOffline}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={language === 'he' ? 'לחץ כדי להחליף מצב אופליין/אונליין' : 'Click to toggle simulated offline'}
          >
            {isOffline ? <WifiOff className="w-4 h-4 animate-pulse" /> : <Wifi className="w-4 h-4" />}
            <span>
              {isOffline
                ? language === 'he'
                  ? isSimulated
                    ? 'מצב אופליין (סימולציה)'
                    : 'מצב אופליין'
                  : isSimulated
                  ? 'Offline Mode (Simulated)'
                  : 'Offline Mode'
                : language === 'he'
                ? 'מחובר לאינטרנט'
                : 'Online'}
            </span>
          </div>

          {/* On Web: Play Local PC File with permissions */}
          {!isNative && onPlayLocalFile && (
            <button
              onClick={handlePickAndPlayLocalPCFile}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title={language === 'he' ? 'בחר קובץ סרט מהמחשב ונגן ישירות בנגן (דורש הרשאת דפדפן)' : 'Select movie file from PC to play (requires browser permission)'}
            >
              <FolderOpen className="w-4 h-4" />
              <span>{language === 'he' ? 'פתח קובץ מהמחשב' : 'Open PC File'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Active In-Progress Downloads ─── */}
      {activeDownloadsList.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E50914]" />
            <span>{language === 'he' ? 'הורדות בפעולה כעת' : 'Active Downloads'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeDownloadsList.map((dl) => (
              <div
                key={dl.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5 animate-in fade-in"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">
                      {language === 'he' && dl.titleHe ? dl.titleHe : dl.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1 font-mono">
                      <span>{offlineStorage.formatBytes(dl.bytesDownloaded)}</span>
                      {dl.totalBytes > 0 && <span>/ {offlineStorage.formatBytes(dl.totalBytes)}</span>}
                      {dl.speedMbps > 0 && (
                        <span className="text-emerald-400 font-bold">{dl.speedMbps} Mbps</span>
                      )}
                      {dl.etaSeconds > 0 && (
                        <span>
                          ETA: {Math.floor(dl.etaSeconds / 60)}m {dl.etaSeconds % 60}s
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelDownload(dl.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                    title={language === 'he' ? 'בטל הורדה' : 'Cancel'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        dl.status === 'completed'
                          ? 'bg-emerald-400'
                          : dl.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-[#E50914] to-red-500'
                      }`}
                      style={{ width: `${Math.max(3, dl.percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>
                      {dl.status === 'saving'
                        ? language === 'he'
                          ? 'שומר בזיכרון המכשיר...'
                          : 'Finalizing sandbox save...'
                        : `${dl.percent}%`}
                    </span>
                    <span>
                      {dl.status === 'completed'
                        ? language === 'he'
                          ? 'הושלם!'
                          : 'Completed!'
                        : dl.status === 'failed'
                        ? language === 'he'
                          ? 'נכשל'
                          : 'Failed'
                        : language === 'he'
                        ? 'מוריד...'
                        : 'Downloading...'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Downloaded Items Grid ─── */}
      <div className="mt-8">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-[#E50914] animate-spin mx-auto" />
            <p className="text-sm text-neutral-400">
              {language === 'he' ? 'טוען סרטים מהאחסון הפנימי...' : 'Reading sandbox storage...'}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-500">
              <DownloadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {language === 'he' ? 'אין עדיין סרטים שמורים במכשיר' : 'No Downloaded Movies Yet'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                {language === 'he'
                  ? 'חפש סרטים או סדרות באתר, לחץ על "הורדה למכשיר" והם יישמרו כאן לצפייה אופליין ללא אינטרנט.'
                  : 'Explore movies and tap "Download to Device". They will be saved here for offline playback anywhere.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {!isNative && onPlayLocalFile && (
                <button
                  onClick={handlePickAndPlayLocalPCFile}
                  className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>{language === 'he' ? 'פתח קובץ סרט מהמחשב ונגן ישירות' : 'Open Movie File from PC'}</span>
                </button>
              )}
              {onExploreOnline && (
                <button
                  onClick={onExploreOnline}
                  className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  {language === 'he' ? 'גלה סרטים להורדה' : 'Explore Movies'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {items.map((item) => {
              const isHebrew = language === 'he';
              const hasHebrew = Boolean(item.titleHe);
              const englishTitle = item.title || item.originalTitle || '';
              const hasBothTitles = Boolean(hasHebrew && englishTitle && item.titleHe !== englishTitle);

              const displayTitle =
                (isHebrew ? (item.titleHe || englishTitle) : (englishTitle || item.titleHe)) ||
                item.title ||
                'Movie';

              const displaySubtitle = hasBothTitles
                ? (isHebrew ? englishTitle : item.titleHe)
                : null;

              const titleDir = isHebrew ? (item.titleHe ? 'rtl' : 'ltr') : 'ltr';
              const subtitleDir = isHebrew ? 'ltr' : 'rtl';

              const hasSubtitles = item.subtitles && item.subtitles.length > 0;
              const hasHebrewSub = item.subtitles?.some((s) => s.language === 'heb' || s.language === 'he');
              const hasEnglishSub = item.subtitles?.some((s) => s.language === 'eng' || s.language === 'en');

              return (
                <div
                  key={item.id}
                  className="group relative rounded-2xl overflow-hidden bg-[#161616] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl flex flex-col"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                    {item.posterDataUrl ? (
                      <img
                        src={item.posterDataUrl}
                        alt={displayTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <DownloadCloud className="w-12 h-12" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Play Button Overlay */}
                    <button
                      onClick={() => onPlayOffline(item)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                      title={language === 'he' ? 'נגן סרט אופליין' : 'Play Offline'}
                    >
                      <div className="p-4 rounded-full bg-[#E50914] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </button>

                    {/* Subtitle Badges */}
                    {hasSubtitles && (
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        {hasHebrewSub && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/80 text-white font-bold shadow backdrop-blur-md">
                            עברית
                          </span>
                        )}
                        {hasEnglishSub && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/80 text-white font-bold shadow backdrop-blur-md">
                            EN
                          </span>
                        )}
                      </div>
                    )}

                    {/* Delete Action Button */}
                    <button
                      onClick={() => handleDelete(item.id, displayTitle)}
                      disabled={deletingId === item.id}
                      className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-500/80 text-white/70 hover:text-white transition-all duration-200 backdrop-blur-md cursor-pointer opacity-0 group-hover:opacity-100"
                      title={language === 'he' ? 'מחק מהמכשיר' : 'Delete from device'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Details Card */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-white line-clamp-1 drop-shadow" dir={titleDir}>
                        {displayTitle}
                      </h4>
                      {displaySubtitle && (
                        <p className="text-[10px] text-neutral-300 line-clamp-1 drop-shadow-sm font-medium mt-0.5" dir={subtitleDir}>
                          {displaySubtitle}
                        </p>
                      )}
                      {item.year && (
                        <p className="text-[11px] text-neutral-400 mt-0.5">{item.year}</p>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                      <span>{offlineStorage.formatBytes(item.sizeBytes)}</span>
                      {item.duration ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          {formatDuration(item.duration)}
                        </span>
                      ) : null}
                    </div>

                    {/* Big Mobile Friendly Play Button */}
                    <button
                      onClick={() => onPlayOffline(item)}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all shadow active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{language === 'he' ? 'נגן אופליין' : 'Play Offline'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

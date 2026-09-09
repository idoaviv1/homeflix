import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  HardDrive,
  Users,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FolderOpen,
  Globe,
  Monitor,
  Smartphone,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { api, type DownloadRelease, type DownloadJob } from '../lib/api';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface DownloadModalProps {
  title: string;
  tmdbId?: number;
  imdbId?: string;
  year?: number;
  primaryFileId?: string;
  onDownloadToDevice?: () => void;
  onOpenOnlineStream?: () => void;
  onPlayLocalFile?: (file: File) => void;
  onClose: () => void;
  onDownloadStarted?: (job: DownloadJob) => void;
}

export function DownloadModal({
  title,
  tmdbId,
  imdbId,
  year,
  primaryFileId,
  onDownloadToDevice,
  onOpenOnlineStream,
  onPlayLocalFile,
  onClose,
  onDownloadStarted,
}: DownloadModalProps) {
  const { t, language, isRtl } = useThemeLanguage();
  const [releases, setReleases] = useState<DownloadRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<DownloadJob | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isNative = Capacitor.isNativePlatform();

  // Search releases on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .searchDownloads({ title, tmdbId, imdbId, year })
      .then((data) => {
        if (!isMounted) return;
        setReleases(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to search downloads', err);
        setError(err.message || 'Error searching download releases');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [title, tmdbId, imdbId, year]);

  // Real-time polling for active background server job
  useEffect(() => {
    if (!activeJob) return;

    const poll = async () => {
      try {
        const jobs = await api.getDownloads();
        const updated = jobs.find((j) => j.id === activeJob.id);
        if (updated) {
          setActiveJob(updated);
        }
      } catch (err) {
        console.warn('Failed to poll download status', err);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeJob?.id]);

  const handleStartDownload = async (rel: DownloadRelease) => {
    try {
      setStartingId(rel.id);
      setError(null);

      const job = await api.startDownload({
        title,
        tmdbId,
        imdbId,
        year,
        quality: rel.quality,
        magnetUrl: rel.magnetUrl,
        infoHash: rel.infoHash,
      });

      setActiveJob(job);
      if (onDownloadStarted) {
        onDownloadStarted(job);
      }
    } catch (err: any) {
      console.error('Start download failed', err);
      setError(err.message || 'שגיאה בהפעלת ההורדה לשרת');
    } finally {
      setStartingId(null);
    }
  };

  // Local PC File System Picker
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
          onClose();
          onPlayLocalFile(file);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,.mkv,.mp4,.avi,.mov';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && onPlayLocalFile) {
            onClose();
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

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case '4K':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case '1080p':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case '720p':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 animate-modal-backdrop flex items-center justify-center p-3 md:p-6 select-none">
      <div className="relative w-full max-w-2xl bg-[#161616] border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[85vh] animate-modal-sheet">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#1b1b1b]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('downloadMovieTitle')}</h2>
              <p className="text-xs text-neutral-400">
                {title} {year ? `(${year})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all duration-300 hover:rotate-90 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── DIRECT DEVICE DOWNLOAD BANNER (IF FILE EXISTS IN LIBRARY) ─── */}
          {onDownloadToDevice && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-emerald-950/20 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    {language === 'he' ? 'הסרט זמין להורדה ישירה לטלפון!' : 'Movie ready for direct download to phone!'}
                  </span>
                  <span className="text-xs text-emerald-200/80 block mt-0.5">
                    {language === 'he'
                      ? 'הסרט שמור בספרייה הביתית — הורד עכשיו לצפייה אופליין ללא פרסומות וללא אינטרנט'
                      : 'Stored on home library — download now for ad-free offline viewing'}
                  </span>
                </div>
              </div>
              <button
                onClick={onDownloadToDevice}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {language === 'he' ? 'הורד לטלפון עכשיו' : 'Download to Phone Now'}
              </button>
            </div>
          )}

          {/* ─── WEB PLATFORM HONEST NOTICE & ACTIONS ─── */}
          {!isNative && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{t('downloadNoticeWeb')}</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {t('downloadNoticeWebDesc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 1. Pick & Play Local File on PC */}
                <button
                  onClick={handlePickAndPlayLocalPCFile}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-start transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {t('pickAndPlayPC')}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      {t('pickAndPlayPCDesc')}
                    </span>
                  </div>
                </button>

                {/* 2. Direct Online Streaming */}
                {onOpenOnlineStream && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenOnlineStream();
                    }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 text-start transition-all cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-[#E50914]/20 text-[#E50914] mt-0.5 group-hover:scale-110 transition-transform">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {t('watchOnline')}
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {language === 'he' ? 'צפה ישירות בזרם וידאו ללא צורך בהורדת קבצים' : 'Stream directly in web player without saving files'}
                      </span>
                    </div>
                  </button>
                )}

                {/* 3. Direct PC File Download (if primaryFile exists) */}
                {primaryFileId && (
                  <a
                    href={`/api/v1/stream/${primaryFileId}/download`}
                    download
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-start transition-all cursor-pointer group sm:col-span-2"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {t('downloadVideoFile')}
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {language === 'he' ? 'הורד את קובץ ה-MP4 ישירות לתיקיית ההורדות במחשב שלך' : 'Save full MP4 file directly into your PC Downloads folder'}
                      </span>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ─── ACTIVE SERVER DOWNLOAD REAL LIVE TRACKING ─── */}
          {activeJob ? (
            <div className="p-5 rounded-xl bg-neutral-900/90 border border-white/15 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#E50914]/20 text-[#E50914]">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t('serverDownloadingStatus')}</h3>
                    <p className="text-[11px] text-neutral-400">
                      {activeJob.title} • {activeJob.quality || '1080p'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                    activeJob.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : activeJob.status === 'downloading'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : 'bg-white/10 text-neutral-400'
                  }`}
                >
                  {activeJob.status === 'downloading'
                    ? (language === 'he' ? 'מוריד ברקע לשרת' : 'Downloading')
                    : activeJob.status === 'completed'
                    ? (language === 'he' ? 'הושלם בשרת' : 'Completed')
                    : activeJob.status}
                </span>
              </div>

              {/* Live Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">
                    {activeJob.downloadedSize} / {activeJob.totalSize} ({activeJob.progress}%)
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {activeJob.downloadSpeed !== '0 KB/s' ? activeJob.downloadSpeed : (language === 'he' ? 'מתחבר למקורות...' : 'Connecting to peers...')}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#E50914] to-red-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(2, activeJob.progress))}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-neutral-400 bg-black/40 p-3 rounded-lg border border-white/5 font-mono">
                <div>
                  <span className="text-neutral-500 block text-[10px]">
                    {language === 'he' ? 'זמן משוער (ETA):' : 'Estimated Time (ETA):'}
                  </span>
                  <span className="text-white font-semibold">{activeJob.eta}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">
                    {language === 'he' ? 'מקורות מחוברים (Peers):' : 'Connected Peers:'}
                  </span>
                  <span className="text-white font-semibold">{activeJob.peers} seeds</span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed bg-white/5 p-2.5 rounded-lg">
                {t('serverDownloadDesc')}
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {t('gotIt')}
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#E50914] animate-spin mx-auto" />
              <p className="text-sm text-neutral-300 font-medium">{t('scanningSources')}</p>
              <p className="text-xs text-neutral-500">{t('checkingTorrentio')}</p>
            </div>
          ) : releases.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-neutral-500 mx-auto" />
              <p className="text-sm font-semibold text-neutral-300">{t('noReleasesFound')}</p>
              <p className="text-xs text-neutral-500">
                {t('noReleasesDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="text-xs text-neutral-400 flex flex-col gap-1 pb-1 border-b border-white/10">
                <span className="font-bold text-neutral-200">
                  {t('serverDownloadSection')}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {t('serverDownloadDesc')}
                </span>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {releases.map((rel) => {
                  const isStarting = startingId === rel.id;
                  return (
                    <div
                      key={rel.id}
                      className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Release Info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md font-bold border ${getQualityBadge(
                              rel.quality,
                            )}`}
                          >
                            {rel.quality}
                          </span>
                          <span className="text-xs font-semibold text-white truncate max-w-[320px] sm:max-w-[400px]">
                            {rel.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-neutral-400">
                          <span className="flex items-center gap-1 font-mono">
                            <HardDrive className="w-3.5 h-3.5 text-neutral-500" />
                            {rel.size}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400 font-mono font-medium">
                            <Users className="w-3.5 h-3.5" />
                            {rel.seeds} {t('seeds')}
                          </span>
                          <span className="text-neutral-500 text-[11px]">{t('source')}: {rel.source}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleStartDownload(rel)}
                        disabled={isStarting}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-[#E50914] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex-shrink-0 cursor-pointer border border-white/10"
                        title={language === 'he' ? 'הפעל הורדה ברקע לאחסון השרת' : 'Start background download to server'}
                      >
                        {isStarting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{t('starting')}</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>{language === 'he' ? 'הורד לשרת (Aria2)' : 'Download to Server'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#121212] border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
          <span>{t('storagePathNotice')}</span>
          <button onClick={onClose} className="hover:text-white transition-colors cursor-pointer">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

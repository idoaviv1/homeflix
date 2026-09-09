import React, { useState, useEffect } from 'react';
import {
  Play,
  Plus,
  Check,
  Heart,
  X,
  Clock,
  Film,
  Calendar,
  Sparkles,
  Volume2,
  Tv,
  Globe,
  Download,
  Smartphone,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { api, type MediaItem, type Season, type Episode, type MediaFile } from '../lib/api';
import { OnlineStreamModal } from './OnlineStreamModal';
import { DownloadModal } from './DownloadModal';
import { SubtitlePickerModal } from './SubtitlePickerModal';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface MediaModalProps {
  mediaId: string;
  onClose: () => void;
  onPlay: (file: MediaFile, title: string, subtitle?: string, nextEpisode?: any) => void;
  onPlayLocalFile?: (file: File) => void;
}

export function MediaModal({ mediaId, onClose, onPlay, onPlayLocalFile }: MediaModalProps) {
  const { t, language, showToast } = useThemeLanguage();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [watchlistAnimating, setWatchlistAnimating] = useState(false);
  const [favoriteAnimating, setFavoriteAnimating] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [showOnlineStream, setShowOnlineStream] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSandboxDownloadModal, setShowSandboxDownloadModal] = useState(false);
  const [sandboxDownloadTarget, setSandboxDownloadTarget] = useState<{
    file: MediaFile;
    title: string;
    episodeId?: string;
  } | null>(null);

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

  useEffect(() => {
    let isMounted = true;
    api
      .getMedia(mediaId)
      .then((data) => {
        if (!isMounted) return;
        setMedia(data);
        setInWatchlist(data.userState?.inWatchlist || false);
        setIsFavorite(data.userState?.isFavorite || false);
        const firstSeason = data.seasons?.[0];
        if (firstSeason) {
          setSelectedSeason(firstSeason.seasonNumber);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load media details', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mediaId]);

  const handleToggleWatchlist = async () => {
    setWatchlistAnimating(true);
    setTimeout(() => setWatchlistAnimating(false), 500);
    const nextState = !inWatchlist;
    setInWatchlist(nextState);

    try {
      const res = await api.toggleWatchlist(mediaId);
      if (res && typeof res.inWatchlist === 'boolean') {
        setInWatchlist(res.inWatchlist);
        showToast(
          res.inWatchlist ? t('addedToWatchlist') : t('removedFromWatchlistToast'),
          'success'
        );
      }
    } catch (err) {
      setInWatchlist(!nextState);
      showToast(
        language === 'he'
          ? 'יש להתחבר כדי לשמור ברשימת הצפייה'
          : 'Please sign in to save to your watchlist',
        'error'
      );
    }
  };

  const handleToggleFavorite = async () => {
    setFavoriteAnimating(true);
    setTimeout(() => setFavoriteAnimating(false), 600);
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    showToast(
      nextState ? t('addedToFavoritesToast') : t('removedFromFavoritesToast'),
      'heart'
    );
    try {
      const res = await api.toggleFavorite(mediaId);
      if (res && typeof res.isFavorite === 'boolean') {
        setIsFavorite(res.isFavorite);
      }
    } catch (err) {
      console.warn('Favorite toggle error:', err);
    }
  };

  const handleTrailerClick = async () => {
    if (!media) return;
    if (media.trailerKey) {
      setShowTrailer(true);
      return;
    }
    setTrailerLoading(true);
    try {
      const res = await api.getTrailer(media.id, {
        title: media.title,
        year: media.year || undefined,
        tmdbId: media.tmdbId,
      });
      if (res?.trailerKey) {
        setMedia((prev) => (prev ? { ...prev, trailerKey: res.trailerKey || undefined } : prev));
        setShowTrailer(true);
      } else {
        showToast(language === 'he' ? 'לא נמצא טריילר זמין לסרט זה' : 'No trailer available for this title', 'error');
      }
    } catch {
      showToast(language === 'he' ? 'שגיאה בטעינת הטריילר' : 'Error loading trailer', 'error');
    } finally {
      setTrailerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]" />
      </div>
    );
  }

  if (!media) return null;

  const currentSeason = media.seasons?.find((s) => s.seasonNumber === selectedSeason);
  const primaryFile = media.files?.[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 animate-modal-backdrop flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto scrollbar-hide">
      <div className="relative w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl my-auto text-white animate-modal-sheet max-h-[95dvh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all duration-300 hover:rotate-90 border border-white/10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ─── Hero Backdrop Banner ─── */}
        <div className="relative h-56 sm:h-64 md:h-96 w-full shrink-0 overflow-hidden">
          {showTrailer && media.trailerKey ? (
            <div className="relative w-full h-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${media.trailerKey}?autoplay=1&controls=1&rel=0`}
                title="Trailer"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                className="w-full h-full border-0"
              />
              <button
                onClick={() => setShowTrailer(false)}
                className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg cursor-pointer transition-all active:scale-95"
                title={language === 'he' ? 'חזור לתמונת הסרט' : 'Back to Banner'}
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'he' ? 'חזור לתמונה' : 'Back to Banner'}</span>
              </button>
            </div>
          ) : (
            <>
              <img
                src={media.backdropPath || media.posterPath || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920'}
                alt={media.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-transparent to-transparent" />

              {/* Title & Actions inside Backdrop */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col justify-end animate-cascade-1">
                {(() => {
                  const isHebrew = language === 'he';
                  const hasHebrew = Boolean(media.titleHe);
                  const englishTitle = media.title || media.originalTitle || '';
                  const hasBothTitles = Boolean(hasHebrew && englishTitle && media.titleHe !== englishTitle);

                  const displayTitle = isHebrew
                    ? (media.titleHe || englishTitle)
                    : (englishTitle || media.titleHe);

                  const displaySubtitle = hasBothTitles
                    ? (isHebrew ? englishTitle : media.titleHe)
                    : null;

                  const titleDir = isHebrew ? (media.titleHe ? 'rtl' : 'ltr') : 'ltr';
                  const subtitleDir = isHebrew ? 'ltr' : 'rtl';

                  return (
                    <>
                      <h1
                        className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md"
                        dir={titleDir}
                      >
                        {displayTitle}
                      </h1>
                      {displaySubtitle && (
                        <h2 className="text-lg md:text-xl text-neutral-300 font-medium drop-shadow mt-1" dir={subtitleDir}>
                          {displaySubtitle}
                        </h2>
                      )}
                    </>
                  );
                })()}
                {media.tagline && (
                  <p className="text-sm italic text-neutral-300 mt-1 drop-shadow">{media.tagline}</p>
                )}

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 mt-4 animate-cascade-2">
                  {primaryFile && (
                    <button
                      onClick={() => onPlay(primaryFile, media.title)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-all shadow-lg active:scale-95 cursor-pointer btn-interactive"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      {t('playLocal')}
                    </button>
                  )}

                  {/* Direct Online Streaming Button */}
                  <button
                    onClick={() => setShowOnlineStream(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-sm shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer btn-interactive"
                  >
                    <Globe className="w-4 h-4" />
                    {t('watchOnline')}
                  </button>

                  {/* In-App Offline Download Button */}
                  {primaryFile && (
                    <button
                      onClick={() => {
                        setSandboxDownloadTarget({
                          file: primaryFile,
                          title: language === 'he' && media.titleHe ? media.titleHe : media.title,
                        });
                        setShowSandboxDownloadModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-semibold text-sm backdrop-blur-sm transition-all border border-emerald-500/40 cursor-pointer btn-interactive active:scale-95 shadow-lg shadow-emerald-950/30"
                      title={language === 'he' ? 'הורד לצפייה אופליין ללא אינטרנט וללא פרסומות' : 'Download for ad-free offline viewing'}
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'he' ? (isNative ? 'הורד לטלפון (אופליין)' : 'הורד לטלפון / אופליין') : (isNative ? 'Download to Phone' : 'Download Offline')}</span>
                    </button>
                  )}

                  {/* Pick & Play Local File on Computer (Website with browser permission) */}
                  {!isNative && onPlayLocalFile && (
                    <button
                      onClick={handlePickAndPlayLocalPCFile}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-sm backdrop-blur-sm transition-all border border-amber-500/30 cursor-pointer btn-interactive active:scale-95"
                      title={language === 'he' ? 'בחר קובץ סרט מהמחשב ונגן ישירות בנגן (דורש הרשאה)' : 'Pick movie file from computer and play in player (requires permission)'}
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>{language === 'he' ? 'פתח קובץ מהמחשב' : 'Open PC File'}</span>
                    </button>
                  )}

                  {/* Download to Server Button */}
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm transition-all border border-white/10 cursor-pointer btn-interactive active:scale-95"
                    title={t('download')}
                  >
                    <Download className="w-4 h-4" />
                    {t('download')}
                  </button>

                  {!showTrailer && (
                    <button
                      onClick={handleTrailerClick}
                      disabled={trailerLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm transition-all border border-white/10 cursor-pointer btn-interactive active:scale-95 disabled:opacity-50"
                      title={t('trailer')}
                    >
                      {trailerLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#E50914]" />
                      ) : (
                        <Film className="w-4 h-4" />
                      )}
                      <span>
                        {trailerLoading
                          ? (language === 'he' ? 'טוען טריילר...' : 'Loading...')
                          : t('trailer')}
                      </span>
                    </button>
                  )}

                  {/* Watchlist Toggle Button with Check Pop */}
                  <button
                    onClick={handleToggleWatchlist}
                    className={`p-2.5 rounded-lg transition-all duration-300 border cursor-pointer btn-interactive ${
                      inWatchlist
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/20'
                    }`}
                    title={inWatchlist ? t('removeFromWatchlist') : t('addToWatchlist')}
                  >
                    {inWatchlist ? (
                      <Check className={`w-5 h-5 ${watchlistAnimating ? 'animate-check-pop' : ''}`} />
                    ) : (
                      <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    )}
                  </button>

                  {/* Favorites Toggle Button with Heart Burst */}
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2.5 rounded-lg transition-all duration-300 border cursor-pointer btn-interactive ${
                      isFavorite
                        ? 'bg-red-500/20 text-red-500 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.45)]'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/20'
                    }`}
                    title={isFavorite ? t('isFavorite') : t('addToFavorites')}
                  >
                    <Heart
                      className={`w-5 h-5 transition-all ${
                        isFavorite ? 'fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''
                      } ${favoriteAnimating ? 'animate-heart-burst' : ''}`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─── Details Section ─── */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-cascade-3 overflow-y-auto scrollbar-hide flex-1">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-300">
            {media.rating && (
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <Sparkles className="w-4 h-4" />
                {(media.rating * 10).toFixed(0)}% Match
              </span>
            )}
            {media.year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-neutral-400" />
                {media.year}
              </span>
            )}
            {media.runtime && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-neutral-400" />
                {Math.floor(media.runtime / 60)}h {media.runtime % 60}m
              </span>
            )}
            {primaryFile?.videoCodec && (
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-white/10 text-neutral-300 border border-white/10">
                {primaryFile.width && primaryFile.width >= 3840 ? '4K UHD' : '1080p'}
              </span>
            )}
            {primaryFile?.isHdr && (
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {primaryFile.hdrFormat || 'HDR'}
              </span>
            )}
            {primaryFile?.audioStreams?.[0] && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Volume2 className="w-3.5 h-3.5" />
                {primaryFile.audioStreams[0].codec.toUpperCase()}{' '}
                {primaryFile.audioStreams[0].channels > 2 ? '5.1' : 'Stereo'}
              </span>
            )}
          </div>

          {/* Overview */}
          <div className="space-y-2">
            <p
              className="text-sm md:text-base text-neutral-300 leading-relaxed"
              dir={language === 'he' ? 'rtl' : 'ltr'}
            >
              {(language === 'he'
                ? (media.overviewHe || media.overview)
                : (media.overview || media.overviewHe)) || t('noSynopsis')}
            </p>
          </div>

          {/* Genres */}
          {media.genres && media.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.genres.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-white/5"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* ─── TV Episodes Selector (If Show) ─── */}
          {media.type === 'show' && media.seasons && media.seasons.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#E50914]" />
                  {t('episodes')}
                </h3>

                {/* Season Picker */}
                {media.seasons.length > 1 && (
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(parseInt(e.target.value, 10))}
                    className="bg-neutral-900 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-[#E50914]"
                  >
                    {media.seasons.map((s) => (
                      <option key={s.id} value={s.seasonNumber}>
                        {t('season')} {s.seasonNumber}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Episodes List */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {(currentSeason?.episodes || []).map((ep, idx, allEps) => {
                  const epFile = ep.mediaFile;
                  const nextEp = allEps[idx + 1];

                  return (
                    <div
                      key={ep.id}
                      className="group flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/80 transition-colors border border-white/5"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <span className="text-lg font-bold text-neutral-500 w-6 text-center group-hover:text-white transition-colors">
                          {ep.episodeNumber}
                        </span>
                        {ep.stillPath && (
                          <img
                            src={ep.stillPath}
                            alt={ep.title}
                            className="w-24 h-14 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">{ep.title}</h4>
                          {ep.overview && (
                            <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">
                              {ep.overview}
                            </p>
                          )}
                          {ep.runtime && (
                            <span className="text-xs text-neutral-500 mt-1 block">
                              {ep.runtime} min
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {epFile && (
                          <button
                            onClick={() =>
                              onPlay(
                                epFile,
                                media.title,
                                `S${ep.seasonNumber}:E${ep.episodeNumber} ${ep.title}`,
                                nextEp?.mediaFile
                                  ? {
                                      episodeId: nextEp.id,
                                      title: `S${nextEp.seasonNumber}:E${nextEp.episodeNumber} ${nextEp.title}`,
                                      file: nextEp.mediaFile,
                                    }
                                  : undefined,
                              )
                            }
                            className="p-3 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors shadow-md flex-shrink-0 cursor-pointer"
                            title={t('playLocal')}
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        )}

                        {isNative && epFile && (
                          <button
                            onClick={() => {
                              setSandboxDownloadTarget({
                                file: epFile,
                                title: `${media.title} - S${ep.seasonNumber}:E${ep.episodeNumber}`,
                                episodeId: ep.id,
                              });
                              setShowSandboxDownloadModal(true);
                            }}
                            className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all shadow-md flex-shrink-0 cursor-pointer"
                            title={language === 'he' ? 'הורד פרק זה לאפליקציה לצפייה אופליין' : 'Download episode for offline playback'}
                          >
                            <Smartphone className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedEpisode(ep.episodeNumber);
                            setShowOnlineStream(true);
                          }}
                          className="p-2.5 rounded-full bg-red-600/20 text-[#E50914] border border-[#E50914]/40 hover:bg-[#E50914] hover:text-white transition-all shadow-md flex-shrink-0 cursor-pointer"
                          title={t('watchOnline')}
                        >
                          <Globe className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cast Cards */}
          {media.cast && media.cast.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">{t('cast')}</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {media.cast.slice(0, 8).map((c) => (
                  <div key={c.name} className="flex-shrink-0 w-24 text-center">
                    <img
                      src={c.profilePath || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=185&auto=format&fit=crop&q=80'}
                      alt={c.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border border-white/10"
                    />
                    <p className="text-xs font-bold text-white truncate">{c.name}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{c.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Online Streaming Player Modal */}
      {showOnlineStream && (
        <OnlineStreamModal
          title={language === 'he' && media.titleHe ? media.titleHe : (media.title || media.originalTitle || '')}
          tmdbId={media.tmdbId}
          imdbId={media.imdbId}
          type={media.type}
          season={selectedSeason}
          episode={selectedEpisode}
          seasonsCount={media.seasons?.length}
          onClose={() => setShowOnlineStream(false)}
        />
      )}

      {/* Download to Server Modal */}
      {showDownloadModal && (
        <DownloadModal
          title={media.title}
          tmdbId={media.tmdbId}
          imdbId={media.imdbId}
          year={media.year}
          primaryFileId={primaryFile?.id}
          onDownloadToDevice={
            primaryFile
              ? () => {
                  setShowDownloadModal(false);
                  setSandboxDownloadTarget({
                    file: primaryFile,
                    title: language === 'he' && media.titleHe ? media.titleHe : media.title,
                  });
                  setShowSandboxDownloadModal(true);
                }
              : undefined
          }
          onOpenOnlineStream={() => setShowOnlineStream(true)}
          onPlayLocalFile={onPlayLocalFile}
          onClose={() => setShowDownloadModal(false)}
        />
      )}

      {/* In-App Offline Sandbox Download Subtitle Picker Modal */}
      {showSandboxDownloadModal && sandboxDownloadTarget && (
        <SubtitlePickerModal
          isOpen={showSandboxDownloadModal}
          onClose={() => {
            setShowSandboxDownloadModal(false);
            setSandboxDownloadTarget(null);
          }}
          mediaItemId={media.id}
          episodeId={sandboxDownloadTarget.episodeId}
          title={sandboxDownloadTarget.title}
          titleHe={media.titleHe}
          originalTitle={media.originalTitle}
          year={media.year}
          overview={media.overview}
          posterPath={media.posterPath || media.backdropPath}
          file={sandboxDownloadTarget.file}
        />
      )}
    </div>
  );
}

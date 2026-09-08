import React, { useState, useEffect } from 'react';
import { Play, Info, Clock, CheckCircle2, Film, Tv, Calendar, RefreshCw } from 'lucide-react';
import { api, type WatchHistoryItem, type MediaFile } from '../lib/api';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface WatchHistoryPageProps {
  onOpenMedia: (id: string) => void;
  onPlay: (file: MediaFile, title: string, subtitle?: string, initialTime?: number) => void;
  onBrowseLibrary: () => void;
}

export function WatchHistoryPage({
  onOpenMedia,
  onPlay,
  onBrowseLibrary,
}: WatchHistoryPageProps) {
  const { language, t } = useThemeLanguage();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const items = await api.getWatchHistory();
      setHistory(items);
    } catch (err) {
      console.error('Failed to load watch history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleResume = async (item: WatchHistoryItem) => {
    setResumingId(item.id);
    try {
      const full = await api.getMedia(item.mediaItemId);
      const file = full.files?.[0];
      if (file) {
        onPlay(
          file,
          language === 'he' && full.titleHe ? full.titleHe : full.title,
          undefined,
          item.currentTime
        );
      } else {
        onOpenMedia(item.mediaItemId);
      }
    } catch (err) {
      console.error('Failed to resume media', err);
      onOpenMedia(item.mediaItemId);
    } finally {
      setResumingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pt-24 pb-20 px-4 md:px-12 max-w-[1920px] mx-auto animate-in fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
              <Clock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              {t('watchHistory')}
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-2">
            {language === 'he'
              ? 'רשימת כל הכותרים שצפית בהם, כולל הדקה המדויקת שבה עצרת ואפשרות להמשיך ישירות'
              : 'All titles you have watched, with exact stopped minutes and 1-click playback resumption.'}
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-all self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'he' ? 'רענן היסטוריה' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]" />
          <p className="text-sm text-neutral-400">
            {language === 'he' ? 'טוען היסטוריית צפייה...' : 'Loading watch history...'}
          </p>
        </div>
      ) : history.length === 0 ? (
        <div className="py-24 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-neutral-500">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {language === 'he' ? 'אין היסטוריית צפייה שמורה' : 'No watch history yet'}
          </h2>
          <p className="text-sm text-neutral-400 mb-6">
            {t('noWatchHistory')}
          </p>
          <button
            onClick={onBrowseLibrary}
            className="px-6 py-2.5 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-white text-sm font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            {language === 'he' ? 'גלה סרטים וסדרות' : 'Browse Library'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {history.map((item) => {
            const isHebrew = language === 'he';
            const hasHebrew = Boolean(item.titleHe);
            const englishTitle = item.title || item.originalTitle || '';
            const hasBothTitles = Boolean(hasHebrew && englishTitle && item.titleHe !== englishTitle);

            const displayTitle = isHebrew
              ? (item.titleHe || englishTitle)
              : (englishTitle || item.titleHe);

            const displaySubtitle = hasBothTitles
              ? (isHebrew ? englishTitle : item.titleHe)
              : null;

            const imageSrc =
              item.episode?.stillPath ||
              item.backdropPath ||
              item.posterPath ||
              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800';

            return (
              <div
                key={item.id}
                className="group relative bg-[#18181b] rounded-2xl border border-white/10 overflow-hidden shadow-xl hover:border-white/20 transition-all duration-300 flex flex-col"
              >
                {/* Thumbnail Container */}
                <div
                  onClick={() => onOpenMedia(item.mediaItemId)}
                  className="relative aspect-video w-full overflow-hidden bg-neutral-900 cursor-pointer"
                >
                  <img
                    src={imageSrc}
                    alt={displayTitle || ''}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {item.finished ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/80 text-white backdrop-blur-md shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('completed')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-md">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>
                          {t('stoppedAtMinute')} {item.stoppedMinute} {item.totalMinutes > 0 ? `${t('ofMinutes')} ${item.totalMinutes} ${t('minutesShort')}` : ''}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Type icon */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="p-1.5 rounded-full bg-black/60 text-white/80 backdrop-blur-md border border-white/10 flex items-center justify-center">
                      {item.type === 'show' ? <Tv className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                    <div
                      className={`h-full ${item.finished ? 'bg-emerald-500' : 'bg-[#E50914]'}`}
                      style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                    />
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3
                      onClick={() => onOpenMedia(item.mediaItemId)}
                      className="font-bold text-base text-white hover:text-[#E50914] transition-colors cursor-pointer line-clamp-1"
                      dir={isHebrew && item.titleHe ? 'rtl' : 'ltr'}
                    >
                      {displayTitle}
                    </h3>
                    {displaySubtitle && (
                      <p
                        className="text-xs text-neutral-400 line-clamp-1 mt-0.5"
                        dir={isHebrew ? 'ltr' : 'rtl'}
                      >
                        {displaySubtitle}
                      </p>
                    )}

                    {item.episode && (
                      <p className="text-xs text-neutral-300 font-medium mt-1">
                        S{item.episode.seasonNumber}:E{item.episode.episodeNumber} - {item.episode.title}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-2">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{t('lastWatched')}: {formatDate(item.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleResume(item)}
                      disabled={resumingId === item.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {resumingId === item.id
                          ? (language === 'he' ? 'טוען...' : 'Loading...')
                          : `${t('resumeWatching')} (${item.stoppedMinute} ${t('minutesShort')})`}
                      </span>
                    </button>

                    <button
                      onClick={() => onOpenMedia(item.mediaItemId)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 cursor-pointer active:scale-95"
                      title={t('moreInfo')}
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

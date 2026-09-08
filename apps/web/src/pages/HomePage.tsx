import React, { useState, useEffect } from 'react';
import { Play, Info, Plus, Check, FolderSync, Sparkles, Globe } from 'lucide-react';
import { MediaRow } from '../components/MediaRow';
import { OnlineStreamModal } from '../components/OnlineStreamModal';
import { api, type HomeFeed, type MediaFile } from '../lib/api';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface HomePageProps {
  onOpenMedia: (id: string) => void;
  onPlay: (file: MediaFile, title: string, subtitle?: string, initialTime?: number) => void;
  user?: any;
}

export function HomePage({ onOpenMedia, onPlay, user }: HomePageProps) {
  const { language, t, showToast } = useThemeLanguage();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistAnimating, setWatchlistAnimating] = useState(false);
  const [showHeroStream, setShowHeroStream] = useState(false);

  const loadFeed = async () => {
    try {
      const data = await api.getHomeFeed();
      setFeed(data);
      if (data.hero) {
        const isHeroInWatchlist = Boolean(
          data.hero.inWatchlist ??
          (data.watchlist && data.watchlist.some((item) => item.id === data.hero?.id))
        );
        setInWatchlist(isHeroInWatchlist);
      } else {
        setInWatchlist(false);
      }
    } catch (err) {
      console.error('Failed to load feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [user?.id]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await api.triggerScan();
      setTimeout(async () => {
        await loadFeed();
        setIsScanning(false);
      }, 3000);
    } catch {
      setIsScanning(false);
    }
  };

  const hero = feed?.hero;

  const handleHeroPlay = async () => {
    if (!hero) return;
    try {
      const full = await api.getMedia(hero.id);
      const file = full.files?.[0];
      if (file) {
        onPlay(file, full.title);
      } else {
        setShowHeroStream(true);
      }
    } catch {
      onOpenMedia(hero.id);
    }
  };

  const handleHeroWatchlist = async () => {
    if (!hero) return;
    setWatchlistAnimating(true);
    setTimeout(() => setWatchlistAnimating(false), 500);
    const nextState = !inWatchlist;
    setInWatchlist(nextState);

    try {
      const res = await api.toggleWatchlist(hero.id);
      if (res && typeof res.inWatchlist === 'boolean') {
        setInWatchlist(res.inWatchlist);
        showToast(
          res.inWatchlist ? t('addedToWatchlist') : t('removedFromWatchlistToast'),
          'success'
        );
      }
    } catch (err) {
      // Revert optimistic update
      setInWatchlist(!nextState);
      showToast(
        language === 'he'
          ? 'יש להתחבר כדי לשמור ברשימת הצפייה'
          : 'Please sign in to save to your watchlist',
        'error'
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0F0F0F] text-white pb-16">
      {/* ─── Hero Section ─── */}
      <section className="relative h-[80vh] md:h-[88vh] flex items-end overflow-hidden">
        {/* Backdrop Image or Gradient */}
        {hero?.backdropPath ? (
          <img
            src={hero.backdropPath}
            alt={hero.title}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-[#0F0F0F] to-[#0F0F0F]" />
        )}

        {/* Cinematic Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F]/90 via-[#0F0F0F]/30 to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 md:px-12 pb-16 md:pb-24">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-[#E50914] uppercase">
                H O M E F L I X
              </span>
              {hero?.rating && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  {(hero.rating * 10).toFixed(0)}% Match
                </span>
              )}
              {hero?.inLibrary && (
                <span className="text-xs font-medium text-white/80 bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                  {language === 'he' ? 'בספרייה המקומית' : 'In Local Library'}
                </span>
              )}
            </div>

            {(() => {
              const isHebrew = language === 'he';
              const hasHebrew = Boolean(hero?.titleHe);
              const englishTitle = hero?.title || hero?.originalTitle || 'Homeflix';
              const hasBothTitles = Boolean(hasHebrew && englishTitle && hero?.titleHe !== englishTitle);

              const displayTitle = isHebrew
                ? (hero?.titleHe || englishTitle)
                : (englishTitle || hero?.titleHe);

              const displaySubtitle = hasBothTitles
                ? (isHebrew ? englishTitle : hero?.titleHe)
                : null;

              const titleDir = isHebrew ? (hero?.titleHe ? 'rtl' : 'ltr') : 'ltr';
              const subtitleDir = isHebrew ? 'ltr' : 'rtl';

              return (
                <div>
                  <h1
                    className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight drop-shadow-2xl text-white"
                    dir={titleDir}
                  >
                    {displayTitle}
                  </h1>
                  {displaySubtitle && (
                    <p
                      className="text-lg md:text-2xl text-neutral-300 font-semibold drop-shadow-md mt-1"
                      dir={subtitleDir}
                    >
                      {displaySubtitle}
                    </p>
                  )}
                </div>
              );
            })()}

            {hero?.tagline && (
              <p className="text-sm md:text-base italic text-neutral-300 drop-shadow">
                "{hero.tagline}"
              </p>
            )}

            <p className="text-sm md:text-base text-neutral-300 leading-relaxed max-w-lg line-clamp-3 drop-shadow">
              {language === 'he'
                ? (hero?.overviewHe || hero?.overview || 'ברוכים הבאים ל-Homeflix. קולנוע ביתי פרטי עם אלפי סרטים וסדרות לצפייה ישירה מיידית או הורדה באיכות גבוהה.')
                : (hero?.overview || 'Welcome to Homeflix. Your private cinema with thousands of movies and series for instant online streaming or high-speed downloading.')}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {hero ? (
                <>
                  {hero.inLibrary && (
                    <button
                      onClick={handleHeroPlay}
                      className="flex items-center gap-2 rounded-lg bg-white px-7 py-3 text-sm font-bold text-black transition-all hover:bg-neutral-200 active:scale-95 shadow-xl cursor-pointer btn-interactive"
                    >
                      <Play className="h-5 w-5 fill-current" />
                      {t('playLocal')}
                    </button>
                  )}

                  {/* Direct Online Streaming Button */}
                  <button
                    onClick={() => setShowHeroStream(true)}
                    className="flex items-center gap-2 rounded-lg bg-[#E50914] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#b80710] active:scale-95 shadow-xl shadow-[#E50914]/40 cursor-pointer btn-interactive"
                  >
                    <Globe className="h-5 w-5" />
                    {t('watchOnline')}
                  </button>

                  <button
                    onClick={() => onOpenMedia(hero.id)}
                    className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/30 active:scale-95 border border-white/10 cursor-pointer btn-interactive"
                  >
                    <Info className="h-5 w-5" />
                    {t('moreInfo')}
                  </button>

                  <button
                    onClick={handleHeroWatchlist}
                    className={`flex items-center justify-center rounded-full h-11 w-11 border transition-all backdrop-blur-md cursor-pointer btn-interactive active:scale-90 ${
                      inWatchlist
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'border-white/20 bg-black/40 text-neutral-300 hover:border-white hover:text-white'
                    }`}
                    title={inWatchlist ? t('inWatchlist') : t('addToWatchlist')}
                  >
                    {inWatchlist ? (
                      <Check className={`h-5 w-5 text-emerald-400 ${watchlistAnimating ? 'animate-check-pop' : ''}`} />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="flex items-center gap-2 rounded-lg bg-[#E50914] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#b80710] shadow-lg shadow-[#E50914]/30 cursor-pointer"
                >
                  <FolderSync className={`h-5 w-5 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? t('scanning') : t('scanLibrary')}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Content Rows ─── */}
      <div className="relative z-10 -mt-20 md:-mt-28 space-y-8 pb-20">
        {/* Continue Watching */}
        {feed?.continueWatching && feed.continueWatching.length > 0 && (
          <MediaRow
            title={t('continueWatching')}
            items={feed.continueWatching}
            isContinueWatching
            onSelect={onOpenMedia}
            onPlay={async (id) => {
              const full = await api.getMedia(id);
              const file = full.files?.[0];
              const cwItem = feed.continueWatching.find((c: any) => (c.mediaItemId || c.id) === id);
              const initTime = cwItem?.currentTime || 0;
              if (file) onPlay(file, full.title, undefined, initTime);
              else onOpenMedia(id);
            }}
          />
        )}

        {/* Local Library (if any items) */}
        {feed?.inLibrary && feed.inLibrary.length > 0 && (
          <MediaRow
            title={t('inLibrary')}
            items={feed.inLibrary}
            onSelect={onOpenMedia}
          />
        )}

        {/* Trending Movies */}
        {feed?.trendingMovies && feed.trendingMovies.length > 0 && (
          <MediaRow
            title={t('trendingMovies')}
            items={feed.trendingMovies}
            onSelect={onOpenMedia}
          />
        )}

        {/* Trending TV Series */}
        {feed?.trendingShows && feed.trendingShows.length > 0 && (
          <MediaRow
            title={t('trendingShows')}
            items={feed.trendingShows}
            onSelect={onOpenMedia}
          />
        )}

        {/* Top Rated (Numbered 1-20) */}
        {feed?.topRated && feed.topRated.length > 0 && (
          <MediaRow
            title={t('topRated')}
            items={feed.topRated}
            numbered
            onSelect={onOpenMedia}
          />
        )}

        {/* Action & Adventure */}
        {feed?.actionMovies && feed.actionMovies.length > 0 && (
          <MediaRow
            title={t('actionMovies')}
            items={feed.actionMovies}
            onSelect={onOpenMedia}
          />
        )}

        {/* Sci-Fi & Fantasy */}
        {feed?.scifiMovies && feed.scifiMovies.length > 0 && (
          <MediaRow
            title={t('scifiMovies')}
            items={feed.scifiMovies}
            onSelect={onOpenMedia}
          />
        )}

        {/* Comedy Hits */}
        {feed?.comedyMovies && feed.comedyMovies.length > 0 && (
          <MediaRow
            title={t('comedyMovies')}
            items={feed.comedyMovies}
            onSelect={onOpenMedia}
          />
        )}

        {/* Animation & Family */}
        {feed?.animationMovies && feed.animationMovies.length > 0 && (
          <MediaRow
            title={t('animationMovies')}
            items={feed.animationMovies}
            onSelect={onOpenMedia}
          />
        )}

        {/* Thriller & Horror */}
        {feed?.thrillerMovies && feed.thrillerMovies.length > 0 && (
          <MediaRow
            title={t('thrillerMovies')}
            items={feed.thrillerMovies}
            onSelect={onOpenMedia}
          />
        )}

        {/* Popular Shows */}
        {feed?.popularShows && feed.popularShows.length > 0 && (
          <MediaRow
            title={t('popularShows')}
            items={feed.popularShows}
            onSelect={onOpenMedia}
          />
        )}

        {/* My List */}
        {feed?.watchlist && feed.watchlist.length > 0 && (
          <MediaRow
            title={t('myList')}
            items={feed.watchlist}
            onSelect={onOpenMedia}
          />
        )}
      </div>

      {/* Hero Direct Stream Modal */}
      {showHeroStream && hero && (
        <OnlineStreamModal
          title={language === 'he' && hero.titleHe ? hero.titleHe : (hero.title || hero.originalTitle || 'Movie')}
          tmdbId={hero.tmdbId}
          imdbId={hero.imdbId}
          type={hero.type}
          onClose={() => setShowHeroStream(false)}
        />
      )}
    </div>
  );
}

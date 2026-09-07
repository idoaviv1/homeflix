import React, { useState, useEffect } from 'react';
import { Play, Info, Plus, Check, FolderSync, Film, Sparkles } from 'lucide-react';
import { MediaRow } from '../components/MediaRow';
import { api, type HomeFeed, type MediaItem, type MediaFile } from '../lib/api';

export interface HomePageProps {
  onOpenMedia: (id: string) => void;
  onPlay: (file: MediaFile, title: string, subtitle?: string) => void;
}

export function HomePage({ onOpenMedia, onPlay }: HomePageProps) {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

  const loadFeed = async () => {
    try {
      const data = await api.getHomeFeed();
      setFeed(data);
    } catch (err) {
      console.error('Failed to load feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

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
        onOpenMedia(hero.id);
      }
    } catch {
      onOpenMedia(hero.id);
    }
  };

  const handleHeroWatchlist = async () => {
    if (!hero) return;
    try {
      const res = await api.toggleWatchlist(hero.id);
      setInWatchlist(res.inWatchlist);
    } catch {
      // Ignore
    }
  };

  const isLibraryEmpty =
    !hero &&
    (!feed?.recentlyAddedMovies || feed.recentlyAddedMovies.length === 0) &&
    (!feed?.recentlyAddedShows || feed.recentlyAddedShows.length === 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0F0F0F] text-white">
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
                O M F L I X
              </span>
              {hero?.rating && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  {(hero.rating * 10).toFixed(0)}% Match
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
              {hero ? hero.title : 'Welcome to Omflix'}
            </h1>

            {hero?.tagline && (
              <p className="text-sm md:text-base italic text-neutral-300 drop-shadow">
                "{hero.tagline}"
              </p>
            )}

            <p className="text-sm md:text-base text-neutral-300 leading-relaxed max-w-lg line-clamp-3 drop-shadow">
              {hero
                ? hero.overview
                : 'Your private, high-performance home cinema. Add media files to your library for instant direct play and NVIDIA NVENC hardware transcoding.'}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {hero ? (
                <>
                  <button
                    onClick={handleHeroPlay}
                    className="flex items-center gap-2 rounded-lg bg-white px-7 py-3 text-sm font-bold text-black transition-all hover:bg-neutral-200 active:scale-95 shadow-xl cursor-pointer"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Play
                  </button>
                  <button
                    onClick={() => onOpenMedia(hero.id)}
                    className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/30 active:scale-95 border border-white/10 cursor-pointer"
                  >
                    <Info className="h-5 w-5" />
                    More Info
                  </button>
                  <button
                    onClick={handleHeroWatchlist}
                    className="flex items-center justify-center rounded-full h-11 w-11 border border-white/20 bg-black/40 text-neutral-300 hover:border-white hover:text-white transition-all backdrop-blur-md"
                    title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  >
                    {inWatchlist ? <Check className="h-5 w-5 text-emerald-400" /> : <Plus className="h-5 w-5" />}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="flex items-center gap-2 rounded-lg bg-[#E50914] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#b80710] shadow-lg shadow-[#E50914]/30"
                >
                  <FolderSync className={`h-5 w-5 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Scan Media Library'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Empty Library Setup Card (If no media yet) ─── */}
      {isLibraryEmpty && (
        <div className="relative z-10 -mt-20 max-w-4xl mx-auto px-4 pb-16">
          <div className="p-8 rounded-2xl bg-neutral-900/90 border border-white/10 backdrop-blur-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Film className="w-8 h-8 text-[#E50914]" />
              <div>
                <h3 className="text-xl font-bold text-white">Your Media Library Is Ready</h3>
                <p className="text-xs text-neutral-400">
                  Omflix looks for videos in <code className="text-neutral-200 bg-white/10 px-1.5 py-0.5 rounded">/media/windows/omflix/media/</code>
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-300">
              Drop any MKV, MP4, or WebM movie or TV show file into your folders. Omflix will automatically inspect codecs with FFprobe, match metadata, and prepare Direct Play or NVENC transcoding!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-white/5">
                <span className="text-xs font-bold text-[#E50914] uppercase">Movies Folder</span>
                <p className="text-xs font-mono text-neutral-400 mt-1">/media/windows/omflix/media/movies/</p>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-white/5">
                <span className="text-xs font-bold text-[#E50914] uppercase">TV Shows Folder</span>
                <p className="text-xs font-mono text-neutral-400 mt-1">/media/windows/omflix/media/tv/</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#E50914] text-sm font-bold text-white hover:bg-[#b80710] transition-colors"
              >
                <FolderSync className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning Disk...' : 'Trigger Scan Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Content Rows ─── */}
      <div className="relative z-10 -mt-20 md:-mt-28 space-y-6 pb-20">
        {/* Continue Watching */}
        {feed?.continueWatching && feed.continueWatching.length > 0 && (
          <MediaRow
            title="Continue Watching"
            items={feed.continueWatching}
            isContinueWatching
            onSelect={onOpenMedia}
            onPlay={async (id) => {
              const full = await api.getMedia(id);
              const file = full.files?.[0];
              if (file) onPlay(file, full.title);
            }}
          />
        )}

        {/* Recently Added Movies */}
        {feed?.recentlyAddedMovies && feed.recentlyAddedMovies.length > 0 && (
          <MediaRow
            title="Recently Added Movies"
            items={feed.recentlyAddedMovies}
            onSelect={onOpenMedia}
          />
        )}

        {/* Recently Added TV Shows */}
        {feed?.recentlyAddedShows && feed.recentlyAddedShows.length > 0 && (
          <MediaRow
            title="Trending TV Series"
            items={feed.recentlyAddedShows}
            onSelect={onOpenMedia}
          />
        )}

        {/* Top Rated */}
        {feed?.topRated && feed.topRated.length > 0 && (
          <MediaRow
            title="Top Rated on Omflix"
            items={feed.topRated}
            numbered
            onSelect={onOpenMedia}
          />
        )}

        {/* My List */}
        {feed?.watchlist && feed.watchlist.length > 0 && (
          <MediaRow
            title="My List"
            items={feed.watchlist}
            onSelect={onOpenMedia}
          />
        )}
      </div>
    </div>
  );
}

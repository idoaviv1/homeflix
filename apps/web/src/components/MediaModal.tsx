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
} from 'lucide-react';
import { api, type MediaItem, type Season, type Episode, type MediaFile } from '../lib/api';

export interface MediaModalProps {
  mediaId: string;
  onClose: () => void;
  onPlay: (file: MediaFile, title: string, subtitle?: string, nextEpisode?: any) => void;
}

export function MediaModal({ mediaId, onClose, onPlay }: MediaModalProps) {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

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
    try {
      const res = await api.toggleWatchlist(mediaId);
      setInWatchlist(res.inWatchlist);
    } catch {
      // Prompt login if anonymous
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await api.toggleFavorite(mediaId);
      setIsFavorite(res.isFavorite);
    } catch {
      // Prompt login if anonymous
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl my-auto text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ─── Hero Backdrop Banner ─── */}
        <div className="relative h-72 md:h-96 w-full overflow-hidden">
          {showTrailer && media.trailerKey ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${media.trailerKey}?autoplay=1&controls=1`}
              title="Trailer"
              allow="autoplay; encrypted-media"
              className="w-full h-full border-0"
            />
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
              <div className="absolute bottom-6 left-6 right-6 flex flex-col justify-end">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
                  {media.title}
                </h1>
                {media.titleHe && (
                  <h2 className="text-lg md:text-xl text-neutral-300 font-medium drop-shadow" dir="rtl">
                    {media.titleHe}
                  </h2>
                )}
                {media.tagline && (
                  <p className="text-sm italic text-neutral-300 mt-1 drop-shadow">{media.tagline}</p>
                )}

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {primaryFile && (
                    <button
                      onClick={() => onPlay(primaryFile, media.title)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors shadow-lg active:scale-95"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Play
                    </button>
                  )}

                  {media.trailerKey && !showTrailer && (
                    <button
                      onClick={() => setShowTrailer(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm transition-colors border border-white/10"
                    >
                      <Film className="w-4 h-4" />
                      Trailer
                    </button>
                  )}

                  <button
                    onClick={handleToggleWatchlist}
                    className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                    title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
                  >
                    {inWatchlist ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                    title={isFavorite ? 'Favorited' : 'Add to Favorites'}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─── Details Section ─── */}
        <div className="p-6 space-y-6">
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
            <p className="text-sm md:text-base text-neutral-300 leading-relaxed">
              {media.overview || 'No synopsis available.'}
            </p>
            {media.overviewHe && (
              <p className="text-sm text-neutral-400 leading-relaxed pt-2 border-t border-white/5" dir="rtl">
                {media.overviewHe}
              </p>
            )}
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
                  Episodes
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
                        {s.name || `Season ${s.seasonNumber}`}
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
                          className="p-3 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors shadow-md flex-shrink-0"
                          title="Play Episode"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cast Cards */}
          {media.cast && media.cast.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Cast</h3>
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
    </div>
  );
}

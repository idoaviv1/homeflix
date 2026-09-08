import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, Info } from 'lucide-react';
import type { MediaItem } from '../lib/api';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface MediaRowProps {
  title: string;
  items: MediaItem[];
  numbered?: boolean;
  onSelect: (id: string) => void;
  onPlay?: (id: string) => void;
  isContinueWatching?: boolean;
}

export function MediaRow({
  title,
  items,
  numbered,
  onSelect,
  onPlay,
  isContinueWatching,
}: MediaRowProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    // Fallback visible after 300ms in case intersection doesn't fire
    const fallback = setTimeout(() => setIsVisible(true), 300);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  if (!items || items.length === 0) return null;

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
    setTimeout(updateScrollButtons, 350);
  };

  return (
    <section ref={sectionRef} className={`relative px-4 md:px-12 my-6 row-scroll-reveal ${isVisible ? 'is-visible' : ''}`}>
      <h2 className="text-lg md:text-xl font-extrabold text-white mb-3 md:mb-4 tracking-tight drop-shadow">
        {title}
      </h2>

      <div className="group relative">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-black/90 via-black/50 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-8 w-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
          </button>
        )}

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-black/90 via-black/50 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-8 w-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-2.5 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        >
          {items.map((item, index) => (
            <MediaCard
              key={item.id}
              item={item}
              index={numbered ? index + 1 : undefined}
              onSelect={onSelect}
              onPlay={onPlay}
              isContinueWatching={isContinueWatching}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaCard({
  item,
  index,
  onSelect,
  onPlay,
  isContinueWatching,
}: {
  item: any;
  index?: number;
  onSelect: (id: string) => void;
  onPlay?: (id: string) => void;
  isContinueWatching?: boolean;
}) {
  const { language, t } = useThemeLanguage();
  const [isHovered, setIsHovered] = useState(false);

  // If continue watching item, image may be stillPath or backdropPath
  const imageSrc =
    item.stillPath ||
    item.backdropPath ||
    item.posterPath ||
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';

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

  const titleDir = isHebrew ? (item.titleHe ? 'rtl' : 'ltr') : 'ltr';
  const subtitleDir = isHebrew ? 'ltr' : 'rtl';

  return (
    <div
      className={`relative shrink-0 ${
        isContinueWatching ? 'w-[200px] md:w-[280px]' : 'w-[130px] md:w-[185px]'
      } group/card`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Number badge for Top 10 */}
      {index !== undefined && (
        <div className="absolute -left-3 bottom-0 z-10 text-[70px] md:text-[95px] font-black leading-none text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.4)] select-none pointer-events-none">
          {index}
        </div>
      )}

      {/* Poster / Thumbnail Card */}
      <div
        onClick={() => onSelect(item.mediaItemId || item.id)}
        className={`relative ${
          isContinueWatching ? 'aspect-video' : 'aspect-[2/3]'
        } rounded-xl overflow-hidden bg-neutral-900 cursor-pointer border border-white/5 transition-all duration-300 hover:scale-[1.06] hover:z-20 shadow-lg hover:shadow-[0_15px_35px_rgba(229,9,20,0.35)] card-sheen`}
      >
        <img
          src={imageSrc}
          alt={displayTitle}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover/card:scale-105"
          loading="lazy"
        />

        {/* Continue Watching Minute Badge */}
        {isContinueWatching && item.currentTime !== undefined && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow">
              {t('stoppedAtMinute')} {Math.floor(item.currentTime / 60)} {t('minutesShort')}
            </span>
          </div>
        )}

        {/* Continue Watching Progress Bar */}
        {isContinueWatching && item.percentage !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-[#E50914]"
              style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
            />
          </div>
        )}

        {/* Hover Overlay with details & play */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-3 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h3
            className="text-xs md:text-sm font-bold text-white line-clamp-1 drop-shadow"
            dir={titleDir}
          >
            {displayTitle}
          </h3>
          {displaySubtitle && (
            <p className="text-[10px] text-neutral-300 line-clamp-1 drop-shadow-sm font-medium mt-0.5" dir={subtitleDir}>
              {displaySubtitle}
            </p>
          )}

          {item.episode && (
            <p className="text-[11px] text-neutral-300 line-clamp-1 mt-0.5">
              S{item.episode.seasonNumber}:E{item.episode.episodeNumber} {item.episode.title}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onPlay) {
                  onPlay(item.mediaItemId || item.id);
                } else {
                  onSelect(item.mediaItemId || item.id);
                }
              }}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-black hover:bg-neutral-200 transition-all shadow-md cursor-pointer btn-interactive active:scale-90"
              title={t('playLocal')}
            >
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.mediaItemId || item.id);
              }}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all backdrop-blur-sm cursor-pointer btn-interactive active:scale-90"
              title={t('moreInfo')}
            >
              <Info className="h-4 w-4" />
            </button>

            {item.rating && (
              <span className="text-[11px] font-bold text-emerald-400 ml-auto">
                {(item.rating * 10).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, ThumbsUp } from 'lucide-react';

interface MediaCardData {
  id: string;
  title: string;
  year: number;
  posterColor: string;
  rating: number;
  genres: string[];
  runtime: string;
}

interface MediaRowProps {
  title: string;
  items: MediaCardData[];
  numbered?: boolean;
}

export function MediaRow({ title, items, numbered }: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
    <section className="relative px-4 md:px-12">
      <h2 className="text-lg md:text-xl font-bold text-omflix-white mb-3 md:mb-4">
        {title}
      </h2>

      <div className="group relative">
        {/* Scroll buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-omflix-black/80 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-omflix-black/80 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>
        )}

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {items.map((item, index) => (
            <MediaCard key={item.id} item={item} index={numbered ? index + 1 : undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaCard({ item, index }: { item: MediaCardData; index?: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative shrink-0 w-[130px] md:w-[185px] group/card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Number badge for Top 10 */}
      {index !== undefined && (
        <div className="absolute -left-3 bottom-0 z-10 text-[80px] md:text-[100px] font-black leading-none text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.3)] select-none pointer-events-none">
          {index}
        </div>
      )}

      {/* Poster */}
      <div
        className="relative aspect-[2/3] rounded-lg overflow-hidden card-hover cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${item.posterColor}33, ${item.posterColor}11)`,
        }}
      >
        {/* Placeholder poster art */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          <div
            className="w-12 h-12 md:w-16 md:h-16 rounded-full mb-2 opacity-30"
            style={{ backgroundColor: item.posterColor }}
          />
          <span className="text-xs md:text-sm font-bold text-omflix-white/60 line-clamp-2">
            {item.title}
          </span>
          <span className="text-[10px] text-omflix-muted mt-1">{item.year}</span>
        </div>

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5 mb-2">
            <button className="flex items-center justify-center h-8 w-8 rounded-full bg-omflix-white text-omflix-black hover:scale-110 transition-transform" aria-label="Play">
              <Play className="h-4 w-4 fill-current" />
            </button>
            <button className="flex items-center justify-center h-8 w-8 rounded-full border border-omflix-border/60 text-omflix-muted hover:border-omflix-white hover:text-white transition-colors" aria-label="Add to My List">
              <Plus className="h-4 w-4" />
            </button>
            <button className="flex items-center justify-center h-8 w-8 rounded-full border border-omflix-border/60 text-omflix-muted hover:border-omflix-white hover:text-white transition-colors" aria-label="Like">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-omflix-muted flex items-center gap-1.5 flex-wrap">
            <span className="text-omflix-success font-semibold">{item.rating * 10}% Match</span>
            <span>{item.runtime}</span>
          </div>
          <div className="text-[10px] text-omflix-muted mt-0.5 line-clamp-1">
            {item.genres.join(' • ')}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Play, Info, Plus } from 'lucide-react';
import { MediaRow } from '../components/MediaRow.js';
import { PLACEHOLDER_MOVIES } from '../lib/placeholders.js';

export function HomePage() {
  return (
    <div className="relative">
      {/* ─── Hero Section ─── */}
      <section className="relative h-[85vh] md:h-[90vh] flex items-end">
        {/* Background gradient placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-omflix-red-dark/30 via-omflix-black to-omflix-black" />

        {/* Cinematic vignette overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-omflix-black via-omflix-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-omflix-black/80 via-transparent to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 md:px-12 pb-16 md:pb-24">
          {/* Logo/Title area */}
          <div className="max-w-xl">
            <span className="inline-block text-xs font-bold tracking-widest text-omflix-red uppercase mb-3">
              O M F L I X
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-omflix-white leading-tight mb-4">
              Your Cinema,<br />
              <span className="text-gradient">Your Rules.</span>
            </h1>
            <p className="text-sm md:text-base text-omflix-muted leading-relaxed mb-6 max-w-md">
              Welcome to Omflix — your private, premium home streaming experience. 
              Add your media library and enjoy cinema-quality streaming on any device.
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-md bg-omflix-white px-6 py-2.5 text-sm font-bold text-omflix-black transition-all duration-200 hover:bg-white/90 hover:scale-105 active:scale-95">
                <Play className="h-5 w-5 fill-current" />
                Play
              </button>
              <button className="flex items-center gap-2 rounded-md bg-white/10 px-6 py-2.5 text-sm font-semibold text-omflix-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95">
                <Info className="h-5 w-5" />
                More Info
              </button>
              <button className="hidden md:flex items-center justify-center rounded-full h-10 w-10 border border-omflix-border/50 text-omflix-muted transition-all duration-200 hover:border-omflix-white hover:text-omflix-white hover:scale-110 active:scale-95" aria-label="Add to My List">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Content Rows ─── */}
      <div className="relative z-10 -mt-32 md:-mt-40 space-y-8 md:space-y-12 pb-12">
        <MediaRow title="Trending Now" items={PLACEHOLDER_MOVIES.slice(0, 8)} />
        <MediaRow title="Recently Added" items={PLACEHOLDER_MOVIES.slice(4, 12)} />
        <MediaRow title="Popular on Omflix" items={PLACEHOLDER_MOVIES.slice(2, 10)} />
        <MediaRow title="Top 10 Movies" items={PLACEHOLDER_MOVIES.slice(6, 14)} numbered />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Search, X, Play, Plus, Film, Sparkles, Check } from 'lucide-react';
import { api, type MediaItem } from '../lib/api';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (id: string) => void;
}

export function SearchOverlay({ isOpen, onClose, onSelectMedia }: SearchOverlayProps) {
  const { language, t, isRtl } = useThemeLanguage();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inLibrary' | 'discover'>('inLibrary');
  const [inLibrary, setInLibrary] = useState<MediaItem[]>([]);
  const [discover, setDiscover] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setInLibrary([]);
      setDiscover([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      api
        .search(query)
        .then((res) => {
          setInLibrary(res.inLibrary || []);
          setDiscover(res.discover || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const currentItems = activeTab === 'inLibrary' ? inLibrary : discover;
  const isHebrew = language === 'he';

  return (
    <div className="fixed inset-0 z-50 bg-black/95 animate-modal-backdrop flex flex-col p-4 md:p-8 overflow-y-auto select-none">
      {/* Search Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-white/10 animate-modal-sheet">
        <div className="relative flex-1 mr-4">
          <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-400`} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            dir={isRtl ? 'rtl' : 'ltr'}
            className={`w-full ${isRtl ? 'pr-14 pl-10' : 'pl-14 pr-10'} py-3.5 bg-neutral-900 border border-white/20 rounded-xl text-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914] shadow-inner`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-white cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 hover:rotate-90 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-4xl mx-auto flex items-center gap-4 my-6">
        <button
          onClick={() => setActiveTab('inLibrary')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-colors cursor-pointer ${
            activeTab === 'inLibrary'
              ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30'
              : 'bg-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          {t('inMyLibrary')} ({inLibrary.length})
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-colors cursor-pointer ${
            activeTab === 'discover'
              ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30'
              : 'bg-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          {t('discover')} ({discover.length})
        </button>
      </div>

      {/* Results Grid */}
      <div className="w-full max-w-4xl mx-auto flex-1">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#E50914]" />
          </div>
        )}

        {!loading && query && currentItems.length === 0 && (
          <div className="text-center py-20 text-neutral-500 space-y-2">
            <Film className="w-12 h-12 mx-auto text-neutral-600 mb-2" />
            <p className="text-lg font-semibold">{t('noResultsFor')} "{query}"</p>
            <p className="text-sm">{t('searchHint')}</p>
          </div>
        )}

        {!loading && currentItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
            {currentItems.map((item) => {
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
                  key={item.id}
                  onClick={() => {
                    onSelectMedia(item.id);
                    onClose();
                  }}
                  className="group relative bg-neutral-900 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.05] transition-all duration-300 shadow-lg hover:shadow-[0_12px_32px_rgba(229,9,20,0.35)] card-sheen"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden bg-neutral-950">
                    <img
                      src={item.posterPath || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800'}
                      alt={displayTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <h4
                        className="text-sm font-bold text-white leading-snug drop-shadow"
                        dir={titleDir}
                      >
                        {displayTitle}
                      </h4>
                      {displaySubtitle && (
                        <span className="text-[11px] text-neutral-300 block mt-0.5 drop-shadow-sm font-medium" dir={subtitleDir}>
                          {displaySubtitle}
                        </span>
                      )}
                      {item.year && <span className="text-xs text-neutral-400 mt-0.5">{item.year}</span>}

                      {item.inLibrary ? (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <Play className="w-3.5 h-3.5 fill-current" /> {t('inLibrary')}
                        </span>
                      ) : (
                        <span className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                          {t('notInLibrary')}
                        </span>
                      )}
                    </div>
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

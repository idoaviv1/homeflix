import React, { useState, useEffect } from 'react';
import { Search, X, Play, Plus, Film, Sparkles, Check } from 'lucide-react';
import { api, type MediaItem } from '../lib/api';

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (id: string) => void;
}

export function SearchOverlay({ isOpen, onClose, onSelectMedia }: SearchOverlayProps) {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col p-4 md:p-8 animate-in fade-in overflow-y-auto">
      {/* Search Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-white/10">
        <div className="relative flex-1 mr-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows, Hebrew or English titles..."
            className="w-full pl-14 pr-10 py-3.5 bg-neutral-900 border border-white/20 rounded-xl text-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914] shadow-inner"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-4xl mx-auto flex items-center gap-4 my-6">
        <button
          onClick={() => setActiveTab('inLibrary')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
            activeTab === 'inLibrary'
              ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30'
              : 'bg-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          In My Library ({inLibrary.length})
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
            activeTab === 'discover'
              ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30'
              : 'bg-white/10 text-neutral-400 hover:text-white'
          }`}
        >
          Discover ({discover.length})
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
            <p className="text-lg font-semibold">No results found for "{query}"</p>
            <p className="text-sm">Try searching by original title, alternative spelling, or year.</p>
          </div>
        )}

        {!loading && currentItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
            {currentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectMedia(item.id);
                  onClose();
                }}
                className="group relative bg-neutral-900 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-all duration-300 shadow-lg hover:shadow-2xl"
              >
                <div className="aspect-[2/3] w-full overflow-hidden bg-neutral-950">
                  <img
                    src={item.posterPath || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <h4 className="text-sm font-bold text-white leading-snug">{item.title}</h4>
                    {item.year && <span className="text-xs text-neutral-400 mt-0.5">{item.year}</span>}

                    {item.inLibrary ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <Play className="w-3.5 h-3.5 fill-current" /> In Library
                      </span>
                    ) : (
                      <span className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        Not in Library
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  createRootRouteWithContext,
  createRoute,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { MobileNav } from '../components/MobileNav';
import { HomePage } from '../pages/HomePage';
import { AdminPage } from '../pages/AdminPage';
import { MediaModal } from '../components/MediaModal';
import { VideoPlayer } from '../components/VideoPlayer';
import { SearchOverlay } from '../components/SearchOverlay';
import { AuthModal } from '../components/AuthModal';
import { api, type User, type MediaFile, type MediaItem } from '../lib/api';

export interface RouterContext {
  queryClient: QueryClient;
}

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [activeNav, setActiveNav] = useState('home');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Player state
  const [playerData, setPlayerData] = useState<{
    mediaItemId: string;
    episodeId?: string;
    file: MediaFile;
    title: string;
    subtitle?: string;
    nextEpisode?: any;
  } | null>(null);

  // Category browse items (movies / shows / watchlist)
  const [browseItems, setBrowseItems] = useState<MediaItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        if (!res.anonymous && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch category when nav changes
  useEffect(() => {
    if (activeNav === 'movies') {
      setBrowseLoading(true);
      api.listMedia({ type: 'movie' }).then((res) => {
        setBrowseItems(res.items);
        setBrowseLoading(false);
      });
    } else if (activeNav === 'shows') {
      setBrowseLoading(true);
      api.listMedia({ type: 'show' }).then((res) => {
        setBrowseItems(res.items);
        setBrowseLoading(false);
      });
    } else if (activeNav === 'watchlist') {
      setBrowseLoading(true);
      api.getHomeFeed().then((feed) => {
        setBrowseItems(feed.watchlist || []);
        setBrowseLoading(false);
      });
    }
  }, [activeNav]);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch {
      // Ignore
    }
  };

  const handlePlay = (
    file: MediaFile,
    title: string,
    subtitle?: string,
    nextEpisode?: any,
  ) => {
    setPlayerData({
      mediaItemId: file.mediaItemId,
      episodeId: file.episodeId,
      file,
      title,
      subtitle,
      nextEpisode,
    });
    setSelectedMediaId(null);
  };

  return (
    <div className="min-h-dvh bg-[#0F0F0F] text-white">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeNav={activeNav}
        onNavigate={(page) => setActiveNav(page)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="pb-20 md:pb-0">
        {activeNav === 'home' && (
          <HomePage
            onOpenMedia={(id) => setSelectedMediaId(id)}
            onPlay={(file, title, subtitle) => handlePlay(file, title, subtitle)}
          />
        )}

        {activeNav === 'admin' && <AdminPage />}

        {(activeNav === 'movies' || activeNav === 'shows' || activeNav === 'watchlist') && (
          <div className="max-w-7xl mx-auto px-4 md:px-10 pt-28 pb-16">
            <h1 className="text-3xl font-black mb-6 capitalize">
              {activeNav === 'shows' ? 'TV Shows' : activeNav === 'watchlist' ? 'My List' : 'Movies'}
            </h1>

            {browseLoading ? (
              <div className="py-20 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#E50914]" />
              </div>
            ) : browseItems.length === 0 ? (
              <div className="text-center py-20 text-neutral-500">
                <p className="text-lg font-semibold">No items found in this section yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {browseItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMediaId(item.id)}
                    className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/5 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    <img
                      src={item.posterPath || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                      {item.year && <span className="text-xs text-neutral-400">{item.year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* ─── Overlays & Modals ─── */}
      {selectedMediaId && (
        <MediaModal
          mediaId={selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
          onPlay={(file, title, subtitle, nextEp) => handlePlay(file, title, subtitle, nextEp)}
        />
      )}

      {playerData && (
        <VideoPlayer
          mediaItemId={playerData.mediaItemId}
          episodeId={playerData.episodeId}
          title={playerData.title}
          subtitle={playerData.subtitle}
          file={playerData.file}
          onClose={() => setPlayerData(null)}
          nextEpisode={playerData.nextEpisode}
          onPlayNext={() => {
            if (playerData.nextEpisode) {
              handlePlay(
                playerData.nextEpisode.file,
                playerData.title,
                playerData.nextEpisode.title,
              );
            }
          }}
        />
      )}

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectMedia={(id) => setSelectedMediaId(id)}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(newUser) => setUser(newUser)}
      />
    </div>
  );
}

// Root layout
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: MainApp,
});

// Home route
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => null,
});

// Route tree
export const routeTree = rootRoute.addChildren([homeRoute]);
